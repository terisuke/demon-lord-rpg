// import { MemoryManager, InMemoryStorage } from '@voltagent/core';
import { z } from 'zod';
import { GameState, PlayerRole } from '../types';

// MemoryManagerを初期化
// Note: 一旦コメントアウトして動作可能にする
// const memoryManager = new MemoryManager({ storage: new InMemoryStorage() });

// Day1ワークフローの状態スキーマ
const day1WorkflowStateSchema = z.object({
  playerName: z.string(),
  playerRole: z.enum(['hero', 'merchant', 'coward', 'traitor', 'villager', 'sage', 'mercenary']),
  gameState: z.any().optional(),
  prophecyDelivered: z.boolean().default(false),
  elderResponse: z.string().optional(),
  villageMoodUpdate: z.string().optional(),
  reputationChange: z.number().default(0),
});

type Day1WorkflowState = z.infer<typeof day1WorkflowStateSchema>;

/**
 * Day 1 ゲーム開始ワークフロー (修正版)
 * 正しいVolt Agentパターンに準拠
 */
export const createDay1Workflow = (agents: { gameMaster: any, elderMorgan: any }) => {
  return {
    name: "Day1-Start-Workflow",
    stateSchema: day1WorkflowStateSchema,
    
    async execute(initialState: Day1WorkflowState): Promise<Day1WorkflowState> {
      let state = { ...initialState };
      
      // Step 1: GameMasterによる開始宣言
      try {
        const gameMasterResponse = await agents.gameMaster.generateText([
          {
            role: 'user',
            content: `Day 1のゲームを開始します。プレイヤー「${state.playerName}」（役割: ${state.playerRole}）の冒険が始まります。村の状況を確認し、Elder Morganに予言の告知を委譲する準備をしてください。`
          }
        ]);
        
        console.log(`🎭 GameMaster: ${gameMasterResponse.text.substring(0, 100)}...`);
      } catch (error) {
        console.error('GameMaster応答エラー:', error);
      }

      // Step 2: Elder Morganによる予言告知
      try {
        const elderResponse = await agents.elderMorgan.generateText([
          {
            role: 'user', 
            content: `プレイヤー「${state.playerName}」（役割: ${state.playerRole}）に対して、30日後の魔王襲来の予言を威厳を持って告知してください。プレイヤーの役割に応じた適切な反応と、村長としての指示を含めてください。JSON形式で回答：{"prophecy": "予言の内容", "reaction": "プレイヤーの役割への反応", "moodChange": "村の雰囲気の変化"}`
          }
        ]);

        // JSONレスポンスをパース
        try {
          const elderData = JSON.parse(elderResponse.text);
          state.elderResponse = elderData.prophecy || elderResponse.text;
          state.villageMoodUpdate = elderData.moodChange || "村に緊張が走る";
          state.prophecyDelivered = true;
        } catch (parseError) {
          // JSONパースに失敗した場合はテキストをそのまま使用
          state.elderResponse = elderResponse.text;
          state.prophecyDelivered = true;
        }

        console.log(`🏛️ Elder Morgan: ${state.elderResponse?.substring(0, 100)}...`);
      } catch (error) {
        console.error('Elder Morgan応答エラー:', error);
        state.elderResponse = "モーガン村長から重要な知らせがあります。30日後、この村に魔王が襲来します。";
        state.prophecyDelivered = true;
      }

      // Step 3: プレイヤー役割に応じた評判調整
      switch (state.playerRole) {
        case 'hero':
          state.reputationChange = 10;
          break;
        case 'merchant':
          state.reputationChange = 5;
          break;
        case 'traitor':
          state.reputationChange = -5;
          break;
        case 'villager':
          state.reputationChange = 2;
          break;
        default:
          state.reputationChange = 0;
      }

      return state;
    }
  };
};

// プレイヤー行動処理ワークフローの状態スキーマ
const playerActionWorkflowStateSchema = z.object({
  playerName: z.string(),
  playerRole: z.enum(['hero', 'merchant', 'coward', 'traitor', 'villager', 'sage', 'mercenary']),
  playerAction: z.string(),
  currentDay: z.number(),
  delegationTarget: z.string().optional(),
  needsDelegation: z.boolean().default(false),
  gmResponse: z.any().optional(),
  npcResponse: z.any().optional(),
});

type PlayerActionWorkflowState = z.infer<typeof playerActionWorkflowStateSchema>;

/**
 * プレイヤー行動処理ワークフロー
 * GameMasterが行動を解釈し、必要に応じてNPCに委譲するワークフロー
 */
export const createPlayerActionWorkflow = (agents: { gameMaster: any, [key: string]: any }) => {
  return {
    name: "Player-Action-Workflow",
    stateSchema: playerActionWorkflowStateSchema,
    
    async execute(initialState: PlayerActionWorkflowState): Promise<{
      narrative: string;
      stateChanges: any;
      choices: any[];
    }> {
      let state = { ...initialState };
      
      try {
        // Step 1: GameMasterによる行動解釈
        const gmResponse = await agents.gameMaster.generateText([{
          role: 'user',
          content: `プレイヤー「${state.playerName}」が「${state.playerAction}」という行動を取りました。この行動を解釈し、適切なNPCに委譲が必要かどうか判断してください。現在はDay ${state.currentDay}です。JSON形式で回答: {"needsDelegation": boolean, "delegationTarget": "npc_name or null", "narrative": "行動結果", "stateChanges": {}, "choices": []}`
        }]);
        
        // GameMasterの応答をパース
        let gmData;
        try {
          gmData = JSON.parse(gmResponse.text);
        } catch {
          gmData = { needsDelegation: false, narrative: gmResponse.text, stateChanges: {}, choices: [] };
        }
        
        state.gmResponse = gmData;
        state.needsDelegation = gmData.needsDelegation || false;
        state.delegationTarget = gmData.delegationTarget;
        
        let finalResult = {
          narrative: gmData.narrative || 'GameMasterが行動を処理しました。',
          stateChanges: gmData.stateChanges || {},
          choices: gmData.choices || []
        };
        
        // Step 2: NPCへの委譲処理（必要な場合）
        if (state.needsDelegation && state.delegationTarget && agents[state.delegationTarget]) {
          const npcResponse = await agents[state.delegationTarget].generateText([{
            role: 'user',
            content: `プレイヤー「${state.playerName}」（役割: ${state.playerRole}）があなたのところに来て「${state.playerAction}」と言いました。あなたの性格と知識に基づいて適切に応答してください。JSON形式で回答: {"narrative": "NPCの応答", "stateChanges": {}}`
          }]);
          
          try {
            const npcData = JSON.parse(npcResponse.text);
            state.npcResponse = npcData;
            
            // NPC応答を統合
            finalResult.narrative = npcData.narrative || finalResult.narrative;
            finalResult.stateChanges = { ...finalResult.stateChanges, ...npcData.stateChanges };
          } catch {
            finalResult.narrative = npcResponse.text;
          }
        }
        
        return finalResult;
        
      } catch (error) {
        console.error('プレイヤー行動ワークフローエラー:', error);
        return {
          narrative: 'システムエラーが発生しました。',
          stateChanges: {},
          choices: []
        };
      }
    }
  };
};

// 商取引ワークフローの状態スキーマ
const tradeWorkflowStateSchema = z.object({
  playerName: z.string(),
  playerRole: z.enum(['hero', 'merchant', 'coward', 'traitor', 'villager', 'sage', 'mercenary']),
  item: z.string().optional(),
  budget: z.number().optional(),
  playerWealth: z.number().optional(),
  currentDay: z.number().optional(),
  tradeCompleted: z.boolean().default(false),
});

type TradeWorkflowState = z.infer<typeof tradeWorkflowStateSchema>;

/**
 * 商取引ワークフロー
 * プレイヤーとMerchant Gromの取引処理
 */
export const createTradeWorkflow = (agents: { gameMaster: any, merchantGrom: any }) => {
  return {
    name: "Trade-Workflow",
    stateSchema: tradeWorkflowStateSchema,
    
    async execute(initialState: TradeWorkflowState): Promise<{
      narrative: string;
      tradeOptions: any[];
      priceList: any;
      recommendations: any[];
    }> {
      let state = { ...initialState };
      
      try {
        // Step 1: GameMasterによる取引開始確認
        const gmResponse = await agents.gameMaster.generateText([{
          role: 'user',
          content: `プレイヤー「${state.playerName}」が商取引を希望しています。商品: ${state.item || '未指定'}、予算: ${state.budget || state.playerWealth}G。Merchant Gromに委譲してください。`
        }]);
        
        console.log(`🎭 GameMaster: 取引を開始します`);
        
        // Step 2: Merchant Gromによる取引処理
        const merchantResponse = await agents.merchantGrom.generateText([{
          role: 'user',
          content: `プレイヤー「${state.playerName}」（役割: ${state.playerRole}）が商取引に来ました。希望商品: ${state.item || '相談'}、予算: ${state.budget || state.playerWealth}G、現在はDay ${state.currentDay}。適切な商品を提案し、価格を提示してください。JSON形式で回答: {"narrative": "商人の対応", "tradeOptions": [], "priceList": {}, "recommendations": []}`
        }]);
        
        // 商人の応答をパース
        try {
          const merchantData = JSON.parse(merchantResponse.text);
          console.log(`🔨 Merchant Grom: ${merchantData.narrative?.substring(0, 100)}...`);
          
          return {
            narrative: merchantData.narrative || '商人グロムが商品を紹介してくれます。',
            tradeOptions: merchantData.tradeOptions || [],
            priceList: merchantData.priceList || {},
            recommendations: merchantData.recommendations || []
          };
        } catch (parseError) {
          // JSONパースに失敗した場合
          return {
            narrative: merchantResponse.text,
            tradeOptions: [],
            priceList: {},
            recommendations: []
          };
        }
        
      } catch (error) {
        console.error('商取引ワークフローエラー:', error);
        return {
          narrative: '商取引中にエラーが発生しました。',
          tradeOptions: [],
          priceList: {},
          recommendations: []
        };
      }
    }
  };
};

// 魔法相談ワークフローの状態スキーマ
const magicConsultationWorkflowStateSchema = z.object({
  playerName: z.string(),
  playerRole: z.enum(['hero', 'merchant', 'coward', 'traitor', 'villager', 'sage', 'mercenary']),
  question: z.string().optional(),
  currentDay: z.number().optional(),
  consultationCompleted: z.boolean().default(false),
});

type MagicConsultationWorkflowState = z.infer<typeof magicConsultationWorkflowStateSchema>;

/**
 * 魔法相談ワークフロー
 * プレイヤーとElara Sageの魔法的相談
 */
export const createMagicConsultationWorkflow = (agents: { gameMaster: any, elaraSage: any }) => {
  return {
    name: "Magic-Consultation-Workflow",
    stateSchema: magicConsultationWorkflowStateSchema,
    
    async execute(initialState: MagicConsultationWorkflowState): Promise<{
      narrative: string;
      prophecy: string | null;
      magicalAdvice: string | null;
      knowledgeGained: string[];
    }> {
      let state = { ...initialState };
      
      try {
        // Step 1: GameMasterによる相談開始確認
        const gmResponse = await agents.gameMaster.generateText([{
          role: 'user',
          content: `プレイヤー「${state.playerName}」が魔法や予言について相談を求めています。質問: ${state.question || '一般的な相談'}。Elara Sageに委譲してください。`
        }]);
        
        console.log(`🎭 GameMaster: 魔法相談を開始します`);
        
        // Step 2: Elara Sageによる相談対応
        const sageResponse = await agents.elaraSage.generateText([{
          role: 'user',
          content: `プレイヤー「${state.playerName}」（役割: ${state.playerRole}）が魔法的な相談に来ました。質問: ${state.question || '運命について'}、現在はDay ${state.currentDay}。あなたの知識と占術能力を使って適切な助言を提供してください。JSON形式で回答: {"narrative": "賢者の応答", "prophecy": "予言またはnull", "advice": "魔法的助言", "knowledgeGained": []}`
        }]);
        
        // 賢者の応答をパース
        try {
          const sageData = JSON.parse(sageResponse.text);
          console.log(`🔮 Elara Sage: ${sageData.narrative?.substring(0, 100)}...`);
          
          state.consultationCompleted = true;
          
          return {
            narrative: sageData.narrative || '賢者エララが古代の知識を教えてくれます。',
            prophecy: sageData.prophecy || null,
            magicalAdvice: sageData.advice || null,
            knowledgeGained: sageData.knowledgeGained || []
          };
        } catch (parseError) {
          // JSONパースに失敗した場合
          return {
            narrative: sageResponse.text,
            prophecy: null,
            magicalAdvice: null,
            knowledgeGained: []
          };
        }
        
      } catch (error) {
        console.error('魔法相談ワークフローエラー:', error);
        return {
          narrative: '魔法相談中にエラーが発生しました。',
          prophecy: null,
          magicalAdvice: null,
          knowledgeGained: []
        };
      }
    }
  };
};

// 日次進行ワークフローの状態スキーマ
const dayProgressionWorkflowStateSchema = z.object({
  playerName: z.string(),
  currentDay: z.number(),
  currentStats: z.any(),
  dailyActivities: z.array(z.string()).default([]),
  progressionCompleted: z.boolean().default(false),
});

type DayProgressionWorkflowState = z.infer<typeof dayProgressionWorkflowStateSchema>;

/**
 * 日次進行ワークフロー
 * 1日の終了時に実行される処理
 */
export const createDayProgressionWorkflow = (agents: { gameMaster: any }) => {
  return {
    name: "Day-Progression-Workflow",
    stateSchema: dayProgressionWorkflowStateSchema,
    
    async execute(initialState: DayProgressionWorkflowState): Promise<{
      newGameState: any;
      tensionLevel: number;
      daysSummary: string;
      specialEvents: any[];
      nextDayPreview: string;
    }> {
      let state = { ...initialState };
      
      try {
        // Step 1: GameMasterによる日次総括
        const gmResponse = await agents.gameMaster.generateText([{
          role: 'user',
          content: `Day ${state.currentDay}が終了します。プレイヤー「${state.playerName}」の今日の活動を総括し、翌日への影響を評価してください。現在の状況: ${JSON.stringify(state.currentStats)}。JSON形式で回答: {"summary": "日次総括", "dailyEvent": "特別な出来事", "worldChanges": {}, "specialEvents": [], "nextDayPreview": "明日の予告"}`
        }]);
        
        // GameMasterの応答をパース
        let dayResult;
        try {
          dayResult = JSON.parse(gmResponse.text);
        } catch {
          dayResult = { 
            summary: `Day ${state.currentDay}が終了しました。`,
            dailyEvent: null,
            worldChanges: {},
            specialEvents: [],
            nextDayPreview: `Day ${state.currentDay + 1}が始まります。`
          };
        }
        
        // 日次進行処理
        const newDay = Math.min(30, state.currentDay + 1);
        
        // 基本的な日次変化
        const stateChanges = {
          currentDay: newDay,
          dailyEvent: dayResult.dailyEvent || null,
          worldChanges: dayResult.worldChanges || {},
          playerStats: {
            // 基本的な日次回復
            health: Math.min(100, (state.currentStats.health || 50) + 5)
          }
        };
        
        // 魔王襲来が近づくにつれて緊張度上昇
        const tensionLevel = Math.floor((newDay / 30) * 100);
        
        state.progressionCompleted = true;
        
        console.log(`🌅 Day ${state.currentDay}終了 -> Day ${newDay}開始 (緊張度: ${tensionLevel}%)`);
        
        return {
          newGameState: stateChanges,
          tensionLevel: tensionLevel,
          daysSummary: dayResult.summary || `Day ${state.currentDay}が終了しました。`,
          specialEvents: dayResult.specialEvents || [],
          nextDayPreview: dayResult.nextDayPreview || `Day ${newDay}が始まります。`
        };
        
      } catch (error) {
        console.error('日次進行ワークフローエラー:', error);
        return {
          newGameState: { currentDay: Math.min(30, state.currentDay + 1) },
          tensionLevel: Math.floor(((state.currentDay + 1) / 30) * 100),
          daysSummary: `Day ${state.currentDay}が終了しました。`,
          specialEvents: [],
          nextDayPreview: `Day ${state.currentDay + 1}が始まります。`
        };
      }
    }
  };
};

/**
 * ワークフローの実行ヘルパー関数
 */
export class GameWorkflowManager {
  private agents: {
    gameMaster: any;
    elderMorgan: any;
    merchantGrom: any;
    elaraSage: any;
  };
  
  constructor(agents: {
    gameMaster: any;
    elderMorgan: any;
    merchantGrom: any;
    elaraSage: any;
  }) {
    this.agents = agents;
  }

  /**
   * Day 1開始ワークフローを実行
   */
  async runDay1Start(playerName: string, playerRole: PlayerRole, gameState?: GameState) {
    const workflow = createDay1Workflow({
      gameMaster: this.agents.gameMaster,
      elderMorgan: this.agents.elderMorgan
    });
    
    return await workflow.execute({
      playerName,
      playerRole,
      gameState,
      prophecyDelivered: false,
      reputationChange: 0
    });
  }

  /**
   * プレイヤー行動ワークフローを実行
   */
  async runPlayerAction(playerName: string, playerRole: PlayerRole, playerAction: string, currentDay: number) {
    const workflow = createPlayerActionWorkflow({
      gameMaster: this.agents.gameMaster,
      Elder_Morgan: this.agents.elderMorgan,
      Merchant_Grom: this.agents.merchantGrom,
      Elara_Sage: this.agents.elaraSage
    });
    
    return await workflow.execute({
      playerName,
      playerRole,
      playerAction,
      currentDay,
      needsDelegation: false
    });
  }

  /**
   * 商取引ワークフローを実行
   */
  async runTrade(playerName: string, playerRole: PlayerRole, item?: string, budget?: number, currentDay?: number, playerWealth?: number) {
    const workflow = createTradeWorkflow({
      gameMaster: this.agents.gameMaster,
      merchantGrom: this.agents.merchantGrom
    });
    
    return await workflow.execute({
      playerName,
      playerRole,
      item,
      budget,
      currentDay,
      playerWealth,
      tradeCompleted: false
    });
  }

  /**
   * 魔法相談ワークフローを実行
   */
  async runMagicConsultation(playerName: string, playerRole: PlayerRole, question?: string, currentDay?: number) {
    const workflow = createMagicConsultationWorkflow({
      gameMaster: this.agents.gameMaster,
      elaraSage: this.agents.elaraSage
    });
    
    return await workflow.execute({
      playerName,
      playerRole,
      question,
      currentDay,
      consultationCompleted: false
    });
  }

  /**
   * 日次進行ワークフローを実行
   */
  async runDayProgression(playerName: string, currentDay: number, currentStats: any) {
    const workflow = createDayProgressionWorkflow({
      gameMaster: this.agents.gameMaster
    });
    
    return await workflow.execute({
      playerName,
      currentDay,
      currentStats,
      dailyActivities: [],
      progressionCompleted: false
    });
  }
}