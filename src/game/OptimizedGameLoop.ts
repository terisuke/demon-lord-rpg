// src/game/OptimizedGameLoop.ts - Performance optimized game loop with G/role/reputation features
import { GameLoop } from './GameLoop';
import { GrokService } from '../services/GrokService';
import { AIVISEnhancedService } from '../services/AIVISEnhancedService';
import { RealTimeSearchService } from '../services/RealTimeSearchService';
import { generateSceneImage } from '../features/imageGeneration';
import { GAME_CONFIG } from '../config/gameConfig';
import type { GameState, PlayerRole, PlayerStats, EndingType } from '@/types';

interface OptimizedGameResponse {
  day: number;
  narrative: string;
  imageUrl: string | null;
  audioBuffer: ArrayBuffer | null;
  choices: string[];
  gameOver: boolean;
  specialEvent?: string;
  searchResult?: any;
  playerStats: PlayerStats;
  reputationChange: number;
  goldChange: number;
  performanceMetrics: PerformanceMetrics;
}

interface PerformanceMetrics {
  narrativeGenTime: number;
  imageGenTime: number;
  audioGenTime: number;
  searchTime: number;
  totalTime: number;
  parallelOperations: number;
}

interface ActionEffects {
  reputation: number;
  gold: number;
  strength?: number;
  knowledge?: number;
  health?: number;
  flags: Record<string, boolean>;
  risk?: 'low' | 'medium' | 'high';
}

export class OptimizedGameLoop extends GameLoop {
  private aivis: AIVISEnhancedService;
  private searchService: RealTimeSearchService;
  private performanceHistory: PerformanceMetrics[] = [];
  private actionHistory: string[] = [];
  
  // Advanced game state with detailed tracking
  private enhancedGameState: GameState = {
    currentDay: 1,
    playerRole: 'hero',
    playerName: 'プレイヤー',
    location: '始まりの村アルファ',
    playerStats: {
      level: 1,
      health: 100,
      strength: 20,
      knowledge: 20,
      reputation: 0,
      wealth: 100,
      allies: []
    },
    inventory: [],
    gameFlags: {},
    npcRelationships: {}
  };

  // Comprehensive action effects system
  private readonly actionEffectsMap: Record<string, ActionEffects> = {
    // Positive reputation actions
    '村長と相談': { reputation: 10, gold: 0, knowledge: 5, flags: { talked_to_elder: true }, risk: 'low' },
    '村人を助ける': { reputation: 15, gold: -5, strength: 2, flags: { helped_villagers: true }, risk: 'low' },
    '情報を集める': { reputation: 5, gold: -2, knowledge: 10, flags: { gathered_info: true }, risk: 'low' },
    '武器を探す': { reputation: 0, gold: -10, strength: 5, flags: { searched_weapons: true }, risk: 'medium' },
    '訓練を積む': { reputation: 5, gold: -5, strength: 8, flags: { trained: true }, risk: 'low' },
    '仲間を探す': { reputation: 8, gold: -15, flags: { sought_allies: true }, risk: 'medium' },
    
    // Negative reputation actions (traitor/coward paths)
    '物資を盗む': { reputation: -20, gold: 30, flags: { committed_theft: true }, risk: 'high' },
    '嘘の情報を流す': { reputation: -15, gold: 10, knowledge: 5, flags: { spread_misinformation: true }, risk: 'high' },
    '村から逃げる': { reputation: -25, gold: -20, flags: { attempted_escape: true }, risk: 'medium' },
    '魔王と内通する': { reputation: -50, gold: 100, flags: { betrayed_village: true }, risk: 'high' },
    '賭博をする': { reputation: -10, gold: 20, flags: { gambled: true }, risk: 'high' }, // Can lose money too
    '密売を行う': { reputation: -15, gold: 50, flags: { black_market: true }, risk: 'high' },
    
    // Merchant specific actions
    '商品を売る': { reputation: 5, gold: 25, flags: { trading_active: true }, risk: 'low' },
    '価格を操作する': { reputation: -8, gold: 40, flags: { price_manipulation: true }, risk: 'medium' },
    '独占を図る': { reputation: -12, gold: 60, flags: { monopoly_attempt: true }, risk: 'high' },
    
    // Role-specific bonus actions
    '魔法を研究': { reputation: 2, gold: -8, knowledge: 15, flags: { magic_research: true }, risk: 'low' },
    '傭兵を雇う': { reputation: -5, gold: -80, strength: 12, flags: { hired_mercenaries: true }, risk: 'medium' },
    '秘密を売る': { reputation: -18, gold: 45, knowledge: 8, flags: { sold_secrets: true }, risk: 'high' }
  };

  constructor() {
    super();
    this.aivis = new AIVISEnhancedService();
    this.searchService = new RealTimeSearchService();
    
    console.log("🚀 OptimizedGameLoop initialized with parallel processing");
  }

  /**
   * Process player action with parallel optimization and comprehensive effects
   */
  async processPlayerAction(action: string): Promise<OptimizedGameResponse> {
    const startTime = Date.now();
    console.log(`[Day ${this.enhancedGameState.currentDay}] Processing: ${action}`);

    // Track action history for search service
    this.actionHistory.push(action);
    if (this.actionHistory.length > 10) {
      this.actionHistory.shift(); // Keep only recent 10 actions
    }

    // Calculate action effects before processing
    const effects = this.calculateActionEffects(action);
    const oldStats = { ...this.enhancedGameState.playerStats };

    // Parallel processing using Promise.all for performance optimization
    const [
      specialEvent,
      narrative,
      searchResult
    ] = await Promise.all([
      // Task 1: Check special events
      GrokService.checkForSpecialEvent(this.enhancedGameState.currentDay, this.enhancedGameState),
      
      // Task 2: Generate narrative (most expensive operation)
      this.generateEnhancedNarrative(action, effects),
      
      // Task 3: Trigger search if applicable
      this.searchService.shouldTriggerSearchOnDay(this.enhancedGameState.currentDay) 
        ? this.searchService.triggerSearchOnDay(
            this.enhancedGameState.currentDay, 
            this.enhancedGameState, 
            this.actionHistory
          )
        : null
    ]);

    const narrativeTime = Date.now();

    // Second parallel batch for media generation
    const [
      imageUrl,
      audioBuffer,
      choices
    ] = await Promise.all([
      // Task 4: Generate image for important days
      GAME_CONFIG.IMAGE_GENERATION_DAYS.includes(this.enhancedGameState.currentDay)
        ? generateSceneImage(narrative, this.enhancedGameState.currentDay)
        : null,
      
      // Task 5: Generate audio narration
      this.aivis.synthesizeNarration(
        narrative, 
        'narrator', 
        this.enhancedGameState
      ),
      
      // Task 6: Generate choices
      this.generateEnhancedChoices(narrative, effects)
    ]);

    const mediaTime = Date.now();

    // Apply action effects to game state
    this.applyActionEffects(action, effects);
    this.advanceDay();

    const endTime = Date.now();

    // Performance metrics
    const metrics: PerformanceMetrics = {
      narrativeGenTime: narrativeTime - startTime,
      imageGenTime: imageUrl ? (mediaTime - narrativeTime) / 3 : 0,
      audioGenTime: audioBuffer ? (mediaTime - narrativeTime) / 3 : 0,
      searchTime: searchResult ? (narrativeTime - startTime) / 3 : 0,
      totalTime: endTime - startTime,
      parallelOperations: 6
    };

    this.performanceHistory.push(metrics);

    const reputationChange = this.enhancedGameState.playerStats.reputation - oldStats.reputation;
    const goldChange = this.enhancedGameState.playerStats.wealth - oldStats.wealth;

    console.log(`⚡ Processed in ${metrics.totalTime}ms (${metrics.parallelOperations} parallel ops)`);
    console.log(`📊 Rep: ${reputationChange >= 0 ? '+' : ''}${reputationChange}, Gold: ${goldChange >= 0 ? '+' : ''}${goldChange}G`);

    return {
      day: this.enhancedGameState.currentDay - 1,
      narrative: this.combineNarrativeWithSearch(narrative, specialEvent, searchResult),
      imageUrl,
      audioBuffer,
      choices,
      gameOver: this.enhancedGameState.currentDay > GAME_CONFIG.MAX_DAYS,
      specialEvent: specialEvent || undefined,
      searchResult,
      playerStats: { ...this.enhancedGameState.playerStats },
      reputationChange,
      goldChange,
      performanceMetrics: metrics
    };
  }

  /**
   * Calculate comprehensive action effects including risks
   */
  private calculateActionEffects(action: string): ActionEffects {
    // Direct match first
    if (this.actionEffectsMap[action]) {
      return { ...this.actionEffectsMap[action] };
    }

    // Pattern matching for flexible actions
    const effects: ActionEffects = { reputation: 0, gold: 0, flags: {}, risk: 'low' };

    // Positive keywords
    if (action.includes('助け') || action.includes('支援')) {
      effects.reputation = 12;
      effects.gold = -8;
      effects.flags.helped_someone = true;
    } else if (action.includes('学ぶ') || action.includes('研究')) {
      effects.knowledge = 8;
      effects.gold = -5;
      effects.flags.studied = true;
    } else if (action.includes('鍛える') || action.includes('練習')) {
      effects.strength = 6;
      effects.gold = -3;
      effects.flags.trained = true;
    }

    // Negative keywords  
    else if (action.includes('騙') || action.includes('詐欺')) {
      effects.reputation = -25;
      effects.gold = 35;
      effects.flags.fraud = true;
      effects.risk = 'high';
    } else if (action.includes('盗') || action.includes('強奪')) {
      effects.reputation = -20;
      effects.gold = Math.random() > 0.5 ? 40 : -10; // Risk of getting caught
      effects.flags.theft_attempt = true;
      effects.risk = 'high';
    } else if (action.includes('脅') || action.includes('恐喝')) {
      effects.reputation = -30;
      effects.gold = 25;
      effects.flags.extortion = true;
      effects.risk = 'high';
    }

    // Role-based modifiers
    const roleMultiplier = this.getRoleMultiplier();
    effects.reputation = Math.floor(effects.reputation * roleMultiplier.reputation);
    effects.gold = Math.floor(effects.gold * roleMultiplier.wealth);

    return effects;
  }

  /**
   * Get role-based multipliers for different stats
   */
  private getRoleMultiplier() {
    const multipliers = {
      hero: { reputation: 1.5, wealth: 0.8, strength: 1.3 },
      merchant: { reputation: 0.7, wealth: 1.8, knowledge: 1.2 },
      coward: { reputation: 0.9, wealth: 1.0, strength: 0.6 },
      traitor: { reputation: 0.3, wealth: 1.4, knowledge: 1.3 },
      sage: { reputation: 1.2, wealth: 0.6, knowledge: 1.8 },
      mercenary: { reputation: 0.8, wealth: 1.3, strength: 1.5 },
      villager: { reputation: 1.0, wealth: 1.0, strength: 1.0 }
    };

    return multipliers[this.enhancedGameState.playerRole] || multipliers.villager;
  }

  /**
   * Apply calculated effects to game state with risk processing
   */
  private applyActionEffects(action: string, effects: ActionEffects): void {
    const stats = this.enhancedGameState.playerStats;
    
    // Apply basic stat changes
    stats.reputation += effects.reputation;
    stats.wealth += effects.gold;
    stats.strength = Math.min(100, (stats.strength || 0) + (effects.strength || 0));
    stats.knowledge = Math.min(100, (stats.knowledge || 0) + (effects.knowledge || 0));
    stats.health = Math.max(0, Math.min(100, (stats.health || 100) + (effects.health || 0)));

    // Process risk-based consequences
    if (effects.risk === 'high' && Math.random() < 0.3) {
      // 30% chance of additional negative consequences for high-risk actions
      stats.reputation -= 10;
      stats.wealth -= 20;
      this.enhancedGameState.gameFlags.caught_in_act = true;
      console.log("⚠️ 高リスク行動により追加の悪影響が発生！");
    } else if (effects.risk === 'medium' && Math.random() < 0.15) {
      // 15% chance for medium risk
      stats.reputation -= 5;
      console.log("⚠️ 中リスク行動により軽微な悪影響が発生");
    }

    // Apply flags
    Object.assign(this.enhancedGameState.gameFlags, effects.flags);

    // Reputation boundaries
    stats.reputation = Math.max(-100, Math.min(100, stats.reputation));
    stats.wealth = Math.max(0, stats.wealth);

    // Level progression based on total growth
    const totalGrowth = (stats.strength || 0) + (stats.knowledge || 0) + Math.abs(stats.reputation);
    const newLevel = Math.floor(totalGrowth / 50) + 1;
    if (newLevel > stats.level) {
      stats.level = newLevel;
      console.log(`🎉 レベルアップ！ Lv.${stats.level}`);
    }
  }

  /**
   * Generate enhanced narrative with context awareness
   */
  private async generateEnhancedNarrative(action: string, effects: ActionEffects): Promise<string> {
    // Enhanced prompt with effect information
    const effectsContext = `
予想される結果: 評判${effects.reputation >= 0 ? '+' : ''}${effects.reputation}, 金${effects.gold >= 0 ? '+' : ''}${effects.gold}G, リスク: ${effects.risk}
フラグ: ${Object.keys(effects.flags).join(', ') || 'なし'}`;

    const enhancedGameState = {
      ...this.enhancedGameState,
      effectsContext
    };

    return await GrokService.generateNarrative(
      this.enhancedGameState.currentDay,
      action,
      enhancedGameState
    );
  }

  /**
   * Generate enhanced choices based on current state and effects
   */
  private async generateEnhancedChoices(narrative: string, lastEffects: ActionEffects): Promise<string[]> {
    const choices = await GrokService.generateChoices(
      this.enhancedGameState.currentDay,
      narrative,
      this.enhancedGameState
    );

    // Add role-specific choices if reputation is very low (traitor path)
    if (this.enhancedGameState.playerStats.reputation < -30) {
      const darkChoices = ['裏切りを企てる', '秘密を売る', '夜逃げを計画'];
      choices.push(darkChoices[Math.floor(Math.random() * darkChoices.length)]);
    }

    // Add wealth-based choices for merchants
    if (this.enhancedGameState.playerRole === 'merchant' && this.enhancedGameState.playerStats.wealth > 200) {
      choices.push('大規模投資を行う');
    }

    return choices.slice(0, 4); // Keep maximum 4 choices
  }

  /**
   * Combine narrative with search results seamlessly
   */
  private combineNarrativeWithSearch(narrative: string, specialEvent?: string | null, searchResult?: any): string {
    let combined = narrative;
    
    if (specialEvent) {
      combined = `【特別イベント】\n${specialEvent}\n\n${combined}`;
    }
    
    if (searchResult?.gameIntegration) {
      combined += `\n\n${searchResult.gameIntegration}`;
    }
    
    return combined;
  }

  /**
   * Get performance analytics
   */
  getPerformanceAnalytics(): {
    averageResponseTime: number;
    totalParallelOps: number;
    fastestResponse: number;
    slowestResponse: number;
  } {
    if (this.performanceHistory.length === 0) {
      return { averageResponseTime: 0, totalParallelOps: 0, fastestResponse: 0, slowestResponse: 0 };
    }

    const times = this.performanceHistory.map(m => m.totalTime);
    const totalOps = this.performanceHistory.reduce((sum, m) => sum + m.parallelOperations, 0);

    return {
      averageResponseTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      totalParallelOps: totalOps,
      fastestResponse: Math.min(...times),
      slowestResponse: Math.max(...times)
    };
  }

  /**
   * Advanced ending determination with comprehensive state analysis
   */
  protected determineEnding(): EndingType {
    const { playerStats, gameFlags, playerRole } = this.enhancedGameState;
    const { reputation, wealth, strength, knowledge } = playerStats;

    // Perfect Victory: High stats across the board
    if (reputation > 70 && strength > 40 && knowledge > 35 && gameFlags.found_weapon) {
      return "PERFECT_VICTORY";
    }
    
    // Costly Victory: Won but with sacrifices
    if ((reputation > 30 && strength > 30) || (gameFlags.hired_mercenaries && wealth > 100)) {
      return "COSTLY_VICTORY";
    }
    
    // Betrayal Success: Traitor path completion
    if (reputation < -40 && gameFlags.betrayed_village && wealth > 150) {
      return "BETRAYAL_SUCCESS";
    }
    
    // Merchant Success: Economic victory
    if (playerRole === 'merchant' && wealth > 500 && reputation > 0) {
      return "MERCHANT_SUCCESS";
    }
    
    // Escape Success: Successful coward
    if (gameFlags.attempted_escape && wealth > 50 && !gameFlags.caught_in_act) {
      return "ESCAPE_SUCCESS";
    }
    
    // Tactical Retreat: Strategic withdrawal
    if (reputation > 0 && knowledge > 30 && gameFlags.gathered_info) {
      return "TACTICAL_RETREAT";
    }
    
    // Unexpected Peace: Diplomatic solution
    if (reputation > 50 && knowledge > 40 && playerRole === 'sage') {
      return "UNEXPECTED_PEACE";
    }
    
    // Default: Devastating defeat
    return "DEVASTATING_DEFEAT";
  }

  /**
   * Get current enhanced game state
   */
  get enhancedGameStateData(): GameState {
    return { ...this.enhancedGameState };
  }

  /**
   * Batch process multiple actions (useful for AI simulations)
   */
  async batchProcessActions(actions: string[]): Promise<OptimizedGameResponse[]> {
    const results: OptimizedGameResponse[] = [];
    
    for (const action of actions) {
      const result = await this.processPlayerAction(action);
      results.push(result);
      
      if (result.gameOver) break;
    }
    
    return results;
  }
}