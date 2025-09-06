import { SimpleDemonLordRPG } from '../simple-game';
import { DemonLordRPG } from '../game';

/**
 * Unified Game Engine - Provides a single interface for different game implementations
 *
 * This engine allows switching between different game implementations:
 * - SimpleDemonLordRPG: Direct AI integration, simpler architecture
 * - DemonLordRPG: Volt Agent framework with multi-agent system
 */
export class UnifiedGameEngine {
  private gameMode: 'simple' | 'volt-agent' = 'simple';

  constructor(mode: 'simple' | 'volt-agent' = 'simple') {
    this.gameMode = mode;
  }

  /**
   * Start the game using the selected implementation
   */
  async startGame(options?: { demoMode?: boolean }): Promise<void> {
    console.log('🏰 30日後の魔王襲来 - Unified Game Engine');
    console.log(`🎮 Mode: ${this.gameMode}`);
    console.log('=====================================');

    try {
      switch (this.gameMode) {
        case 'simple': {
          console.log('🎯 Starting Simple Game Implementation...');
          const simpleGame = new SimpleDemonLordRPG(options?.demoMode || false);
          await simpleGame.startGame();
          break;
        }

        case 'volt-agent': {
          console.log('🤖 Starting Volt Agent Multi-Agent Implementation...');
          console.log(
            '⚠️  Note: This mode may have compatibility issues with current dependencies'
          );
          const voltGame = new DemonLordRPG();
          await voltGame.startGame();
          break;
        }

        default:
          throw new Error(`Unknown game mode: ${this.gameMode}`);
      }
    } catch (error) {
      console.error('❌ Game startup failed:', error);
      console.log('🔄 You can try switching game modes or check your configuration.');
    }
  }

  /**
   * Switch game implementation mode
   */
  setGameMode(mode: 'simple' | 'volt-agent'): void {
    this.gameMode = mode;
    console.log(`🔄 Game mode switched to: ${mode}`);
  }

  /**
   * Get current game mode
   */
  getGameMode(): string {
    return this.gameMode;
  }

  /**
   * Get available game modes and their status
   */
  getGameModeInfo(): Record<string, { name: string; description: string; status: string }> {
    return {
      simple: {
        name: 'Simple Game',
        description:
          'Direct AI integration with Grok API, includes image generation and basic gameplay',
        status: 'Stable - Recommended for testing',
      },
      'volt-agent': {
        name: 'Volt Agent Multi-Agent System',
        description: 'Advanced multi-agent architecture with GameMaster supervisor and NPC agents',
        status: 'Development - May have dependency issues',
      },
    };
  }
}

export default UnifiedGameEngine;
