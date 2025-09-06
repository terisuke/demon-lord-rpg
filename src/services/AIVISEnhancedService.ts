// src/services/AIVISEnhancedService.ts - Comprehensive P0 audio narration service
import type { GameState, NPCRelationship } from '@/types';

export interface AudioRequest {
  text: string;
  character?: string;
  importance: 'high' | 'medium' | 'low';
  context?: string;
}

export interface VoiceProfile {
  model_uuid: string;
  style_id: number;
  speed: number;
  pitch: number;
}

export class AIVISEnhancedService {
  private apiKey: string;
  private isEnabled: boolean;
  
  // Character voice profiles
  private readonly voiceProfiles: Record<string, VoiceProfile> = {
    'narrator': {
      model_uuid: 'default-jp-001',
      style_id: 0,
      speed: 1.0,
      pitch: 1.0
    },
    'hero': {
      model_uuid: 'default-jp-001', 
      style_id: 1,
      speed: 1.0,
      pitch: 1.1
    },
    'merchant': {
      model_uuid: 'default-jp-001',
      style_id: 2,
      speed: 0.9,
      pitch: 0.95
    },
    'sage': {
      model_uuid: 'default-jp-001',
      style_id: 3,
      speed: 0.8,
      pitch: 0.9
    },
    'villager': {
      model_uuid: 'default-jp-001',
      style_id: 0,
      speed: 1.1,
      pitch: 1.05
    },
    'demon_lord': {
      model_uuid: 'default-jp-001',
      style_id: 4,
      speed: 0.7,
      pitch: 0.8
    }
  };

  // Day-based emotion mapping
  private readonly dayEmotionMap: Record<number, number> = {
    1: 0,  // neutral - game start
    5: 1,  // slightly hopeful
    10: 1, // hopeful - preparations underway
    15: 2, // concerned - halfway point
    20: 3, // worried - time running out
    25: 4, // tense - final preparations
    29: 5, // extremely tense - final day approaches
    30: 6  // climactic - final confrontation
  };

  constructor() {
    this.apiKey = process.env.AIVIS_API_KEY || '';
    this.isEnabled = !!this.apiKey;
    
    if (!this.isEnabled) {
      console.log("🔇 AIVIS音声機能は無効です（APIキー未設定）");
    }
  }

  /**
   * Calculate importance based on text content and context
   */
  private calculateImportance(text: string, context?: string): 'high' | 'medium' | 'low' {
    const highImportanceKeywords = ['魔王', '決戦', '最終', '勝利', '敗北', '死', '生', '運命'];
    const mediumImportanceKeywords = ['準備', '仲間', '情報', '武器', '魔法', '戦略'];
    
    const textLower = text.toLowerCase();
    const contextLower = context?.toLowerCase() || '';
    
    const hasHighKeyword = highImportanceKeywords.some(keyword => 
      textLower.includes(keyword) || contextLower.includes(keyword)
    );
    const hasMediumKeyword = mediumImportanceKeywords.some(keyword =>
      textLower.includes(keyword) || contextLower.includes(keyword)
    );
    
    if (hasHighKeyword) return 'high';
    if (hasMediumKeyword) return 'medium';
    return 'low';
  }

  /**
   * Get emotion style based on current day
   */
  private getEmotionForDay(currentDay: number): number {
    // Find closest day mapping
    const dayKeys = Object.keys(this.dayEmotionMap).map(Number).sort((a, b) => a - b);
    let closestDay = dayKeys[0];
    
    for (const day of dayKeys) {
      if (currentDay >= day) {
        closestDay = day;
      } else {
        break;
      }
    }
    
    return this.dayEmotionMap[closestDay];
  }

  /**
   * Synthesize speech for a given text with character voice
   */
  async synthesizeNarration(
    text: string, 
    character: string = 'narrator',
    gameState?: GameState
  ): Promise<ArrayBuffer | null> {
    if (!this.isEnabled) {
      console.log(`🔇 [${character}]: ${text}`);
      return null;
    }

    try {
      const voiceProfile = this.voiceProfiles[character] || this.voiceProfiles['narrator'];
      const emotionStyle = gameState ? this.getEmotionForDay(gameState.currentDay) : 0;
      
      const response = await fetch('https://api.aivis-project.com/v1/tts/synthesize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_uuid: voiceProfile.model_uuid,
          text: text,
          style_id: Math.max(emotionStyle, voiceProfile.style_id),
          speed: voiceProfile.speed,
          pitch: voiceProfile.pitch,
          output_format: 'mp3'
        })
      });

      if (response.ok && response.body) {
        console.log(`🔊 [${character}] 音声合成完了: ${text.substring(0, 50)}...`);
        return await response.arrayBuffer();
      } else {
        throw new Error(`API Error: ${response.status}`);
      }
    } catch (error) {
      console.error(`音声合成エラー [${character}]:`, error);
      return null;
    }
  }

  /**
   * Automatic narration with importance-based processing
   */
  async autoNarrate(
    requests: AudioRequest[],
    gameState?: GameState
  ): Promise<(ArrayBuffer | null)[]> {
    if (!this.isEnabled) {
      requests.forEach(req => {
        console.log(`🔇 [${req.character || 'narrator'}]: ${req.text}`);
      });
      return new Array(requests.length).fill(null);
    }

    // Sort by importance (high priority first)
    const prioritizedRequests = requests.sort((a, b) => {
      const importanceOrder = { 'high': 0, 'medium': 1, 'low': 2 };
      return importanceOrder[a.importance] - importanceOrder[b.importance];
    });

    // Process requests in parallel for efficiency
    const results = await Promise.allSettled(
      prioritizedRequests.map(req => 
        this.synthesizeNarration(req.text, req.character, gameState)
      )
    );

    return results.map(result => 
      result.status === 'fulfilled' ? result.value : null
    );
  }

  /**
   * Speak as a specific character with context-aware emotion
   */
  async speakAsCharacter(
    character: string,
    dialogue: string,
    gameState?: GameState,
    relationship?: NPCRelationship
  ): Promise<ArrayBuffer | null> {
    if (!this.isEnabled) {
      console.log(`🔇 [${character}]: ${dialogue}`);
      return null;
    }

    // Modify voice profile based on relationship
    let voiceProfile = { ...this.voiceProfiles[character] };
    if (relationship) {
      // Adjust pitch and speed based on relationship
      const affinityFactor = relationship.affinity / 100;
      const trustFactor = relationship.trust / 100;
      
      voiceProfile.pitch += affinityFactor * 0.1;
      voiceProfile.speed += trustFactor * 0.1;
    }

    try {
      const emotionStyle = gameState ? this.getEmotionForDay(gameState.currentDay) : 0;
      
      const response = await fetch('https://api.aivis-project.com/v1/tts/synthesize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_uuid: voiceProfile.model_uuid,
          text: dialogue,
          style_id: Math.max(emotionStyle, voiceProfile.style_id),
          speed: Math.max(0.5, Math.min(2.0, voiceProfile.speed)),
          pitch: Math.max(0.5, Math.min(2.0, voiceProfile.pitch)),
          output_format: 'mp3'
        })
      });

      if (response.ok && response.body) {
        console.log(`🔊 [${character}] セリフ音声合成完了`);
        return await response.arrayBuffer();
      } else {
        throw new Error(`Character Speech API Error: ${response.status}`);
      }
    } catch (error) {
      console.error(`キャラクター音声合成エラー [${character}]:`, error);
      return null;
    }
  }

  /**
   * Batch process multiple character dialogues
   */
  async batchProcessDialogues(
    dialogues: Array<{
      character: string;
      text: string;
      importance?: 'high' | 'medium' | 'low';
    }>,
    gameState?: GameState
  ): Promise<Array<ArrayBuffer | null>> {
    if (!this.isEnabled) {
      dialogues.forEach(dialogue => {
        console.log(`🔇 [${dialogue.character}]: ${dialogue.text}`);
      });
      return new Array(dialogues.length).fill(null);
    }

    const audioRequests: AudioRequest[] = dialogues.map(dialogue => ({
      text: dialogue.text,
      character: dialogue.character,
      importance: dialogue.importance || this.calculateImportance(dialogue.text)
    }));

    return await this.autoNarrate(audioRequests, gameState);
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.isEnabled;
  }

  /**
   * Get available character voices
   */
  getAvailableVoices(): string[] {
    return Object.keys(this.voiceProfiles);
  }
}