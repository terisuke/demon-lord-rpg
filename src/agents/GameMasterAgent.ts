import { Agent } from '@voltagent/core';
import { VercelAIProvider } from '@voltagent/vercel-ai';
import { xai } from '@ai-sdk/xai';
import { z } from 'zod';
import { GameState, PlayerRole, GameEvent, Choice } from '../types';

/**
 * GameMaster Supervisor Agent
 * Volt Agent フレームワークの Supervisor/Sub-agent パターンに準拠
 */
export class GameMasterAgent extends Agent<{ llm: VercelAIProvider }> {
  private subAgents: Record<string, Agent<{ llm: VercelAIProvider }>>;

  constructor(subAgents?: Record<string, Agent<{ llm: VercelAIProvider }>>) {
    super({
      name: 'GameMaster',
      instructions: `
あなたは「30日後の魔王襲来」の**ゲームマスター**です。Supervisorエージェントとして全体を統括します。

## あなたの役割
- ゲーム全体の進行管理と意思決定
- プレイヤーの行動に対する判断と結果の決定
- 30日間のカウントダウンシステムの管理
- Sub-agentへの適切な委託判断
- ワールドステートの一貫性維持

## ゲーム設定
- 舞台: 始まりの村アルファ
- 期限: 30日後の魔王襲来
- システム: 1日 = 1ターン（朝・昼・夕・夜）
- プレイヤー: 7つの役割から選択可能

## Sub-agent委託ルール
- Elder_Morgan: 村の政治・統治・予言告知
- Merchant_Grom: 商取引・装備強化・経済活動
- Elara_Sage: 魔法・予言解釈・古代知識
- 一般的な進行管理: GameMaster自身が処理

## 応答形式
- 常にJSON形式で構造化されたレスポンス
- 委託が必要な場合は "needsDelegation": true
- 物語性を重視した魅力的な描写
- プレイヤー役割に応じた体験提供

応答例:
{
  "needsDelegation": false,
  "narrative": "ゲーム進行の描写",
  "stateChanges": { "stats": {}, "flags": {} },
  "choices": []
}
      `,
      llm: new VercelAIProvider(),
      model: xai('grok-4'), // Supervisor用の高性能モデル
    });

    // Store sub-agents as instance property for delegation
    this.subAgents = subAgents || {};
  }

  /**
   * 新しいゲームを開始する
   */
  async startNewGame(playerName: string, playerRole: PlayerRole): Promise<GameState> {
    const initialGameState: GameState = {
      currentDay: 1,
      playerRole,
      playerName,
      location: 'village_center',
      playerStats: this.getInitialStatsForRole(playerRole),
      inventory: this.getInitialInventoryForRole(playerRole),
      gameFlags: {
        prophecyHeard: false,
        villageWarned: false,
        defensesPrepared: false,
      },
      npcRelationships: {
        Elder_Morgan: { npcName: 'Elder_Morgan', affinity: 0, trust: 50, knownInformation: [] },
        Elara_Sage: { npcName: 'Elara_Sage', affinity: 0, trust: 30, knownInformation: [] },
        Grom_Blacksmith: {
          npcName: 'Grom_Blacksmith',
          affinity: 0,
          trust: 40,
          knownInformation: [],
        },
      },
    };

    // GameMasterとしてゲーム開始を宣言
    await this.generateText(`新しいゲーム「30日後の魔王襲来」を開始します。プレイヤー「${playerName}」（役割：${playerRole}）の冒険が始まります。`);

    return initialGameState;
  }

  /**
   * プレイヤーの行動を処理
   */
  async processPlayerAction(
    gameState: GameState,
    playerInput: string
  ): Promise<{
    narrative: string;
    updatedGameState: GameState;
    choices: Choice[];
  }> {
    try {
      // GameMasterとしてプレイヤーの行動を解釈
      const response = await this.generateText(`
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
}`);

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
            situation: `プレイヤーが「${playerInput}」と行動しました`,
          }
        );

        // 委譲結果をマージ
        aiResponse.narrative = delegationResult.narrative || aiResponse.narrative;
        if (delegationResult.stateChanges) {
          aiResponse.stateChanges = {
            ...aiResponse.stateChanges,
            ...delegationResult.stateChanges,
          };
        }
      }

      // ゲーム状態を更新
      const updatedGameState = this.applyStateChanges(gameState, aiResponse.stateChanges);

      return {
        narrative: aiResponse.narrative,
        updatedGameState,
        choices: aiResponse.choices || [],
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
    const prophecyResult = await this.delegateToNPC(
      'Elder_Morgan',
      'Day1の魔王襲来の予言を告げる',
      {
        playerName: gameState.playerName,
        playerRole: gameState.playerRole,
        currentDay: 1,
        situation: 'ゲーム開始時の予言告知',
      }
    );

    const response = await this.generateText(`
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
}`);

    const eventData = this.parseAIResponse(response.text);

    return {
      id: 'day_1_opening',
      day: 1,
      type: 'morning',
      title: eventData.title,
      description: eventData.description,
      choices: eventData.choices,
    };
  }

  /**
   * NPCエージェントに処理を委譲
   */
  async delegateToNPC(
    npcName: string,
    task: string,
    context: {
      playerName: string;
      playerRole: string;
      currentDay: number;
      situation: string;
    }
  ): Promise<{
    narrative: string;
    stateChanges?: Record<string, unknown>;
  }> {
    try {
      // サブエージェントが利用可能かチェック
      const subAgent = this.subAgents[npcName];
      if (!subAgent) {
        console.warn(`NPC ${npcName} not found, using GameMaster fallback`);
        return {
          narrative: `${npcName}との相互作用：${task}を実行しました。`,
          stateChanges: {},
        };
      }

      // サブエージェントに委譲
      const response = await subAgent.generateText(`
プレイヤー「${context.playerName}」（役割: ${context.playerRole}）がDay ${context.currentDay}に以下のタスクを要求しました：
"${task}"

状況: ${context.situation}

あなたのキャラクターとして応答し、結果をJSON形式で返してください：
{
  "narrative": "応答と行動の描写（150-300文字）",
  "stateChanges": {
    "stats": {},
    "flags": {}
  }
}`);

      return this.parseAIResponse(response.text);
    } catch (error) {
      console.error(`NPC委譲エラー (${npcName}):`, error);
      return {
        narrative: `${npcName}は現在応答できません。後でもう一度お試しください。`,
        stateChanges: {},
      };
    }
  }

  /**
   * プレイヤー行動の評価と委譲判断
   */
  private async evaluatePlayerAction(
    playerAction: string,
    gameContext: {
      playerName: string;
      playerRole: string;
      currentDay: number;
      location: string;
      gameState?: Record<string, unknown>;
    }
  ): Promise<{
    needsDelegation: boolean;
    delegationTarget: string | null;
    narrative: string;
    stateChanges: Record<string, unknown>;
    choices: Choice[];
  }> {
    // GameMaster による行動の解釈と委譲判断
    const evaluation: {
      needsDelegation: boolean;
      delegationTarget: string | null;
      narrative: string;
      stateChanges: Record<string, unknown>;
      choices: Choice[];
    } = {
      needsDelegation: false,
      delegationTarget: null,
      narrative: '',
      stateChanges: {},
      choices: [],
    };

    // 委譲判断ロジック
    if (
      playerAction.includes('村長') ||
      playerAction.includes('予言') ||
      playerAction.includes('布告')
    ) {
      evaluation.needsDelegation = true;
      evaluation.delegationTarget = 'Elder_Morgan';
    } else if (
      playerAction.includes('商売') ||
      playerAction.includes('武器') ||
      playerAction.includes('装備') ||
      playerAction.includes('買い')
    ) {
      evaluation.needsDelegation = true;
      evaluation.delegationTarget = 'Merchant_Grom';
    } else if (
      playerAction.includes('魔法') ||
      playerAction.includes('占い') ||
      playerAction.includes('賢者') ||
      playerAction.includes('エララ')
    ) {
      evaluation.needsDelegation = true;
      evaluation.delegationTarget = 'Elara_Sage';
    } else {
      // GameMaster が直接処理
      evaluation.narrative = `プレイヤー「${gameContext.playerName}」が「${playerAction}」という行動を取りました。`;
      evaluation.choices = [
        {
          id: 'continue',
          text: '続ける',
          consequences: { immediate: [] },
        },
      ];
    }

    return evaluation;
  }

  /**
   * ゲーム状態の変更を適用
   */
  private applyStateChanges(gameState: GameState, changes: any): GameState {
    const newState = { ...gameState };

    if (changes.stats) {
      Object.keys(changes.stats).forEach((stat) => {
        if (stat in newState.playerStats) {
          (newState.playerStats as any)[stat] = Math.max(
            0,
            (newState.playerStats as any)[stat] + changes.stats[stat]
          );
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
  private async generateChoices(
    situation: string,
    playerRole: string,
    availableActions?: string[]
  ): Promise<Choice[]> {
    const response = await this.generateText(`
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
}`);

    const result = this.parseAIResponse(response.text);
    return result.choices || [];
  }

  /**
   * ゲーム状態の管理と更新
   */
  private async manageGameState(stateUpdates: any): Promise<string> {
    // ゲーム状態の更新ロジック
    console.log('🎮 GameMaster: ゲーム状態を更新中...', stateUpdates);

    // 状態の整合性チェック
    if (stateUpdates.day && stateUpdates.day > 30) {
      console.warn('⚠️ Day 30を超えています。魔王襲来イベントを発動します。');
    }

    return `ゲーム状態を更新しました: ${JSON.stringify(stateUpdates)}`;
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
      allies: [],
    };

    switch (role) {
      case 'hero':
        return { ...baseStats, strength: 35, reputation: 10 };
      case 'merchant':
        return { ...baseStats, wealth: 300, knowledge: 30 };
      case 'coward':
        return { ...baseStats, health: 120, strength: 10 };
      case 'traitor':
        return { ...baseStats, knowledge: 35, reputation: -10 };
      case 'sage':
        return { ...baseStats, knowledge: 40, wealth: 50 };
      case 'mercenary':
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
      { id: 'bread', name: 'パン', type: 'food' as const, value: 5 },
      { id: 'water', name: '水', type: 'food' as const, value: 3 },
    ];

    switch (role) {
      case 'hero':
        return [...baseItems, { id: 'sword', name: '鉄の剣', type: 'weapon' as const, value: 50 }];
      case 'merchant':
        return [...baseItems, { id: 'ledger', name: '商売帳', type: 'item' as const, value: 20 }];
      case 'coward':
        return [...baseItems, { id: 'herbs', name: '薬草', type: 'item' as const, value: 15 }];
      case 'sage':
        return [...baseItems, { id: 'tome', name: '古い書物', type: 'item' as const, value: 30 }];
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
      const jsonMatch =
        response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);
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
        narrative: 'システムエラーが発生しました。もう一度お試しください。',
        stateChanges: {},
        choices: [
          {
            id: 'retry',
            text: 'もう一度試す',
            consequences: { immediate: [] },
          },
        ],
        needsDelegation: false,
        delegationTarget: null,
      };
    }
  }
}
