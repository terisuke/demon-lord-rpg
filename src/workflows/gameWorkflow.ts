import { createWorkflowChain } from '@voltagent/core';
import { GameState, PlayerRole } from '../types';

/**
 * Day 1 ゲーム開始ワークフロー
 * GameMaster -> Elder Morgan -> 状態更新の流れを定義
 */
export const day1Workflow = createWorkflowChain()
  .andAgent('GameMaster', (context: any) => {
    return `Day 1のゲームを開始します。プレイヤー「${context.playerName}」（役割: ${context.playerRole}）の冒険が始まります。村の状況を確認し、Elder Morganに予言の告知を委譲してください。`;
  })
  .andAgent('Elder_Morgan', (context: any) => {
    return `プレイヤー「${context.playerName}」（役割: ${context.playerRole}）に対して、30日後の魔王襲来の予言を威厳を持って告知してください。プレイヤーの役割に応じた適切な反応と、村長としての指示を含めてください。`;
  })
  .andThen((context: any) => {
    // ゲーム状態を更新
    if (context.gameState) {
      context.gameState.gameFlags.prophecyHeard = true;
      context.gameState.gameFlags.villageWarned = true;
      
      // プレイヤーの役割に応じた初期評判調整
      switch (context.playerRole) {
        case 'hero':
          context.gameState.playerStats.reputation += 10;
          break;
        case 'merchant':
          context.gameState.playerStats.reputation += 5;
          break;
        case 'traitor':
          context.gameState.playerStats.reputation -= 5;
          break;
      }
    }
    
    return {
      message: 'Day 1のワークフローが完了しました。',
      updatedGameState: context.gameState,
      nextPhase: 'player_choice'
    };
  });

/**
 * プレイヤー行動処理ワークフロー
 * GameMasterが行動を解釈し、必要に応じてNPCに委譲するワークフロー
 */
export const playerActionWorkflow = createWorkflowChain()
  .andAgent('GameMaster', (context: any) => {
    return `プレイヤー「${context.playerName}」が「${context.playerAction}」という行動を取りました。この行動を解釈し、適切なNPCに委譲が必要かどうか判断してください。現在はDay ${context.currentDay}です。`;
  })
  .andThen((context: any) => {
    // GameMasterの判断結果に基づいてNPCへの委譲を決定
    const gmResponse = context.result;
    
    if (gmResponse && gmResponse.needsDelegation && gmResponse.delegationTarget) {
      // 委譲が必要な場合、対象NPCを追加
      context.delegationTarget = gmResponse.delegationTarget;
      context.delegationTask = context.playerAction;
    }
    
    return context;
  })
  .andAgent((context: any) => context.delegationTarget, (context: any) => {
    if (context.delegationTarget && context.delegationTask) {
      return `プレイヤー「${context.playerName}」（役割: ${context.playerRole}）があなたのところに来て「${context.delegationTask}」と言いました。あなたの性格と知識に基づいて適切に応答してください。`;
    }
    return null; // 委譲が不要な場合はスキップ
  }, { optional: true })
  .andThen((context: any) => {
    // 結果を統合してゲーム状態を更新
    const finalResult = {
      narrative: context.result?.narrative || context.gmResponse?.narrative || 'システムエラーが発生しました。',
      stateChanges: {
        ...(context.gmResponse?.stateChanges || {}),
        ...(context.result?.stateChanges || {})
      },
      choices: context.gmResponse?.choices || []
    };
    
    return finalResult;
  });

/**
 * 商取引ワークフロー
 * プレイヤーとMerchant Gromの取引処理
 */
export const tradeWorkflow = createWorkflowChain()
  .andAgent('GameMaster', (context: any) => {
    return `プレイヤー「${context.playerName}」が商取引を希望しています。商品: ${context.item || '未指定'}、予算: ${context.budget || context.playerWealth}G。Merchant Gromに委譲してください。`;
  })
  .andAgent('Merchant_Grom', (context: any) => {
    return `プレイヤー「${context.playerName}」（役割: ${context.playerRole}）が商取引に来ました。希望商品: ${context.item || '相談'}、予算: ${context.budget || context.playerWealth}G、現在はDay ${context.currentDay}。適切な商品を提案し、価格を提示してください。`;
  })
  .andThen((context: any) => {
    // 取引結果を処理
    const tradeResult = context.result;
    
    return {
      narrative: tradeResult.narrative,
      tradeOptions: tradeResult.tradeOptions || [],
      priceList: tradeResult.priceList || {},
      recommendations: tradeResult.recommendations || []
    };
  });

/**
 * 魔法相談ワークフロー
 * プレイヤーとElara Sageの魔法的相談
 */
export const magicConsultationWorkflow = createWorkflowChain()
  .andAgent('GameMaster', (context: any) => {
    return `プレイヤー「${context.playerName}」が魔法や予言について相談を求めています。質問: ${context.question || '一般的な相談'}。Elara Sageに委譲してください。`;
  })
  .andAgent('Elara_Sage', (context: any) => {
    return `プレイヤー「${context.playerName}」（役割: ${context.playerRole}）が魔法的な相談に来ました。質問: ${context.question || '運命について'}、現在はDay ${context.currentDay}。あなたの知識と占術能力を使って適切な助言を提供してください。`;
  })
  .andThen((context: any) => {
    // 相談結果を処理
    const consultationResult = context.result;
    
    return {
      narrative: consultationResult.narrative,
      prophecy: consultationResult.prophecy || null,
      magicalAdvice: consultationResult.advice || null,
      knowledgeGained: consultationResult.knowledgeGained || []
    };
  });

/**
 * 日次進行ワークフロー
 * 1日の終了時に実行される処理
 */
export const dayProgressionWorkflow = createWorkflowChain()
  .andAgent('GameMaster', (context: any) => {
    return `Day ${context.currentDay}が終了します。プレイヤー「${context.playerName}」の今日の活動を総括し、翌日への影響を評価してください。現在の状況: ${JSON.stringify(context.currentStats)}`;
  })
  .andThen((context: any) => {
    // 日次進行処理
    const newDay = Math.min(30, context.currentDay + 1);
    const dayResult = context.result;
    
    // 基本的な日次変化
    const stateChanges = {
      currentDay: newDay,
      dailyEvent: dayResult.dailyEvent || null,
      worldChanges: dayResult.worldChanges || {},
      playerStats: {
        // 基本的な日次回復
        health: Math.min(100, (context.currentStats.health || 50) + 5)
      }
    };
    
    // 魔王襲来が近づくにつれて緊張度上昇
    const tensionLevel = Math.floor((newDay / 30) * 100);
    
    return {
      newGameState: stateChanges,
      tensionLevel: tensionLevel,
      daysSummary: dayResult.summary || `Day ${context.currentDay}が終了しました。`,
      specialEvents: dayResult.specialEvents || [],
      nextDayPreview: dayResult.nextDayPreview || `Day ${newDay}が始まります。`
    };
  });

/**
 * ワークフローの実行ヘルパー関数
 */
export class GameWorkflowManager {
  /**
   * Day 1開始ワークフローを実行
   */
  static async runDay1Start(playerName: string, playerRole: PlayerRole, gameState: GameState) {
    return await day1Workflow.execute({
      playerName,
      playerRole,
      gameState
    });
  }

  /**
   * プレイヤー行動ワークフローを実行
   */
  static async runPlayerAction(playerName: string, playerRole: PlayerRole, playerAction: string, currentDay: number) {
    return await playerActionWorkflow.execute({
      playerName,
      playerRole,
      playerAction,
      currentDay
    });
  }

  /**
   * 商取引ワークフローを実行
   */
  static async runTrade(playerName: string, playerRole: PlayerRole, item?: string, budget?: number, currentDay?: number, playerWealth?: number) {
    return await tradeWorkflow.execute({
      playerName,
      playerRole,
      item,
      budget,
      currentDay,
      playerWealth
    });
  }

  /**
   * 魔法相談ワークフローを実行
   */
  static async runMagicConsultation(playerName: string, playerRole: PlayerRole, question?: string, currentDay?: number) {
    return await magicConsultationWorkflow.execute({
      playerName,
      playerRole,
      question,
      currentDay
    });
  }

  /**
   * 日次進行ワークフローを実行
   */
  static async runDayProgression(playerName: string, currentDay: number, currentStats: any) {
    return await dayProgressionWorkflow.execute({
      playerName,
      currentDay,
      currentStats
    });
  }
}