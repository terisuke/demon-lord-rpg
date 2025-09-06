// src/services/RealTimeSearchService.ts - Real-time search integration service
import { generateText } from 'ai';
import { xai } from '@ai-sdk/xai';
import { GAME_CONFIG } from '../config/gameConfig';
import { AIError, handleError } from '../utils/errorHandler';
import type { GameState, PlayerRole } from '@/types';

export interface SearchResult {
  query: string;
  results: SearchItem[];
  relevanceScore: number;
  gameIntegration: string;
}

export interface SearchItem {
  title: string;
  snippet: string;
  url?: string;
  relevance: 'high' | 'medium' | 'low';
}

export interface SearchTrigger {
  day: number;
  context: string;
  playerRole: PlayerRole;
  autoTrigger: boolean;
}

export class RealTimeSearchService {
  private readonly searchTriggerDays = [5, 10, 15, 20, 25];
  private readonly apiKey: string;
  private isEnabled: boolean;
  
  // Cache for search results to prevent duplicate searches
  private searchCache = new Map<string, SearchResult>();
  private dailySearchCount = new Map<number, number>();

  constructor() {
    this.apiKey = process.env.XAI_API_KEY || '';
    this.isEnabled = !!this.apiKey;
    
    if (!this.isEnabled) {
      console.log("🔍 リアルタイム検索機能は無効です（APIキー未設定）");
    }
  }

  /**
   * Check if search should be triggered on specific day
   */
  shouldTriggerSearchOnDay(day: number): boolean {
    return this.searchTriggerDays.includes(day) && this.isEnabled;
  }

  /**
   * Generate search query based on player action and game state
   */
  private async generateSearchQuery(
    playerAction: string,
    gameState: GameState,
    context?: string
  ): Promise<string> {
    const prompt = `
あなたはプレイヤーの行動を分析して関連する検索クエリを生成するAIです。

【ゲーム状況】
- 現在: Day ${gameState.currentDay}/30
- プレイヤー役割: ${gameState.playerRole}
- プレイヤー行動: "${playerAction}"
- 追加コンテキスト: ${context || 'なし'}

【指示】
プレイヤーの行動に関連する現実的な検索クエリを1つ生成してください。
- 15文字以内
- 実際にWeb検索で有用な結果が得られそうなクエリ
- ゲーム内容に関連性があるもの

例：
- 「武器を探す」→ "中世 武器 種類"
- 「魔法を学ぶ」→ "魔法 歴史 文化"
- 「商売を始める」→ "中世 商人 貿易"

検索クエリのみを返してください。他のテキストは不要です。
`;

    try {
      const { text } = await generateText({
        model: xai(GAME_CONFIG.MODELS.CHOICES || 'grok-4'),
        prompt,
        temperature: 0.5,
        maxTokens: 50,
      });

      return text.trim().replace(/["']/g, '');
    } catch (error) {
      console.error('検索クエリ生成エラー:', error);
      // Fallback queries based on common actions
      const fallbackQueries = {
        '武器': '中世 武器 剣',
        '魔法': '魔法 呪文 歴史',
        '商売': '中世 商人 貿易',
        '情報': '中世 戦術 戦略',
        '仲間': '中世 騎士 同盟',
        '準備': '戦争 準備 計画'
      };
      
      for (const [key, query] of Object.entries(fallbackQueries)) {
        if (playerAction.includes(key)) {
          return query;
        }
      }
      
      return '中世 RPG 戦略';
    }
  }

  /**
   * Simulate web search (mock implementation for demo)
   */
  private async performSearch(query: string): Promise<SearchItem[]> {
    // In a real implementation, this would call actual search APIs
    // For now, we'll simulate realistic search results
    const mockResults: SearchItem[] = [
      {
        title: `${query}に関する包括的ガイド`,
        snippet: `${query}について詳しく説明します。歴史的背景から現代への影響まで幅広くカバー。`,
        relevance: 'high'
      },
      {
        title: `${query}の実践的活用法`,
        snippet: `実際の${query}の使用例と効果的な活用方法を専門家が解説。`,
        relevance: 'medium'
      },
      {
        title: `${query}関連の最新情報`,
        snippet: `${query}に関する最新の研究結果と動向をまとめて紹介。`,
        relevance: 'medium'
      }
    ];

    return mockResults;
  }

  /**
   * Integrate search results into game narrative
   */
  private async integrateSearchResults(
    searchResults: SearchItem[],
    gameState: GameState,
    originalQuery: string
  ): Promise<string> {
    const prompt = `
あなたはRPGゲームで検索結果をゲーム世界に自然に統合するAIです。

【ゲーム状況】
- Day ${gameState.currentDay}/30（魔王襲来まで）
- プレイヤー役割: ${gameState.playerRole}
- 検索クエリ: "${originalQuery}"

【検索結果】
${searchResults.map((result, i) => 
  `${i + 1}. ${result.title}: ${result.snippet}`
).join('\n')}

【指示】
これらの検索結果をゲーム世界の知識として自然に統合してください：
- 村の賢者や図書館からの情報として表現
- プレイヤーの役割に適した情報源を設定
- 2-3文で簡潔に
- 現実味のある情報として提示

例：「村の図書館で古い巻物を発見した。そこには〜についての貴重な知識が記されていた。」
`;

    try {
      const { text } = await generateText({
        model: xai(GAME_CONFIG.MODELS.NARRATIVE || 'grok-4'),
        prompt,
        temperature: 0.7,
        maxTokens: 150,
      });

      return text.trim();
    } catch (error) {
      console.error('検索結果統合エラー:', error);
      return `村で${originalQuery}に関する有益な情報を入手した。これは今後の行動に役立つかもしれない。`;
    }
  }

  /**
   * Trigger search automatically on specific days
   */
  async triggerSearchOnDay(
    day: number,
    gameState: GameState,
    recentActions: string[]
  ): Promise<SearchResult | null> {
    if (!this.shouldTriggerSearchOnDay(day)) {
      return null;
    }

    // Limit searches per day
    const dailyCount = this.dailySearchCount.get(day) || 0;
    if (dailyCount >= 3) {
      console.log(`Day ${day}: 検索制限に達しました`);
      return null;
    }

    try {
      // Use most recent significant action for search
      const significantAction = recentActions.find(action => 
        action.length > 10 && !action.includes('休息')
      ) || recentActions[0] || '情報を集める';

      const query = await this.generateSearchQuery(
        significantAction,
        gameState,
        `Day ${day}の自動検索`
      );

      // Check cache
      const cacheKey = `${day}-${query}`;
      if (this.searchCache.has(cacheKey)) {
        return this.searchCache.get(cacheKey)!;
      }

      const searchResults = await this.performSearch(query);
      const gameIntegration = await this.integrateSearchResults(
        searchResults,
        gameState,
        query
      );

      const result: SearchResult = {
        query,
        results: searchResults,
        relevanceScore: this.calculateRelevance(searchResults, gameState),
        gameIntegration
      };

      // Cache and update counters
      this.searchCache.set(cacheKey, result);
      this.dailySearchCount.set(day, dailyCount + 1);

      console.log(`🔍 Day ${day} 自動検索完了: ${query}`);
      return result;

    } catch (error) {
      console.error(`Day ${day} 自動検索エラー:`, handleError(error, 'triggerSearchOnDay'));
      return null;
    }
  }

  /**
   * Search based on specific player query/action
   */
  async searchOnPlayerQuery(
    playerQuery: string,
    gameState: GameState
  ): Promise<SearchResult | null> {
    if (!this.isEnabled) {
      console.log("🔍 検索機能が無効です");
      return null;
    }

    try {
      const query = await this.generateSearchQuery(playerQuery, gameState);
      const cacheKey = `player-${gameState.currentDay}-${query}`;
      
      if (this.searchCache.has(cacheKey)) {
        return this.searchCache.get(cacheKey)!;
      }

      const searchResults = await this.performSearch(query);
      const gameIntegration = await this.integrateSearchResults(
        searchResults,
        gameState,
        query
      );

      const result: SearchResult = {
        query,
        results: searchResults,
        relevanceScore: this.calculateRelevance(searchResults, gameState),
        gameIntegration
      };

      this.searchCache.set(cacheKey, result);
      console.log(`🔍 プレイヤー検索完了: ${query}`);
      
      return result;

    } catch (error) {
      console.error('プレイヤー検索エラー:', handleError(error, 'searchOnPlayerQuery'));
      return null;
    }
  }

  /**
   * Calculate relevance score based on game state
   */
  private calculateRelevance(searchResults: SearchItem[], gameState: GameState): number {
    let score = 0;
    const dayWeight = Math.min(gameState.currentDay / 30, 1); // Later days are more important
    const roleWeight = gameState.playerRole === 'sage' ? 1.2 : 1.0; // Sage gets bonus

    searchResults.forEach(result => {
      switch (result.relevance) {
        case 'high': score += 3; break;
        case 'medium': score += 2; break;
        case 'low': score += 1; break;
      }
    });

    return Math.min(score * dayWeight * roleWeight, 10);
  }

  /**
   * Get search statistics
   */
  getSearchStats(): { totalSearches: number; dailyBreakdown: Record<number, number> } {
    const totalSearches = Array.from(this.dailySearchCount.values()).reduce((sum, count) => sum + count, 0);
    const dailyBreakdown = Object.fromEntries(this.dailySearchCount);
    
    return { totalSearches, dailyBreakdown };
  }

  /**
   * Clear search cache (useful for testing)
   */
  clearCache(): void {
    this.searchCache.clear();
    this.dailySearchCount.clear();
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.isEnabled;
  }

  /**
   * Get trigger days for searches
   */
  getTriggerDays(): number[] {
    return [...this.searchTriggerDays];
  }
}

// Export singleton instance
export const realTimeSearchService = new RealTimeSearchService();