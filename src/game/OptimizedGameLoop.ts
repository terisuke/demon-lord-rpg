// src/game/OptimizedGameLoop.ts - P0: Promise.all並列処理最適化
import { generateSceneImage } from '../features/imageGeneration';
import { GrokService } from '../services/GrokService';
import { realTimeSearchService } from '../services/RealTimeSearchService';
import { aivisEnhanced } from '../services/AIVISEnhancedService';
import { handleError } from '../utils/errorHandler';

interface OptimizedGameResponse {
  day: number;
  narrative: string;
  imageUrl: string | null;
  choices: string[];
  gameOver: boolean;
  specialEvent?: string;
  searchEvent?: {
    query: string;
    results: string;
    integration: string;
    mood: string;
  };
  audio?: {
    data: string;
    reason: string;
  };
  gameState?: {
    gold: number;
    reputation: number;
    role: string;
    level?: number;
    inventory?: string[];
    stats?: {
      strength?: number;
      intelligence?: number;
      charisma?: number;
    };
  };
  performance: {
    totalTime: number;
    parallelTime: number;
    serialTime: number;
    tasksCompleted: number;
    tasksSkipped: number;
  };
}

export class OptimizedGameLoop {
  private currentDay: number = 1;
  private maxDays: number = 30;
  private gameState: any = {
    playerRole: 'hero',
    reputation: 0,
    gold: 100,
    storyFlags: {},
    history: [],
  };

  constructor() {
    console.log('🚀 OptimizedGameLoop初期化 - Promise.all並列処理有効');
  }

  /**
   * P0機能: Promise.allによる完全並列処理
   */
  async processPlayerActionOptimized(action: string): Promise<OptimizedGameResponse> {
    const startTime = Date.now();
    console.log(`⚡ [Day ${this.currentDay}] 並列処理開始: "${action}"`);

    // 行動履歴を記録
    this.gameState.history.push({
      day: this.currentDay,
      action: action,
    });

    try {
      // フェーズ1: 並列処理可能なタスク（Promise.all）
      const parallelStartTime = Date.now();

      const [specialEvent, searchEvent, baseNarrative, imageUrl, gameStateUpdate] =
        await Promise.all([
          // 特別イベントチェック
          this.safeAsync(
            () => GrokService.checkForSpecialEvent(this.currentDay, this.gameState),
            null,
            '特別イベント'
          ),

          // リアルタイム検索（並列実行）
          this.safeAsync(
            () => realTimeSearchService.triggerSearchOnDay(this.currentDay, action, this.gameState),
            null,
            'リアルタイム検索'
          ),

          // 基本ナレーション生成
          this.safeAsync(
            () => GrokService.generateNarrative(this.currentDay, action, this.gameState),
            `Day ${this.currentDay}の物語を紡いでいます...`,
            'ナレーション生成'
          ),

          // 画像生成（条件付き）
          this.safeAsync(
            () =>
              this.shouldGenerateImage(this.currentDay)
                ? generateSceneImage(`Day ${this.currentDay} scene`, this.currentDay)
                : null,
            null,
            '画像生成'
          ),

          // ゲーム状態更新（非同期処理化）
          this.safeAsync(
            () => Promise.resolve(this.updateGameStateAsync(action)),
            null,
            'ゲーム状態更新'
          ),
        ]);

      const parallelTime = Date.now() - parallelStartTime;

      // フェーズ2: 順次処理が必要なタスク
      const serialStartTime = Date.now();

      // ナレーション統合（検索結果と特別イベントを含める）
      const fullNarrative = this.integrateNarrative(baseNarrative, specialEvent, searchEvent);

      // フェーズ3: ナレーション依存タスクを並列実行
      const [choices, audioResult] = await Promise.all([
        // 選択肢生成
        this.safeAsync(
          () => GrokService.generateChoices(this.currentDay, fullNarrative, this.gameState),
          ['探索する', '休息する', '情報を集める'],
          '選択肢生成'
        ),

        // 音声生成
        this.safeAsync(
          async () => {
            const result = await aivisEnhanced.autoNarrate(fullNarrative, this.currentDay);
            return result.shouldPlay && result.audioData
              ? { data: result.audioData, reason: result.reason }
              : null;
          },
          null,
          '音声生成'
        ),
      ]);

      const serialTime = Date.now() - serialStartTime;

      // 日を進める
      this.advanceDay();

      const totalTime = Date.now() - startTime;

      // 統計情報
      const tasksCompleted = [
        specialEvent,
        searchEvent,
        baseNarrative,
        imageUrl,
        gameStateUpdate,
        fullNarrative,
        choices,
        audioResult,
      ].filter((task) => task !== null && task !== undefined).length;

      const tasksSkipped = 8 - tasksCompleted;

      console.log(
        `✅ [Day ${this.currentDay - 1}] 並列処理完了: ${totalTime}ms (並列: ${parallelTime}ms, 順次: ${serialTime}ms)`
      );
      console.log(`   完了タスク: ${tasksCompleted}, スキップ: ${tasksSkipped}`);

      return {
        day: this.currentDay - 1,
        narrative: fullNarrative,
        imageUrl,
        choices,
        gameOver: this.currentDay > this.maxDays,
        specialEvent,
        searchEvent: searchEvent
          ? {
              query: searchEvent.searchQuery,
              results: searchEvent.searchResults,
              integration: searchEvent.gameIntegration,
              mood: searchEvent.mood,
            }
          : undefined,
        audio: audioResult,
        gameState: {
          gold: this.gameState.gold,
          reputation: this.gameState.reputation,
          role: this.gameState.playerRole,
          level: Math.floor(this.gameState.reputation / 10) + 1,
          inventory: Object.keys(this.gameState.storyFlags).filter(
            (flag) =>
              flag.includes('found_') || flag.includes('weapon') || flag.includes('treasure')
          ),
          stats: {
            strength: Math.floor(this.gameState.reputation / 15) + 5,
            intelligence: Math.floor(this.gameState.reputation / 12) + 5,
            charisma: Math.floor(this.gameState.reputation / 8) + 5,
          },
        },
        performance: {
          totalTime,
          parallelTime,
          serialTime,
          tasksCompleted,
          tasksSkipped,
        },
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      handleError(error, 'OptimizedGameLoop.processPlayerActionOptimized');

      // エラー時のフォールバック応答
      return {
        day: this.currentDay,
        narrative: 'システムエラーが発生しましたが、物語は続きます...',
        imageUrl: null,
        choices: ['続ける'],
        gameOver: false,
        gameState: {
          gold: this.gameState.gold,
          reputation: this.gameState.reputation,
          role: this.gameState.playerRole,
        },
        performance: {
          totalTime,
          parallelTime: 0,
          serialTime: totalTime,
          tasksCompleted: 0,
          tasksSkipped: 8,
        },
      };
    }
  }

  /**
   * 安全な非同期実行ラッパー（エラー時フォールバック付き）
   */
  private async safeAsync<T>(
    asyncFn: () => Promise<T>,
    fallbackValue: T,
    taskName: string
  ): Promise<T> {
    try {
      const result = await asyncFn();
      console.log(`✅ ${taskName}: 成功`);
      return result;
    } catch (error) {
      console.warn(`⚠️ ${taskName}: エラー (フォールバック使用)`, error.message);
      return fallbackValue;
    }
  }

  /**
   * ナレーション統合処理
   */
  private integrateNarrative(
    baseNarrative: string,
    specialEvent?: string | null,
    searchEvent?: any
  ): string {
    let fullNarrative = baseNarrative;

    // 特別イベント統合
    if (specialEvent) {
      fullNarrative = `【特別イベント】\n${specialEvent}\n\n${fullNarrative}`;
    }

    // 検索結果統合
    if (searchEvent && searchEvent.gameIntegration) {
      fullNarrative += `\n\n【探索結果】\n${searchEvent.gameIntegration}`;
      console.log(`🔍 検索統合: ${searchEvent.mood}`);
    }

    return fullNarrative;
  }

  /**
   * 画像生成判定（重要な日のみ）
   */
  private shouldGenerateImage(day: number): boolean {
    // より頻繁な画像生成：重要な場面や定期的に生成
    // 毎日生成するとコストが高いため、3日に1回 + 重要日
    const regularDays = day % 3 === 1; // Day 1, 4, 7, 10, 13, 16, 19, 22, 25, 28
    const importantDays = [1, 5, 10, 15, 20, 25, 30].includes(day);

    return regularDays || importantDays;
  }

  /**
   * ゲーム状態更新（非同期化）
   */
  private async updateGameStateAsync(action: string): Promise<void> {
    return new Promise((resolve) => {
      // アクション解析 - より詳細な状態変更
      const actionLower = action.toLowerCase();

      // ===== 役割変更処理（直接指定） =====
      // 直接的な役割変更
      if (actionLower.includes('英雄になる') || actionLower.includes('勇者になる')) {
        this.gameState.playerRole = '英雄';
        this.gameState.reputation = Math.max(this.gameState.reputation, 20);
        console.log('⚔️ 英雄の道を選んだ！');
      } else if (actionLower.includes('商人になる') || actionLower.includes('商売人になる')) {
        this.gameState.playerRole = '商人';
        this.gameState.gold += 500;
        console.log('💰 商人の道を選んだ！');
      } else if (actionLower.includes('盗賊になる') || actionLower.includes('泥棒になる')) {
        this.gameState.playerRole = '盗賊';
        this.gameState.reputation -= 30;
        this.gameState.gold += 200;
        console.log('🗡️ 盗賊の道を選んだ！');
      } else if (actionLower.includes('賢者になる') || actionLower.includes('学者になる')) {
        this.gameState.playerRole = '賢者';
        this.gameState.reputation += 10;
        console.log('📚 賢者の道を選んだ！');
      } else if (actionLower.includes('傭兵になる') || actionLower.includes('戦士になる')) {
        this.gameState.playerRole = '傭兵';
        this.gameState.reputation += 5;
        console.log('⚔️ 傭兵の道を選んだ！');
      } else if (actionLower.includes('臆病者になる') || actionLower.includes('隠者になる')) {
        this.gameState.playerRole = '臆病者';
        this.gameState.reputation -= 15;
        console.log('🫥 隠遁の道を選んだ！');
      } else if (actionLower.includes('裏切り者になる') || actionLower.includes('スパイになる')) {
        this.gameState.playerRole = '裏切り者';
        this.gameState.reputation -= 50;
        this.gameState.gold += 1000; // 裏切りの代価
        console.log('🕵️ 裏切りの道を選んだ！');
      } else if (actionLower.includes('村人になる') || actionLower.includes('農民になる')) {
        this.gameState.playerRole = '村人';
        this.gameState.reputation = Math.max(0, this.gameState.reputation);
        console.log('🏡 平凡な村人の道を選んだ！');
      }

      // ===== 負の変更処理（盗難、詐欺、失敗など） =====
      // 泥棒・盗難処理
      else if (
        actionLower.includes('盗まれる') ||
        actionLower.includes('泥棒') ||
        actionLower.includes('盗難')
      ) {
        // 金額の抽出（30G、100G等）
        const goldMatch = actionLower.match(/(\d+)g|(\d+)ゴールド/);
        if (goldMatch) {
          const stolenAmount = parseInt(goldMatch[1] || goldMatch[2]);
          this.gameState.gold = Math.max(0, this.gameState.gold - stolenAmount);
          this.gameState.reputation -= 5; // 盗まれたことで評判も下がる
          console.log(`💸 ${stolenAmount}ゴールドが盗まれた！`);
        } else {
          // 具体的な金額が不明な場合は所持金の10-30%を失う
          const lossPercent = Math.random() * 0.2 + 0.1; // 10-30%
          const lossAmount = Math.floor(this.gameState.gold * lossPercent);
          this.gameState.gold = Math.max(0, this.gameState.gold - lossAmount);
          this.gameState.reputation -= 8;
          console.log(`💸 ${lossAmount}ゴールドが盗まれた！`);
        }
        this.gameState.storyFlags['robbed'] = true;
      }

      // 詐欺・騙される
      else if (
        actionLower.includes('詐欺') ||
        actionLower.includes('騙') ||
        actionLower.includes('だまし')
      ) {
        const lossAmount = Math.floor(this.gameState.gold * 0.15); // 15%失う
        this.gameState.gold = Math.max(0, this.gameState.gold - lossAmount);
        this.gameState.reputation -= 10;
        this.gameState.storyFlags['scammed'] = true;
        console.log(`😵 詐欺で${lossAmount}ゴールドを失った！`);
      }

      // ギャンブル負け
      else if (
        actionLower.includes('ギャンブル') &&
        (actionLower.includes('負け') || actionLower.includes('失敗'))
      ) {
        const lossAmount = Math.floor(Math.random() * this.gameState.gold * 0.3); // 最大30%
        this.gameState.gold = Math.max(0, this.gameState.gold - lossAmount);
        this.gameState.reputation -= 3;
        console.log(`🎰 ギャンブルで${lossAmount}ゴールドを失った！`);
      }

      // 酒場での喧嘩・トラブル
      else if (actionLower.includes('喧嘩') || actionLower.includes('暴力')) {
        this.gameState.reputation -= 15;
        this.gameState.gold -= Math.floor(Math.random() * 200) + 50; // 慰謝料
        this.gameState.gold = Math.max(0, this.gameState.gold);
        this.gameState.storyFlags['troublemaker'] = true;
        console.log(`👊 喧嘩で評判と金を失った！`);
      }

      // 村から追放・逃亡
      else if (actionLower.includes('追放') || actionLower.includes('逃げ')) {
        this.gameState.reputation -= 20;
        this.gameState.storyFlags['exile'] = true;
        console.log(`🏃 村から逃亡し評判が大幅に低下！`);
      }

      // ===== 正の変更処理（従来通り） =====
      // 金銭関連の処理
      else if (
        actionLower.includes('1億') ||
        actionLower.includes('一億') ||
        actionLower.includes('100000000')
      ) {
        this.gameState.gold = Math.max(this.gameState.gold, 100000000);
        this.gameState.reputation += 20;
        this.gameState.storyFlags['found_massive_treasure'] = true;
        console.log('💰 1億ゴールドを発見！');
      } else if (
        actionLower.includes('宝') ||
        actionLower.includes('財宝') ||
        actionLower.includes('gold')
      ) {
        const goldGain = Math.floor(Math.random() * 10000) + 1000;
        this.gameState.gold += goldGain;
        this.gameState.storyFlags['found_treasure'] = true;
        console.log(`💰 ${goldGain}ゴールドを獲得！`);
      }

      // 村長との会話
      else if (actionLower.includes('村長') || actionLower.includes('elder')) {
        this.gameState.reputation += 5;
        this.gameState.storyFlags['talked_to_elder'] = true;
      }

      // 武器・装備関連
      else if (
        actionLower.includes('武器') ||
        actionLower.includes('weapon') ||
        actionLower.includes('装備')
      ) {
        this.gameState.storyFlags['searched_weapons'] = true;
        if (Math.random() > 0.5) {
          this.gameState.storyFlags['found_weapon'] = true;
          this.gameState.reputation += 3;
        }
      }

      // 情報収集
      else if (
        actionLower.includes('情報') ||
        actionLower.includes('調査') ||
        actionLower.includes('investigation')
      ) {
        this.gameState.storyFlags['gathered_info'] = true;
        this.gameState.reputation += 2;
      }

      // 訓練・修行
      else if (
        actionLower.includes('訓練') ||
        actionLower.includes('修行') ||
        actionLower.includes('training')
      ) {
        this.gameState.storyFlags['trained'] = true;
        this.gameState.reputation += 3;
      }

      // 商売・取引
      else if (
        actionLower.includes('商売') ||
        actionLower.includes('取引') ||
        actionLower.includes('trade')
      ) {
        this.gameState.gold += Math.floor(Math.random() * 500) + 100;
        this.gameState.reputation += 1;
      }

      // 探索系
      else if (
        actionLower.includes('探索') ||
        actionLower.includes('search') ||
        actionLower.includes('explore')
      ) {
        if (Math.random() > 0.7) {
          const goldFind = Math.floor(Math.random() * 1000) + 100;
          this.gameState.gold += goldFind;
          console.log(`🔍 探索で${goldFind}ゴールドを発見！`);
        }
      }

      // Day段階別フラグと状態変化
      if (this.currentDay > 20) {
        this.gameState.storyFlags['high_tension'] = true;
      }

      if (this.currentDay >= 25) {
        this.gameState.storyFlags['final_phase'] = true;
      }

      resolve();
    });
  }

  /**
   * Day進行処理
   */
  private advanceDay(): void {
    this.currentDay++;
    console.log(`📅 Day ${this.currentDay}/${this.maxDays}`);

    // 終盤の警告
    if (this.currentDay === 25) {
      console.log('⚠️ あと5日で魔王が襲来します！');
    } else if (this.currentDay === 29) {
      console.log('🚨 明日、魔王が襲来します！');
    } else if (this.currentDay === 30) {
      console.log('💀 魔王襲来の日！');
    }
  }

  /**
   * バッチ処理デモ（複数プレイヤー対応の準備）
   */
  async processBatchActions(
    actions: Array<{ playerId: string; action: string }>
  ): Promise<Map<string, OptimizedGameResponse>> {
    console.log(`🔄 バッチ処理開始: ${actions.length}件`);

    const results = new Map<string, OptimizedGameResponse>();

    // 全プレイヤーの処理を並列実行
    const promises = actions.map(async ({ playerId, action }) => {
      const result = await this.processPlayerActionOptimized(action);
      results.set(playerId, result);
      return { playerId, result };
    });

    await Promise.all(promises);

    console.log(`✅ バッチ処理完了: ${results.size}件`);
    return results;
  }

  // ゲッター
  get currentDayNumber(): number {
    return this.currentDay;
  }

  get gameStateData(): any {
    return this.gameState;
  }

  /**
   * パフォーマンス統計取得
   */
  getPerformanceStats(): {
    currentDay: number;
    gameState: any;
    optimization: string;
  } {
    return {
      currentDay: this.currentDay,
      gameState: this.gameState,
      optimization: 'Promise.all並列処理有効',
    };
  }

  // セーブ・ロード機能
  saveGame(): string {
    return JSON.stringify({
      day: this.currentDay,
      state: this.gameState,
      optimization: true,
    });
  }

  loadGame(saveData: string): void {
    const data = JSON.parse(saveData);
    this.currentDay = data.day;
    this.gameState = data.state;
    console.log('📖 最適化ゲームループデータロード完了');
  }
}

// シングルトンインスタンス
export const optimizedGameLoop = new OptimizedGameLoop();
