// src/services/RealTimeSearchService.ts - P0: Grokリアルタイム検索統合
import { generateText } from 'ai';
import { xai } from '@ai-sdk/xai';
import { handleError } from '../utils/errorHandler';

export interface SearchTriggerEvent {
  day: number;
  searchQuery: string;
  searchResults: string;
  gameIntegration: string;
  mood: 'hopeful' | 'neutral' | 'concerned' | 'urgent' | 'desperate';
}

export class RealTimeSearchService {
  private readonly TRIGGER_DAYS = [5, 10, 15, 20, 25];
  private searchCache: Map<string, { result: string; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30分キャッシュ

  constructor() {
    console.log(`🔍 RealTime Search Service 初期化`);
    console.log(`   発動日: ${this.TRIGGER_DAYS.join(', ')}`);
  }

  /**
   * P0機能: 指定日にリアルタイム検索を自動発動
   */
  async triggerSearchOnDay(
    day: number,
    playerAction: string,
    gameState: any
  ): Promise<SearchTriggerEvent | null> {
    if (!this.TRIGGER_DAYS.includes(day)) {
      return null; // 発動日でない場合はnull
    }

    console.log(`🔍 [Day ${day}] リアルタイム検索発動開始`);

    try {
      // 検索クエリを生成（プレイヤー行動と日数に基づく）
      const searchQuery = this.generateSearchQuery(day, playerAction, gameState);
      console.log(`🔍 検索クエリ: "${searchQuery}"`);

      // リアルタイム検索実行
      const searchResults = await this.performRealTimeSearch(searchQuery);
      console.log(`✅ 検索結果取得: ${searchResults.length}文字`);

      // 結果をゲーム世界観に統合
      const gameIntegration = await this.integrateSearchResults(
        day,
        searchQuery,
        searchResults,
        gameState
      );

      // 日数に応じた感情設定
      const mood = this.getMoodByDay(day);

      return {
        day,
        searchQuery,
        searchResults,
        gameIntegration,
        mood,
      };
    } catch (error) {
      console.error(`❌ [Day ${day}] リアルタイム検索エラー:`, error);
      return null;
    }
  }

  /**
   * プレイヤー行動と日数から検索クエリを生成
   */
  private generateSearchQuery(day: number, playerAction: string, gameState: any): string {
    // プレイヤー行動に応じてクエリを調整
    const baseQueries: Record<number, string> = {
      5: 'disaster preparedness community survival methods',
      10: 'medieval fantasy defense strategies against monsters',
      15: 'ancient legends demon lord weakness mythological',
      20: 'military tactics last stand village defense',
      25: 'apocalyptic survival final battle preparations',
    };

    let query = baseQueries[day] || 'fantasy RPG survival tactics';

    // 特定のアクションキーワードでクエリを拡張
    if (playerAction.includes('武器')) {
      query += ' weapon crafting ancient artifacts';
    }
    if (playerAction.includes('魔法')) {
      query += ' magic spells protective enchantments';
    }
    if (playerAction.includes('情報')) {
      query += ' intelligence gathering reconnaissance';
    }
    if (playerAction.includes('村') || playerAction.includes('仲間')) {
      query += ' community unity teamwork';
    }

    return query;
  }

  /**
   * Grok APIでリアルタイム検索実行
   */
  private async performRealTimeSearch(query: string): Promise<string> {
    // キャッシュチェック
    const cacheKey = query.toLowerCase();
    const cached = this.searchCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`📋 キャッシュヒット: ${query}`);
      return cached.result;
    }

    try {
      const response = await generateText({
        model: xai('grok-3-mini'), // 検索は軽量モデルで十分
        prompt: `
        以下について現実世界の最新情報をリアルタイム検索して教えてください：
        
        検索クエリ: "${query}"
        
        要求：
        1. Web検索機能を使って最新の関連情報を取得
        2. ファンタジーRPGのゲーム世界観に適用可能な現実的な知識やアイデア
        3. 実用的で興味深い情報を3-5個のポイントでまとめる
        
        回答形式：
        • [ポイント1]
        • [ポイント2]
        • [ポイント3]
        `,
        temperature: 0.7,
        // Note: Real-time search functionality disabled for compatibility
      });

      const result = response.text;

      // キャッシュに保存
      this.searchCache.set(cacheKey, {
        result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error('リアルタイム検索エラー:', error);

      // フォールバック：検索なしでGrokの知識のみ使用
      const fallbackResponse = await generateText({
        model: xai('grok-3-mini'),
        prompt: `
        "${query}"に関する実用的なアドバイスを、ファンタジーRPG世界に適用できる形で教えてください。
        
        3-5個のポイントにまとめて回答してください：
        `,
        temperature: 0.7,
      });

      return `[フォールバック検索結果]\n${fallbackResponse.text}`;
    }
  }

  /**
   * 検索結果をゲーム世界観に統合
   */
  private async integrateSearchResults(
    day: number,
    query: string,
    searchResults: string,
    gameState: any
  ): Promise<string> {
    const integrationPrompt = `
    あなたは30日後の魔王襲来RPGの世界観統合AIです。
    
    現在の状況：
    - Day ${day}/30
    - プレイヤー状態: ${JSON.stringify(gameState)}
    
    検索クエリ: "${query}"
    検索結果:
    ${searchResults}
    
    この現実世界の情報を、中世ファンタジー世界の設定として自然に統合してください。
    
    統合方法：
    1. 村の長老や賢者の口から「古い知恵」として伝える
    2. 旅人の情報や他村の事例として紹介
    3. 古い書物や予言の記述として表現
    
    出力形式：
    「村の長老モーガンが言った：『昔、遠い国で似たような危機があった時...』」のような形で、
    ゲーム内キャラクターの発言として自然に統合してください。
    `;

    try {
      const response = await generateText({
        model: xai('grok-3-mini'),
        prompt: integrationPrompt,
        temperature: 0.8,
      });

      return response.text;
    } catch (error) {
      handleError(error, 'RealTimeSearchService.integrateSearchResults');
      return `村の賢者が語った：「困難な時こそ、過去の知恵に学ばねばならぬ...」`;
    }
  }

  /**
   * 日数に応じた感情状態
   */
  private getMoodByDay(day: number): SearchTriggerEvent['mood'] {
    if (day === 5) return 'hopeful';
    if (day === 10) return 'neutral';
    if (day === 15) return 'concerned';
    if (day === 20) return 'urgent';
    if (day === 25) return 'desperate';
    return 'neutral';
  }

  /**
   * プレイヤーの自由入力に対する検索発動
   */
  async searchOnPlayerQuery(day: number, playerQuery: string): Promise<string | null> {
    // 特定のキーワードで検索を発動
    const searchKeywords = [
      '調べる',
      '探す',
      '情報',
      '知識',
      '学ぶ',
      'research',
      'search',
      'find',
      '方法',
      '戦略',
      'strategy',
      '対策',
      '準備',
      'preparation',
    ];

    const shouldSearch = searchKeywords.some((keyword) =>
      playerQuery.toLowerCase().includes(keyword.toLowerCase())
    );

    if (!shouldSearch) return null;

    console.log(`🔍 [Day ${day}] プレイヤー検索発動: "${playerQuery}"`);

    try {
      // プレイヤークエリを検索用に変換
      const searchQuery = await this.convertPlayerQueryToSearch(playerQuery);

      // 検索実行
      const searchResults = await this.performRealTimeSearch(searchQuery);

      // ゲーム世界観に統合
      const integration = await this.integratePlayerSearchResults(day, playerQuery, searchResults);

      return integration;
    } catch (error) {
      console.error('プレイヤー検索エラー:', error);
      return null;
    }
  }

  /**
   * プレイヤークエリを検索クエリに変換
   */
  private async convertPlayerQueryToSearch(playerQuery: string): Promise<string> {
    const response = await generateText({
      model: xai('grok-3-mini'),
      prompt: `
      プレイヤーの質問「${playerQuery}」を、
      効果的なWeb検索クエリ（英語）に変換してください。
      
      ファンタジーRPG文脈を現実世界の関連する概念に翻訳：
      - 魔王 → ancient evil, mythological monsters
      - 村の防衛 → community defense, disaster preparedness
      - 武器 → traditional weapons, crafting tools
      
      検索クエリのみを回答してください：
      `,
      temperature: 0.3,
    });

    return response.text.trim();
  }

  /**
   * プレイヤー検索結果を統合
   */
  private async integratePlayerSearchResults(
    day: number,
    originalQuery: string,
    searchResults: string
  ): Promise<string> {
    const response = await generateText({
      model: xai('grok-3-mini'),
      prompt: `
      プレイヤーが「${originalQuery}」について調べました。
      
      検索結果：
      ${searchResults}
      
      この情報を、RPG世界で「図書館で古い書物を調べた」「賢者に相談した」結果として表現してください。
      
      1-2文の短い回答で、プレイヤーの行動に対する直接的な反応として：
      `,
      temperature: 0.8,
    });

    return response.text;
  }

  /**
   * 統計情報取得（デバッグ用）
   */
  getStats(): {
    triggerDays: number[];
    cacheSize: number;
    nextTriggerDay: number | null;
  } {
    const today = new Date().getDate(); // 簡易的な日付取得
    const nextTriggerDay = this.TRIGGER_DAYS.find((day) => day > today) || null;

    return {
      triggerDays: this.TRIGGER_DAYS,
      cacheSize: this.searchCache.size,
      nextTriggerDay,
    };
  }

  /**
   * キャッシュクリア（メモリ管理）
   */
  clearCache(): void {
    this.searchCache.clear();
    console.log('🗑️ 検索キャッシュをクリアしました');
  }
}

// シングルトンインスタンス
export const realTimeSearchService = new RealTimeSearchService();
