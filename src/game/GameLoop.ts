// src/game/GameLoop.ts - P0機能統合版
import { generateSceneImage } from '../features/imageGeneration';
import { GrokService } from '../services/GrokService';
import { realTimeSearchService } from '../services/RealTimeSearchService';

interface GameResponse {
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
  }; // P0: リアルタイム検索結果
}

export class GameLoop {
  private currentDay: number = 1;
  private maxDays: number = 30;
  private gameState: any = {
    playerRole: 'hero',
    reputation: 0,
    gold: 100,
    storyFlags: {},
    history: [], // プレイヤーの行動履歴
  };

  async processPlayerAction(action: string): Promise<GameResponse> {
    console.log(`[Day ${this.currentDay}] Action: ${action}`);

    // 行動履歴を記録
    this.gameState.history.push({
      day: this.currentDay,
      action: action,
    });

    // 1. 特別なイベントをチェック
    const specialEvent = await GrokService.checkForSpecialEvent(this.currentDay, this.gameState);

    // 2. P0: リアルタイム検索発動チェック
    let searchEvent = null;
    try {
      const searchTrigger = await realTimeSearchService.triggerSearchOnDay(
        this.currentDay,
        action,
        this.gameState
      );

      if (searchTrigger) {
        console.log(`🔍 [Day ${this.currentDay}] リアルタイム検索発動成功`);
        searchEvent = {
          query: searchTrigger.searchQuery,
          results: searchTrigger.searchResults,
          integration: searchTrigger.gameIntegration,
          mood: searchTrigger.mood,
        };
      }

      // プレイヤークエリによる検索もチェック
      if (!searchEvent) {
        const playerSearchResult = await realTimeSearchService.searchOnPlayerQuery(
          this.currentDay,
          action
        );

        if (playerSearchResult) {
          console.log(`🔍 [Day ${this.currentDay}] プレイヤー検索発動`);
          searchEvent = {
            query: action,
            results: 'プレイヤー主導検索',
            integration: playerSearchResult,
            mood: 'neutral',
          };
        }
      }
    } catch (error) {
      console.error(`❌ 検索エラー [Day ${this.currentDay}]:`, error);
    }

    // 3. AIで物語を生成（検索結果を含める）
    const narrative = await this.generateNarrative(action, specialEvent, searchEvent);

    // 4. 重要な日なら画像生成
    const imageUrl = await generateSceneImage(narrative, this.currentDay);

    // 5. 次の選択肢を動的に生成
    const choices = await this.generateChoices(narrative);

    // 6. ゲーム状態を更新
    this.updateGameState(action);

    // 7. 日を進める
    this.advanceDay();

    return {
      day: this.currentDay - 1,
      narrative,
      imageUrl,
      choices,
      gameOver: this.currentDay > this.maxDays,
      specialEvent,
      searchEvent, // P0: 検索結果を含める
    };
  }

  private async generateNarrative(
    action: string,
    specialEvent?: string | null,
    searchEvent?: any
  ): Promise<string> {
    // 基本ナレーション生成
    let fullNarrative = await GrokService.generateNarrative(
      this.currentDay,
      action,
      this.gameState
    );

    // 特別イベントがある場合は組み合わせる
    if (specialEvent) {
      fullNarrative = `【特別イベント】\n${specialEvent}\n\n${fullNarrative}`;
    }

    // P0: 検索結果を統合
    if (searchEvent && searchEvent.integration) {
      fullNarrative += `\n\n【探索結果】\n${searchEvent.integration}`;

      // 検索が発動したことをログ出力
      console.log(`🔍 [Day ${this.currentDay}] 検索統合完了: ${searchEvent.mood}`);
    }

    return fullNarrative;
  }

  private async generateChoices(context: string): Promise<string[]> {
    // Grok APIで動的に選択肢を生成
    return await GrokService.generateChoices(this.currentDay, context, this.gameState);
  }

  private updateGameState(action: string): void {
    // アクションに応じてゲーム状態を更新
    if (action.includes('村長')) {
      this.gameState.reputation += 5;
      this.gameState.storyFlags['talked_to_elder'] = true;
    }

    if (action.includes('武器')) {
      this.gameState.storyFlags['searched_weapons'] = true;
      // 確率で武器を見つける
      if (Math.random() > 0.5) {
        this.gameState.storyFlags['found_weapon'] = true;
      }
    }

    if (action.includes('情報')) {
      this.gameState.storyFlags['gathered_info'] = true;
    }

    if (action.includes('訓練')) {
      this.gameState.storyFlags['trained'] = true;
    }

    // Day 20以降は緊張度が上がる
    if (this.currentDay > 20) {
      this.gameState.storyFlags['high_tension'] = true;
    }

    // Day 25以降は最終段階
    if (this.currentDay >= 25) {
      this.gameState.storyFlags['final_phase'] = true;
    }
  }

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

  // Day 30の最終イベント
  async processFinalDay(): Promise<GameResponse> {
    const finalNarrative = await GrokService.generateNarrative(
      30,
      '魔王と対峙する',
      this.gameState
    );

    // エンディングの判定
    const ending = this.determineEnding();

    return {
      day: 30,
      narrative: `${finalNarrative}\n\n【エンディング: ${ending}】`,
      imageUrl: await generateSceneImage('魔王との最終決戦', 30),
      choices: ['もう一度プレイする'],
      gameOver: true,
      specialEvent: '魔王襲来！',
    };
  }

  private determineEnding(): string {
    const { storyFlags, reputation } = this.gameState;

    // 複数の条件でエンディング分岐
    if (storyFlags.found_weapon && reputation > 50) {
      return '英雄の凱旋';
    } else if (storyFlags.trained && storyFlags.gathered_info) {
      return '賢者の勝利';
    } else if (reputation < -20) {
      return '裏切り者の末路';
    } else if (!storyFlags.talked_to_elder && !storyFlags.searched_weapons) {
      return '逃亡者';
    } else {
      return '村人の抵抗';
    }
  }

  // ゲッター
  get currentDayNumber(): number {
    return this.currentDay;
  }

  get gameStateData(): any {
    return this.gameState;
  }

  // セーブ・ロード機能（将来実装用）
  saveGame(): string {
    return JSON.stringify({
      day: this.currentDay,
      state: this.gameState,
    });
  }

  loadGame(saveData: string): void {
    const data = JSON.parse(saveData);
    this.currentDay = data.day;
    this.gameState = data.state;
  }
}
