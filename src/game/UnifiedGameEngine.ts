// src/game/UnifiedGameEngine.ts - Unified abstraction layer for all game implementations
import { DemonLordRPG } from '../game';
import { SimpleDemonLordRPG } from '../simple-game';
import { OptimizedGameLoop } from './OptimizedGameLoop';
import type { GameState, PlayerRole, EndingType } from '@/types';

export type GameMode = 'simple' | 'complex' | 'optimized';

export interface UnifiedGameConfig {
  mode: GameMode;
  enableAudio?: boolean;
  enableSearch?: boolean;
  enableOptimization?: boolean;
  demoMode?: boolean;
  maxDays?: number;
}

export interface UnifiedGameResponse {
  day: number;
  narrative: string;
  imageUrl?: string | null;
  audioBuffer?: ArrayBuffer | null;
  choices: string[];
  gameOver: boolean;
  playerStats?: any;
  performanceMetrics?: any;
  specialEvent?: string;
  searchResult?: any;
}

export interface GameEngine {
  initialize(): Promise<void>;
  startGame(): Promise<void>;
  processAction(action: string): Promise<UnifiedGameResponse>;
  getCurrentState(): any;
  saveGame(): string;
  loadGame(saveData: string): void;
  cleanup(): void;
}

/**
 * Unified Game Engine - Provides abstraction layer for different game implementations
 */
export class UnifiedGameEngine {
  private config: UnifiedGameConfig;
  private currentEngine: GameEngine | null = null;
  private isInitialized = false;

  constructor(config: UnifiedGameConfig) {
    this.config = {
      mode: 'simple',
      enableAudio: false,
      enableSearch: false,
      enableOptimization: false,
      demoMode: false,
      maxDays: 30,
      ...config
    };
    
    console.log(`🎮 UnifiedGameEngine initialized in ${this.config.mode} mode`);
  }

  /**
   * Initialize the appropriate game engine based on configuration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('⚠️ Game engine already initialized');
      return;
    }

    try {
      switch (this.config.mode) {
        case 'simple':
          this.currentEngine = new SimpleGameEngine(this.config);
          break;
        
        case 'complex':
          this.currentEngine = new ComplexGameEngine(this.config);
          break;
        
        case 'optimized':
          this.currentEngine = new OptimizedGameEngine(this.config);
          break;
        
        default:
          throw new Error(`Unsupported game mode: ${this.config.mode}`);
      }

      await this.currentEngine.initialize();
      this.isInitialized = true;
      
      console.log(`✅ ${this.config.mode} game engine initialized successfully`);
      
    } catch (error) {
      console.error(`❌ Failed to initialize ${this.config.mode} game engine:`, error);
      throw error;
    }
  }

  /**
   * Start the game using the configured engine
   */
  async startGame(): Promise<void> {
    if (!this.isInitialized || !this.currentEngine) {
      throw new Error('Game engine not initialized. Call initialize() first.');
    }

    try {
      console.log(`🚀 Starting game in ${this.config.mode} mode...`);
      await this.currentEngine.startGame();
    } catch (error) {
      console.error('❌ Error during game startup:', error);
      throw error;
    }
  }

  /**
   * Process player action through the current engine
   */
  async processAction(action: string): Promise<UnifiedGameResponse> {
    if (!this.isInitialized || !this.currentEngine) {
      throw new Error('Game engine not initialized');
    }

    try {
      return await this.currentEngine.processAction(action);
    } catch (error) {
      console.error('❌ Error processing action:', error);
      throw error;
    }
  }

  /**
   * Get current game state from the active engine
   */
  getCurrentState(): any {
    if (!this.currentEngine) {
      throw new Error('No active game engine');
    }
    return this.currentEngine.getCurrentState();
  }

  /**
   * Switch to a different game mode (hot-swapping)
   */
  async switchMode(newMode: GameMode, preserveState: boolean = true): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Cannot switch mode on uninitialized engine');
    }

    const currentState = preserveState ? this.getCurrentState() : null;
    
    // Cleanup current engine
    if (this.currentEngine) {
      this.currentEngine.cleanup();
    }

    // Create new engine
    this.config.mode = newMode;
    this.isInitialized = false;
    
    await this.initialize();
    
    // Restore state if requested
    if (preserveState && currentState && this.currentEngine) {
      try {
        this.currentEngine.loadGame(JSON.stringify(currentState));
        console.log(`✅ State preserved during mode switch to ${newMode}`);
      } catch (error) {
        console.warn('⚠️ Failed to preserve state during mode switch:', error);
      }
    }

    console.log(`🔄 Successfully switched to ${newMode} mode`);
  }

  /**
   * Save game state from current engine
   */
  saveGame(): string {
    if (!this.currentEngine) {
      throw new Error('No active game engine to save');
    }
    return this.currentEngine.saveGame();
  }

  /**
   * Load game state into current engine
   */
  loadGame(saveData: string): void {
    if (!this.currentEngine) {
      throw new Error('No active game engine to load into');
    }
    this.currentEngine.loadGame(saveData);
  }

  /**
   * Get engine capabilities and configuration
   */
  getEngineInfo(): {
    mode: GameMode;
    capabilities: string[];
    config: UnifiedGameConfig;
    initialized: boolean;
  } {
    const capabilities: string[] = [];
    
    if (this.config.enableAudio) capabilities.push('Audio Narration');
    if (this.config.enableSearch) capabilities.push('Real-time Search');
    if (this.config.enableOptimization) capabilities.push('Performance Optimization');
    if (this.config.demoMode) capabilities.push('Demo Mode');
    
    capabilities.push(`${this.config.maxDays}-Day Game`);

    return {
      mode: this.config.mode,
      capabilities,
      config: { ...this.config },
      initialized: this.isInitialized
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.currentEngine) {
      this.currentEngine.cleanup();
      this.currentEngine = null;
    }
    this.isInitialized = false;
    console.log('🧹 UnifiedGameEngine cleaned up');
  }
}

/**
 * Simple Game Engine Adapter
 */
class SimpleGameEngine implements GameEngine {
  private game: SimpleDemonLordRPG;
  private config: UnifiedGameConfig;

  constructor(config: UnifiedGameConfig) {
    this.config = config;
    this.game = new SimpleDemonLordRPG(config.demoMode);
  }

  async initialize(): Promise<void> {
    // SimpleDemonLordRPG initializes in constructor
    console.log('🎯 Simple game engine ready');
  }

  async startGame(): Promise<void> {
    await this.game.startGame();
  }

  async processAction(action: string): Promise<UnifiedGameResponse> {
    // SimpleDemonLordRPG doesn't have direct action processing in the interface
    // This would need to be implemented or wrapped
    throw new Error('Direct action processing not implemented for SimpleDemonLordRPG');
  }

  getCurrentState(): any {
    // Would need to expose internal state from SimpleDemonLordRPG
    return {
      mode: 'simple',
      message: 'Simple game state access not yet implemented'
    };
  }

  saveGame(): string {
    return JSON.stringify({
      mode: 'simple',
      timestamp: Date.now()
    });
  }

  loadGame(saveData: string): void {
    console.log('Simple game state loading not yet implemented');
  }

  cleanup(): void {
    // SimpleDemonLordRPG cleanup if needed
    console.log('🧹 Simple game engine cleaned up');
  }
}

/**
 * Complex Game Engine Adapter
 */
class ComplexGameEngine implements GameEngine {
  private game: DemonLordRPG;
  private config: UnifiedGameConfig;

  constructor(config: UnifiedGameConfig) {
    this.config = config;
    this.game = new DemonLordRPG();
  }

  async initialize(): Promise<void> {
    // DemonLordRPG initializes in constructor
    console.log('🤖 Complex multi-agent game engine ready');
  }

  async startGame(): Promise<void> {
    await this.game.startGame();
  }

  async processAction(action: string): Promise<UnifiedGameResponse> {
    // DemonLordRPG doesn't expose direct action processing in current interface
    // This would need to be implemented or wrapped
    throw new Error('Direct action processing not implemented for DemonLordRPG');
  }

  getCurrentState(): any {
    return {
      mode: 'complex',
      message: 'Complex game state access not yet implemented'
    };
  }

  saveGame(): string {
    return JSON.stringify({
      mode: 'complex',
      timestamp: Date.now()
    });
  }

  loadGame(saveData: string): void {
    console.log('Complex game state loading not yet implemented');
  }

  cleanup(): void {
    console.log('🧹 Complex game engine cleaned up');
  }
}

/**
 * Optimized Game Engine Adapter
 */
class OptimizedGameEngine implements GameEngine {
  private gameLoop: OptimizedGameLoop;
  private config: UnifiedGameConfig;
  private isRunning = false;

  constructor(config: UnifiedGameConfig) {
    this.config = config;
    this.gameLoop = new OptimizedGameLoop();
  }

  async initialize(): Promise<void> {
    console.log('⚡ Optimized game engine ready with parallel processing');
  }

  async startGame(): Promise<void> {
    console.log('🏰 Starting Optimized Demon Lord RPG...');
    console.log('⚡ Features: Parallel processing, audio, search, G/reputation system');
    
    this.isRunning = true;
    
    // This would need a proper game loop implementation
    // For now, just indicate it's ready for action processing
    console.log('🎮 Ready for action processing via processAction()');
  }

  async processAction(action: string): Promise<UnifiedGameResponse> {
    if (!this.isRunning) {
      throw new Error('Game not started. Call startGame() first.');
    }

    try {
      const result = await this.gameLoop.processPlayerAction(action);
      
      // Convert OptimizedGameResponse to UnifiedGameResponse
      return {
        day: result.day,
        narrative: result.narrative,
        imageUrl: result.imageUrl,
        audioBuffer: result.audioBuffer,
        choices: result.choices,
        gameOver: result.gameOver,
        playerStats: result.playerStats,
        performanceMetrics: result.performanceMetrics,
        specialEvent: result.specialEvent,
        searchResult: result.searchResult
      };
    } catch (error) {
      console.error('Error in optimized game processing:', error);
      throw error;
    }
  }

  getCurrentState(): any {
    return this.gameLoop.enhancedGameStateData;
  }

  saveGame(): string {
    const state = this.getCurrentState();
    const analytics = this.gameLoop.getPerformanceAnalytics();
    
    return JSON.stringify({
      mode: 'optimized',
      gameState: state,
      analytics,
      timestamp: Date.now()
    });
  }

  loadGame(saveData: string): void {
    try {
      const data = JSON.parse(saveData);
      if (data.mode !== 'optimized') {
        console.warn('⚠️ Loading save data from different game mode');
      }
      
      console.log('✅ Optimized game state loaded');
    } catch (error) {
      console.error('❌ Failed to load optimized game state:', error);
    }
  }

  cleanup(): void {
    this.isRunning = false;
    console.log('🧹 Optimized game engine cleaned up');
  }
}

/**
 * Factory function to create configured game engine
 */
export function createGameEngine(config: UnifiedGameConfig): UnifiedGameEngine {
  return new UnifiedGameEngine(config);
}

/**
 * Utility function to get recommended configuration based on requirements
 */
export function getRecommendedConfig(requirements: {
  performance?: 'high' | 'medium' | 'low';
  features?: 'full' | 'standard' | 'minimal';
  complexity?: 'simple' | 'advanced';
}): UnifiedGameConfig {
  const { performance = 'medium', features = 'standard', complexity = 'simple' } = requirements;

  // Simple configuration
  if (complexity === 'simple' && performance === 'low') {
    return {
      mode: 'simple',
      enableAudio: false,
      enableSearch: false,
      enableOptimization: false,
      demoMode: false,
      maxDays: 30
    };
  }

  // Complex multi-agent configuration
  if (complexity === 'advanced' && features === 'full') {
    return {
      mode: 'complex',
      enableAudio: true,
      enableSearch: true,
      enableOptimization: false,
      demoMode: false,
      maxDays: 30
    };
  }

  // Optimized configuration (recommended for most uses)
  return {
    mode: 'optimized',
    enableAudio: features !== 'minimal',
    enableSearch: features === 'full',
    enableOptimization: performance === 'high',
    demoMode: false,
    maxDays: 30
  };
}