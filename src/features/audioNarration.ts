// src/features/audioNarration.ts
export class AudioNarrator {
  private apiKey: string;
  
  constructor() {
    this.apiKey = process.env.AIVIS_API_KEY || '';
  }

  async narrate(text: string, emotion: 'neutral' | 'hopeful' | 'tense' = 'neutral'): Promise<void> {
    if (!this.apiKey) {
      console.log("🔇 音声機能は無効です（APIキー未設定）");
      return;
    }

    const emotionMap = {
      'neutral': 0,
      'hopeful': 1,
      'tense': 4
    };

    try {
      const response = await fetch('https://api.aivis-project.com/v1/tts/synthesize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_uuid: 'default-jp-001',
          text: text,
          style_id: emotionMap[emotion],
          output_format: 'mp3'
        })
      });

      if (response.ok && response.body) {
        // ストリーミング処理（簡略版）
        console.log("🔊 音声再生開始");
        // TODO: Web Audio APIで実際に再生
      }
    } catch (error) {
      console.error("音声合成エラー:", error);
    }
  }
}