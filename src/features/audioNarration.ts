// src/features/audioNarration.ts - P0機能統合版
import { aivisEnhanced } from '../services/AIVISEnhancedService';

export class AudioNarrator {
  constructor() {
    const status = aivisEnhanced.getStatus();
    console.log(`🔊 AIVIS Enhanced Audio: ${status.enabled ? 'ON' : 'OFF'}`);
    console.log(`   API Key: ${status.hasApiKey ? '✅' : '❌'}`);
    console.log(`   Volume: ${Math.round(status.volume * 100)}%`);
  }

  /**
   * P0機能: すべてのナレーションを自動音声化
   */
  async narrate(
    text: string,
    day: number = 1,
    context: 'narrative' | 'choice' | 'result' | 'npc' = 'narrative'
  ): Promise<{
    success: boolean;
    audioData?: string;
    reason?: string;
  }> {
    console.log(`🎵 [Day ${day}] 音声生成: ${context} - "${text.substring(0, 30)}..."`);

    try {
      // P0: 自動重要度判定による音声化
      const result = await aivisEnhanced.autoNarrate(text, day);

      if (result.shouldPlay && result.audioData) {
        console.log(`✅ 音声生成成功: ${result.reason}`);
        return {
          success: true,
          audioData: result.audioData,
          reason: result.reason,
        };
      } else {
        console.log(`⏭️  音声スキップ: ${result.reason}`);
        return {
          success: false,
          reason: result.reason,
        };
      }
    } catch (error) {
      console.error('❌ 音声合成エラー:', error);
      return {
        success: false,
        reason: `エラー: ${error.message}`,
      };
    }
  }

  /**
   * P0機能: キャラクター別音声（NPCセリフ用）
   */
  async speakAsCharacter(
    character: string,
    dialogue: string,
    day: number
  ): Promise<{
    success: boolean;
    audioData?: string;
  }> {
    console.log(`🎭 [${character}] セリフ音声化: "${dialogue.substring(0, 30)}..."`);

    try {
      const audioData = await aivisEnhanced.speakAsCharacter(character, dialogue, day);

      if (audioData) {
        console.log(`✅ キャラクター音声生成成功: ${character}`);
        return { success: true, audioData };
      } else {
        console.log(`⏭️  キャラクター音声スキップ: ${character}`);
        return { success: false };
      }
    } catch (error) {
      console.error(`❌ キャラクター音声エラー (${character}):`, error);
      return { success: false };
    }
  }

  /**
   * P0機能: バッチ音声生成（並列処理準備）
   */
  async narrateBatch(
    items: Array<{
      text: string;
      day: number;
      context?: 'narrative' | 'choice' | 'result' | 'npc';
    }>
  ): Promise<Array<{ success: boolean; audioData?: string; text: string }>> {
    console.log(`🎵 バッチ音声生成開始: ${items.length}件`);

    const startTime = Date.now();

    try {
      // Promise.allで並列処理
      const audioResults = await aivisEnhanced.synthesizeBatch(
        items.map((item) => ({
          text: item.text,
          day: item.day,
          context: item.context || 'narrative',
        }))
      );

      const results = items.map((item, index) => ({
        text: item.text,
        success: !!audioResults[index],
        audioData: audioResults[index] || undefined,
      }));

      const successCount = results.filter((r) => r.success).length;
      const duration = Date.now() - startTime;

      console.log(`✅ バッチ音声生成完了: ${successCount}/${items.length}件 (${duration}ms)`);

      return results;
    } catch (error) {
      console.error('❌ バッチ音声生成エラー:', error);
      return items.map((item) => ({ text: item.text, success: false }));
    }
  }

  /**
   * 音声機能制御
   */
  toggleAudio(enabled: boolean): void {
    aivisEnhanced.setEnabled(enabled);
    console.log(`🔊 音声機能: ${enabled ? 'ON' : 'OFF'}`);
  }

  /**
   * ボリューム調整
   */
  setVolume(volume: number): void {
    aivisEnhanced.setVolume(volume);
    console.log(`🔊 音声ボリューム: ${Math.round(volume * 100)}%`);
  }

  /**
   * 統計情報取得
   */
  getStats(): {
    enabled: boolean;
    hasApiKey: boolean;
    volume: number;
  } {
    return aivisEnhanced.getStatus();
  }
}