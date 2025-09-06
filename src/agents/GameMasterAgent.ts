import { Agent } from '@voltagent/core';
import { VercelAIProvider } from '@voltagent/vercel-ai';
import { xai } from '@ai-sdk/xai';
import { z } from 'zod';
import { GameState, PlayerRole, GameEvent, Choice, AgentContext } from '../types';
import { GameStateSchema, GameEventSchema } from '../schemas';

export class GameMasterAgent extends Agent {
  private subAgents: Record<string, Agent> = {};
  
  constructor(subAgents?: Record<string, Agent>) {
    super({
      name: 'GameMaster',
      instructions: `
あなたは「30日後の魔王襲来」の**ゲームマスター**です。Supervisorエージェントとして全体を統括します。

## あなたの役割
- ゲーム全体の進行管理と意思決定
- プレイヤーの行動に対する判断と結果の決定
- 30日間のカウントダウンシステムの管理
- NPCエージェントへのタスク委譲
- ワールドステートの一貫性維持

## ゲーム設定
- 舞台: 始まりの村アルファ
- 期限: 30日後の魔王襲来
- システム: 1日 = 1ターン（朝・昼・夕・夜）
- プレイヤー: 7つの役割から選択可能

## 委譲判断基準
- NPC固有の知識や性格に関わることはNPCエージェントに委譲
- 村の政治的決定はElder Morganに委譲
- 商取引や経済活動はMerchant Gromに委譲
- 一般的な進行管理は自分が処理

## 応答ルール
- 常に物語性を重視した魅力的な描写を行う
- プレイヤーの役割に応じた体験を提供
- 選択肢は明確で結果が予想できるものを用意
- 30日のカウントダウンによる緊張感を演出

JSON形式でのレスポンスを心がけ、構造化されたデータを返してください。
      `,
      llm: new VercelAIProvider(),
      model: xai('grok-4'), // 複雑な推論にはgrok-4を使用
      tools: [
        {
          name: 'delegate_to_npc',
          description: 'NPCエージェントに特定のタスクを委譲する',
          parameters: z.object({
            npcName: z.string().describe('委譲先のNPC名（Elder_Morgan, Merchant_Grom等）'),
            task: z.string().describe('委譲するタスクの内容'),
            context: z.object({
              playerName: z.string(),
              playerRole: z.string(),
              currentDay: z.number(),
              situation: z.string()
            }).describe('現在のゲーム状況')
          }),
          execute: async (params) => {
            return await this.delegateToNPC(params.npcName, params.task, params.context);
          }
        },
        {
          name: 'update_game_state',
          description: 'ゲーム状態を更新する',
          parameters: z.object({
            stateChanges: z.object({
              stats: z.record(z.number()).optional(),
              flags: z.record(z.boolean()).optional(),
              location: z.string().optional(),
              day: z.number().optional()
            })
          }),
          execute: async (params) => {
            return this.updateGameState(params.stateChanges);
          }
        },
        {
          name: 'generate_choices',
          description: '状況に応じた選択肢を生成する',
          parameters: z.object({
            situation: z.string(),
            playerRole: z.string(),
            availableActions: z.array(z.string()).optional()
          }),
          execute: async (params) => {
            return this.generateChoices(params.situation, params.playerRole, params.availableActions);
          }
        }
      ]
    });
    
    if (subAgents) {
      this.subAgents = subAgents;
    }
  }

  /**
   * 新しいゲームを開始する
   */
  async startNewGame(playerName: string, playerRole: PlayerRole): Promise<GameState> {
    const initialGameState: GameState = {
      currentDay: 1,
      playerRole,
      playerName,
      location: "village_center",
      playerStats: this.getInitialStatsForRole(playerRole),
      inventory: this.getInitialInventoryForRole(playerRole),
      gameFlags: {
        prophecyHeard: false,
        villageWarned: false,
        defensesPrepared: false
      },
      npcRelationships: {
        "Elder_Morgan": { npcName: "Elder_Morgan", affinity: 0, trust: 50, knownInformation: [] },
        "Elara_Sage": { npcName: "Elara_Sage", affinity: 0, trust: 30, knownInformation: [] },
        "Grom_Blacksmith": { npcName: "Grom_Blacksmith", affinity: 0, trust: 40, knownInformation: [] }
      }
    };

    // GameMasterとしてゲーム開始を宣言
    await this.generateText([{
      role: 'user',
      content: `新しいゲーム「30日後の魔王襲来」を開始します。プレイヤー「${playerName}」（役割：${playerRole}）の冒険が始まります。`
    }]);

    return initialGameState;
  }

  /**
   * プレイヤーの行動を処理
   */
  async processPlayerAction(gameState: GameState, playerInput: string): Promise<{
    narrative: string;
    updatedGameState: GameState;
    choices: Choice[];
  }> {
    try {
      // GameMasterとしてプレイヤーの行動を解釈
      const response = await this.generateText([
        {
          role: 'user',
          content: `
プレイヤー「${gameState.playerName}」（役割: ${gameState.playerRole}）がDay ${gameState.currentDay}で以下の行動を取りました：
"${playerInput}"

現在の状況：
- 場所: ${gameState.location}
- 体力: ${gameState.playerStats.health}/100
- 評判: ${gameState.playerStats.reputation}/100
- 所持金: ${gameState.playerStats.wealth}G

この行動を解釈し、必要に応じてNPCエージェントに委譲するか、直接処理するかを決めてください。
結果を以下のJSON形式で返してください：

{
  "needsDelegation": false,
  "delegationTarget": "npc_name or null",
  "narrative": "行動の結果描写（200-400文字）",
  "stateChanges": {
    "stats": {},
    "flags": {},
    "location": null
  },
  "choices": [
    {
      "id": "choice_1", 
      "text": "選択肢の文章",
      "consequences": {
        "immediate": []
      }
    }
  ]
}
          `
        }
      ]);

      const aiResponse = this.parseAIResponse(response.text);
      
      // NPCへの委譲が必要な場合
      if (aiResponse.needsDelegation && aiResponse.delegationTarget) {
        const delegationResult = await this.delegateToNPC(
          aiResponse.delegationTarget, 
          playerInput,
          {
            playerName: gameState.playerName,
            playerRole: gameState.playerRole,
            currentDay: gameState.currentDay,
            situation: `プレイヤーが「${playerInput}」と行動しました`
          }
        );
        
        // 委譲結果をマージ
        aiResponse.narrative = delegationResult.narrative || aiResponse.narrative;
        if (delegationResult.stateChanges) {
          aiResponse.stateChanges = { ...aiResponse.stateChanges, ...delegationResult.stateChanges };
        }
      }

      // ゲーム状態を更新
      const updatedGameState = this.applyStateChanges(gameState, aiResponse.stateChanges);

      return {
        narrative: aiResponse.narrative,
        updatedGameState,
        choices: aiResponse.choices || []
      };

    } catch (error) {
      console.error('プレイヤー行動処理中にエラーが発生:', error);
      throw new Error(`行動処理に失敗しました: ${error}`);
    }
  }

  /**
   * Day 1のオープニングイベントを生成
   */
  async generateDay1Opening(gameState: GameState): Promise<GameEvent> {
    // Elder Morganに予言の告知を委譲
    const prophecyResult = await this.delegateToNPC('Elder_Morgan', 'Day1の魔王襲来の予言を告げる', {
      playerName: gameState.playerName,
      playerRole: gameState.playerRole,
      currentDay: 1,
      situation: 'ゲーム開始時の予言告知'
    });

    const response = await this.generateText([
      {
        role: 'user',
        content: `
Day 1のオープニングイベントを作成してください。
プレイヤー「${gameState.playerName}」（役割: ${gameState.playerRole}）

Elder Morganからの予言: "${prophecyResult.narrative || '魔王が30日後に襲来する'}"

この予言を受けたプレイヤーの最初の選択肢を作成してください。
役割「${gameState.playerRole}」に応じた特別な選択肢も含めてください。

JSON形式で回答：
{
  "title": "イベントタイトル",
  "description": "状況描写（300-500文字）",
  "choices": [
    {
      "id": "choice_1",
      "text": "選択肢の文章",
      "consequences": {
        "immediate": [
          {
            "type": "stat",
            "target": "reputation", 
            "change": 10
          }
        ]
      }
    }
  ]
}
        `
      }
    ]);

    const eventData = this.parseAIResponse(response.text);
    
    return {
      id: "day_1_opening",
      day: 1,
      type: "morning",
      title: eventData.title,
      description: eventData.description,
      choices: eventData.choices
    };
  }

  /**
   * NPCエージェントにタスクを委譲
   */
  private async delegateToNPC(npcName: string, task: string, context: any): Promise<any> {
    const npc = this.subAgents[npcName];
    if (!npc) {
      console.warn(`NPC ${npcName} が見つかりません。GameMasterが直接処理します。`);
      return { 
        narrative: `${npcName}との相互作用: ${task}`,
        stateChanges: {}
      };
    }

    try {
      const response = await npc.generateText([
        {
          role: 'user',
          content: `
プレイヤー「${context.playerName}」（役割: ${context.playerRole}）がDay ${context.currentDay}にあなたのところに来ました。
状況: ${context.situation}
要求: ${task}

あなたの性格と知識に基づいて応答し、以下のJSON形式で回答してください：
{
  "narrative": "NPCの発言・行動の描写（200-300文字）",
  "stateChanges": {
    "stats": {},
    "flags": {},
    "relationship": {}
  }
}
          `
        }
      ]);

      return this.parseAIResponse(response.text);
    } catch (error) {
      console.error(`NPC ${npcName} への委譲中にエラー:`, error);
      return {
        narrative: `${npcName}は忙しそうで、後で話そうと言います。`,
        stateChanges: {}
      };
    }
  }

  /**
   * ゲーム状態の変更を適用
   */
  private applyStateChanges(gameState: GameState, changes: any): GameState {
    const newState = { ...gameState };
    
    if (changes.stats) {
      Object.keys(changes.stats).forEach(stat => {
        if (stat in newState.playerStats) {
          (newState.playerStats as any)[stat] = Math.max(0, (newState.playerStats as any)[stat] + changes.stats[stat]);
        }
      });
    }
    
    if (changes.flags) {
      newState.gameFlags = { ...newState.gameFlags, ...changes.flags };
    }
    
    if (changes.location) {
      newState.location = changes.location;
    }

    if (changes.day) {
      newState.currentDay = Math.min(30, changes.day);
    }
    
    return newState;
  }

  /**
   * 選択肢を生成
   */
  private async generateChoices(situation: string, playerRole: string, availableActions?: string[]): Promise<Choice[]> {
    const response = await this.generateText([
      {
        role: 'user',
        content: `
状況: ${situation}
プレイヤー役割: ${playerRole}
利用可能な行動: ${availableActions?.join(', ') || '自由'}

この状況に適した2-4個の選択肢を生成してください。
役割に応じた特別な選択肢も含めてください。

JSON形式で回答：
{
  "choices": [
    {
      "id": "choice_1",
      "text": "選択肢の説明",
      "consequences": {
        "immediate": [
          {
            "type": "stat",
            "target": "reputation",
            "change": 5
          }
        ]
      }
    }
  ]
}
        `
      }
    ]);

    const result = this.parseAIResponse(response.text);
    return result.choices || [];
  }

  /**
   * ゲーム状態更新ツール実行
   */
  private updateGameState(changes: any): string {
    // ツールの実行結果を返す
    return `ゲーム状態を更新しました: ${JSON.stringify(changes)}`;
  }

  /**
   * 役割に応じた初期ステータス
   */
  private getInitialStatsForRole(role: PlayerRole) {
    const baseStats = {
      level: 1,
      health: 100,
      strength: 20,
      knowledge: 20,
      reputation: 0,
      wealth: 100,
      allies: []
    };

    switch (role) {
      case "hero":
        return { ...baseStats, strength: 35, reputation: 10 };
      case "merchant":
        return { ...baseStats, wealth: 300, knowledge: 30 };
      case "coward":
        return { ...baseStats, health: 120, strength: 10 };
      case "traitor":
        return { ...baseStats, knowledge: 35, reputation: -10 };
      case "sage":
        return { ...baseStats, knowledge: 40, wealth: 50 };
      case "mercenary":
        return { ...baseStats, strength: 40, wealth: 150 };
      default:
        return baseStats;
    }
  }

  /**
   * 役割に応じた初期インベントリ
   */
  private getInitialInventoryForRole(role: PlayerRole) {
    const baseItems = [
      { id: "bread", name: "パン", type: "food" as const, value: 5 },
      { id: "water", name: "水", type: "food" as const, value: 3 }
    ];

    switch (role) {
      case "hero":
        return [...baseItems, { id: "sword", name: "鉄の剣", type: "weapon" as const, value: 50 }];
      case "merchant":
        return [...baseItems, { id: "ledger", name: "商売帳", type: "item" as const, value: 20 }];
      case "coward":
        return [...baseItems, { id: "herbs", name: "薬草", type: "item" as const, value: 15 }];
      case "sage":
        return [...baseItems, { id: "tome", name: "古い書物", type: "item" as const, value: 30 }];
      default:
        return baseItems;
    }
  }

  /**
   * AIレスポンスをパース
   */
  private parseAIResponse(response: string): any {
    try {
      // JSONコードブロックから抽出
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
      
      // 直接JSONとして試行
      return JSON.parse(response);
    } catch (error) {
      console.error('AI応答のパースに失敗:', error);
      console.log('原文:', response.substring(0, 200) + '...');
      
      // フォールバックレスポンス
      return {
        narrative: "システムエラーが発生しました。もう一度お試しください。",
        stateChanges: {},
        choices: [
          {
            id: "retry",
            text: "もう一度試す",
            consequences: { immediate: [] }
          }
        ],
        needsDelegation: false,
        delegationTarget: null
      };
    }
  }
}