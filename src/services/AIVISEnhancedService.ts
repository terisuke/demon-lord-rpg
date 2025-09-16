// src/services/AIVISEnhancedService.ts - P0: 全ナレーション音声化
import * as dotenv from 'dotenv';
import { handleError } from '../utils/errorHandler';

// 環境変数を確実に読み込み
dotenv.config();
export interface AIVISConfig {
  voice: 'female_calm_jp' | 'male_dramatic_jp' | 'elder_jp' | 'demon_deep_jp';
  speed: number; // 0.8-1.2 based on day tension
  emotion: 'calm' | 'tense' | 'urgent' | 'hope' | 'fear';
  styleId: number;
}

export class AIVISEnhancedService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.aivis-project.com/v1';
  private enabled: boolean = true;
  private currentVolume: number = 0.7;

  constructor() {
    this.apiKey = process.env.AIVIS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('🚨 AIVIS_API_KEY not found. Audio features will be disabled.');
      this.enabled = false;
    } else {
      console.log(`🎵 AIVIS Service 初期化成功 (Key: ${this.apiKey.substring(0, 10)}...)`);
    }
  }

  /**
   * P0機能: すべてのナレーションを自動音声化
   */
  async synthesizeNarration(
    text: string,
    day: number,
    context: 'narrative' | 'choice' | 'result' | 'npc' = 'narrative'
  ): Promise<string | null> {
    if (!this.enabled || !text.trim()) return null;

    try {
      // Day別感情マッピング
      const config = this.getVoiceConfigByDay(day, context);

      // Check if models are available
      const modelUuid = this.getModelUuid(config.voice);
      if (!modelUuid) {
        console.warn('🎵 AIVIS audio disabled: No available models');
        return null;
      }

      const processedText = this.preprocessText(text);

      const requestBody = {
        model_uuid: modelUuid,
        speaker_uuid: this.getSpeakerUuid(config.voice),
        text: processedText,
        style_id: config.styleId,
        use_ssml: true,
        language: 'ja',
        speaking_rate: config.speed,
        emotional_intensity: this.getEmotionalIntensity(day, context),
        tempo_dynamics: 1.0,
        pitch: 0,
        volume: 1,
        leading_silence_seconds: 0.0, // 高速再生開始のため
        trailing_silence_seconds: 0.1,
        line_break_silence_seconds: 0.4,
        output_format: 'mp3',
        output_bitrate: 64, // 良好な品質とファイルサイズのバランス
        output_sampling_rate: 22050, // 音声品質向上
        output_audio_channels: 'mono',
      };

      console.log(`🎵 AIVIS API Request:`, {
        url: `${this.baseUrl}/tts/synthesize`,
        model: requestBody.model_uuid,
        speaker: requestBody.speaker_uuid,
        textLength: processedText.length,
        style: requestBody.style_id,
        speaking_rate: requestBody.speaking_rate,
        emotional_intensity: requestBody.emotional_intensity,
      });

      const response = await fetch(`${this.baseUrl}/tts/synthesize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorDetails = '';
        try {
          const errorBody = await response.text();
          errorDetails = errorBody;
          console.error('🚨 AIVIS API Error Details:', errorDetails);
        } catch (e) {
          errorDetails = 'レスポンス読み取りエラー';
        }
        throw new Error(`AIVIS API Error: ${response.status} - ${errorDetails}`);
      }

      // Base64エンコードされた音声データを返す
      const audioBlob = await response.blob();
      const base64Audio = await this.blobToBase64(audioBlob);

      return base64Audio;
    } catch (error) {
      console.error('[AIVISEnhanced] 音声合成エラー:', error);
      return null;
    }
  }

  /**
   * Day進行に応じた音声設定を取得
   */
  private getVoiceConfigByDay(day: number, context: string): AIVISConfig {
    let config: AIVISConfig;

    // 基本設定
    if (day <= 10) {
      config = {
        voice: 'female_calm_jp',
        speed: 1.0,
        emotion: 'calm',
        styleId: 0, // ニュートラル
      };
    } else if (day <= 20) {
      config = {
        voice: 'female_calm_jp',
        speed: 1.05,
        emotion: 'tense',
        styleId: 1, // 少し心配
      };
    } else if (day <= 25) {
      config = {
        voice: 'male_dramatic_jp',
        speed: 1.1,
        emotion: 'urgent',
        styleId: 3, // 緊張
      };
    } else {
      config = {
        voice: 'male_dramatic_jp',
        speed: 1.2,
        emotion: 'fear',
        styleId: 4, // 非常に緊迫
      };
    }

    // コンテキスト別調整
    if (context === 'npc') {
      config.voice = 'elder_jp'; // NPCは長老の声
      config.speed = 0.95; // 少しゆっくり
    }

    return config;
  }

  /**
   * Day進行とコンテキストに応じた感情強度を取得
   */
  private getEmotionalIntensity(day: number, context: string): number {
    let intensity = 1.0; // デフォルト

    // Day進行による感情強度
    if (day <= 10) {
      intensity = 0.8; // 穏やか
    } else if (day <= 20) {
      intensity = 1.0; // 標準
    } else if (day <= 25) {
      intensity = 1.2; // やや緊張
    } else {
      intensity = 1.5; // 非常に緊張
    }

    // コンテキスト別調整
    switch (context) {
      case 'npc':
        intensity *= 0.9; // NPCは少し落ち着いた感じ
        break;
      case 'choice':
        intensity *= 1.1; // 選択肢は少し重要感を演出
        break;
      case 'result':
        intensity *= 1.3; // 結果は感情を込めて
        break;
      default: // narrative
        break;
    }

    // 最大値制限
    return Math.min(2.0, Math.max(0.5, intensity));
  }

  /**
   * 音声モデルUUID取得（正確なAIVIS API UUID使用）
   */
  private getModelUuid(_voice: string): string | null {
    // No public models available from AIVIS API - return null to disable audio
    console.warn('🎵 No AIVIS models available - audio will be disabled');
    return null;
  }

  /**
   * 話者UUID取得
   */
  private getSpeakerUuid(_voice: string): string | null {
    // No public models available from AIVIS API - return null to disable audio
    return null;
  }

  /**
   * テキスト前処理（音声読み上げ最適化）
   */
  private preprocessText(text: string): string {
    let processed = text
      .replace(/[「」]/g, '') // 日本語カギ括弧を除去
      .replace(/【[^】]*】/g, '') // 【】内のテキストを削除（特別イベント表示など）
      .replace(/\.\.\./g, '、') // 三点リーダーを読点に
      .replace(/！/g, '。') // 感嘆符を句点に（読み上げ改善）
      .replace(/\s+/g, ' ') // 連続空白を単一空白に
      .replace(/\n+/g, ' ') // 改行を空白に
      .trim();

    // 空のテキストの場合はデフォルトメッセージ
    if (!processed) {
      processed = 'テキストが見つかりませんでした。';
    }

    // テキストが長すぎる場合は切り詰め（AIVIS API制限対策）
    if (processed.length > 200) {
      processed = processed.substring(0, 200) + '...';
      console.warn(`⚠️ テキストを200文字に切り詰めました: "${processed}"`);
    }

    return processed;
  }

  /**
   * BlobをBase64に変換
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    try {
      // Node.js環境でのBlob→Base64変換
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString('base64');

      // data:audio/mp3;base64, プレフィックスを付与
      return `data:audio/mp3;base64,${base64Data}`;
    } catch (error) {
      throw new Error(`Base64変換エラー: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * P0機能: 重要な場面での自動音声化判定
   */
  async autoNarrate(
    text: string,
    day: number
  ): Promise<{
    shouldPlay: boolean;
    audioData?: string;
    reason: string;
  }> {
    // 重要度スコアリング
    const importance = this.calculateImportance(text, day);

    if (importance < 0.3) {
      return {
        shouldPlay: false,
        reason: `重要度不足: ${importance.toFixed(2)} < 0.3`,
      };
    }

    const audioData = await this.synthesizeNarration(text, day);

    return {
      shouldPlay: !!audioData,
      audioData: audioData || undefined,
      reason: audioData ? '音声生成成功' : '音声生成失敗',
    };
  }

  /**
   * テキスト重要度計算（P0機能）
   */
  private calculateImportance(text: string, day: number): number {
    let score = 0;

    // 長さによる重要度
    if (text.length > 50) score += 0.2;
    if (text.length > 100) score += 0.1;

    // キーワードによる重要度
    const importantKeywords = [
      '魔王',
      '襲来',
      '決戦',
      '最後',
      '運命',
      '戦い',
      '勝利',
      '敗北',
      '死',
      '生',
      '希望',
      '絶望',
      '村',
      '英雄',
      '選択',
    ];

    for (const keyword of importantKeywords) {
      if (text.includes(keyword)) {
        score += 0.15;
      }
    }

    // Day進行による重要度
    if (day >= 25)
      score += 0.3; // 最終週は全て重要
    else if (day >= 15)
      score += 0.2; // 後半は重要
    else if (day === 1) score += 0.4; // 初日は特に重要

    // 特別な日（10日ごと）は重要
    if (day % 10 === 0) score += 0.2;

    return Math.min(1.0, score);
  }

  /**
   * NPCごとの音声設定
   */
  async speakAsCharacter(character: string, dialogue: string, _day: number): Promise<string | null> {
    if (!this.enabled) return null;

    const characterVoices: Record<
      string,
      { voice: string; styleId: number; emotionalIntensity: number }
    > = {
      Elder_Morgan: { voice: 'elder_jp', styleId: 0, emotionalIntensity: 0.8 },
      Merchant_Gideon: { voice: 'male_dramatic_jp', styleId: 1, emotionalIntensity: 1.2 },
      Guard_Captain: { voice: 'male_dramatic_jp', styleId: 2, emotionalIntensity: 1.3 },
      Demon_Lord: { voice: 'demon_deep_jp', styleId: 4, emotionalIntensity: 1.8 },
      Village_Girl: { voice: 'female_calm_jp', styleId: 0, emotionalIntensity: 0.9 },
    };

    const voiceConfig = characterVoices[character];
    if (!voiceConfig) return null;

    try {
      const requestBody = {
        model_uuid: this.getModelUuid(voiceConfig.voice),
        speaker_uuid: this.getSpeakerUuid(voiceConfig.voice),
        text: this.preprocessText(dialogue),
        style_id: voiceConfig.styleId,
        use_ssml: true,
        language: 'ja',
        speaking_rate: 1.0,
        emotional_intensity: voiceConfig.emotionalIntensity,
        tempo_dynamics: 1.0,
        pitch: 0,
        volume: 1,
        leading_silence_seconds: 0.0,
        trailing_silence_seconds: 0.1,
        line_break_silence_seconds: 0.4,
        output_format: 'mp3',
        output_bitrate: 64,
        output_sampling_rate: 22050,
        output_audio_channels: 'mono',
      };

      const response = await fetch(`${this.baseUrl}/tts/synthesize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🚨 Character voice API error: ${response.status} - ${errorText}`);
        throw new Error(`Character voice error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      return await this.blobToBase64(audioBlob);
    } catch (error) {
      console.error(`[AIVISEnhanced] キャラクター音声エラー (${character}):`, error);
      return null;
    }
  }

  /**
   * バッチ処理: 複数テキストを並列音声化（Promise.all準備）
   */
  async synthesizeBatch(
    texts: { text: string; day: number; context?: string }[]
  ): Promise<(string | null)[]> {
    const promises = texts.map(({ text, day, context = 'narrative' }) =>
      this.synthesizeNarration(text, day, context as any)
    );

    try {
      return await Promise.all(promises);
    } catch (error) {
      handleError(error, 'AIVISEnhanced.synthesizeBatch');
      return texts.map(() => null);
    }
  }

  /**
   * 音声機能ON/OFF
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled && !!this.apiKey;
    console.log(`[AIVISEnhanced] 音声機能: ${this.enabled ? 'ON' : 'OFF'}`);
  }

  /**
   * ボリューム調整
   */
  setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * 利用可能な音声モデルを取得（デバッグ用）
   */
  async getAvailableModels(): Promise<any> {
    if (!this.enabled) {
      return { error: 'AIVIS無効' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/aivm-models/search`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Model list error: ${response.status} - ${errorText}`);
      }

      const models = await response.json();
      console.log('🎵 利用可能なAIVISモデル:', models);
      return models;
    } catch (error) {
      console.error('🚨 AIVISモデル取得エラー:', error);
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * 状態取得（デバッグ用）
   */
  getStatus(): { enabled: boolean; hasApiKey: boolean; volume: number } {
    return {
      enabled: this.enabled,
      hasApiKey: !!this.apiKey,
      volume: this.currentVolume,
    };
  }
}

// シングルトンインスタンス
export const aivisEnhanced = new AIVISEnhancedService();
