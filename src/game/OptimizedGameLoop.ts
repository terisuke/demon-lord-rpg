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
      console.warn(`⚠️ ${taskName}: エラー (フォールバック使用)`, error instanceof Error ? error.message : String(error));
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
  /**
   * AI駆動のゲーム状態更新（Few-shot prompting使用）
   */
  private async updateGameStateAsync(action: string): Promise<void> {
    try {
      // AI評価を実行
      const evaluation = await GrokService.evaluateStateChanges(
        action,
        this.gameState,
        this.currentDay
      );

      // AI評価結果を適用
      this.gameState.reputation += evaluation.reputation;
      this.gameState.gold += evaluation.gold;
      
      // storyFlagsを統合
      Object.assign(this.gameState.storyFlags, evaluation.storyFlags);

      console.log(`🧠 AI評価完了: ${evaluation.reasoning}`);
      console.log(`📊 状態変更: 評判${evaluation.reputation > 0 ? '+' : ''}${evaluation.reputation}, 金${evaluation.gold > 0 ? '+' : ''}${evaluation.gold}`);
      
      // 既存のフラグロジックは残しつつ、AI評価を優先
      this.applyDayBasedFlags();
      
    } catch (error) {
      console.warn('⚠️ AI状態評価エラー、フォールバック処理を実行');
      
      // フォールバック: 軽微なランダム変化
      const minorChange = Math.floor(Math.random() * 10) - 5;
      this.gameState.reputation += minorChange;
      console.log(`🎲 フォールバック変化: 評判${minorChange > 0 ? '+' : ''}${minorChange}`);
    }
  }

  /**
   * Day進行に応じたフラグ設定（AI評価と併用）
   */
  private applyDayBasedFlags(): void {
    // Day 20以降は緊張度が上がる
    if (this.currentDay > 20) {
      this.gameState.storyFlags['high_tension'] = true;
    }
    
    // Day 25以降は最終段階
    if (this.currentDay >= 25) {
      this.gameState.storyFlags['final_phase'] = true;
    }
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