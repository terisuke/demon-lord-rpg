# AIVIS Cloud API 統合ガイド

## 1. APIの概要

AIVIS Cloud APIは、高品質な日本語音声合成を提供するクラウドサービスです。
現在**無料ベータ期間中**で、全機能を無料で利用できます。

### 1.1 主要機能

- リアルタイムストリーミング音声合成
- 多様な音声モデル（感情表現対応）
- 日本語に特化した高品質な音声
- LLMとの連携に最適化されたレスポンス速度

## 2. セットアップ

### 2.1 APIキーの取得

1. [AIVIS Cloud](https://aivis-project.com/)にアクセス
2. 無料アカウントを作成
3. ダッシュボードから「API Keys」セクションへ
4. 「Create New Key」をクリック
5. 生成されたキーをコピー

### 2.2 環境変数の設定

```bash
# .env ファイルに追加
AIVIS_API_KEY=your-aivis-api-key-here
```

## 3. 実装

### 3.1 バックエンドサービス

```typescript
// src/services/AIVISService.ts
import { Readable } from 'stream';

export class AIVISService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.aivis-project.com/v1';

  constructor() {
    if (!process.env.AIVIS_API_KEY) {
      throw new Error('AIVIS_API_KEY環境変数が設定されていません');
    }
    this.apiKey = process.env.AIVIS_API_KEY;
  }

  /**
   * テキストから音声を合成（ストリーミング）
   */
  async synthesizeSpeech(
    text: string,
    modelUuid: string = 'default-jp-001',
    styleId?: number
  ): Promise<ReadableStream> {
    const requestBody = {
      model_uuid: modelUuid,
      text: text,
      style_id: styleId || 0, // 0: ニュートラル
      output_format: 'mp3', // ストリーミングに適した形式
    };

    const response = await fetch(`${this.baseUrl}/tts/synthesize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`AIVIS API Error: ${response.status} - ${JSON.stringify(errorBody)}`);
    }

    if (!response.body) {
      throw new Error('音声ストリームを取得できませんでした');
    }

    return Readable.fromWeb(response.body as any);
  }

  /**
   * 利用可能な音声モデルを取得
   */
  async getAvailableModels() {
    const response = await fetch(`${this.baseUrl}/aivm-models/search`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('モデル一覧の取得に失敗しました');
    }

    return response.json();
  }
}
```

### 3.2 フロントエンド音声プレイヤー

```typescript
// src/utils/StreamingAudioPlayer.ts
export class StreamingAudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private nextPlayTime = 0;
  private currentVolume = 1.0;

  constructor() {
    // ユーザーインタラクション後にAudioContextを初期化
    this.initializeOnUserInteraction();
  }

  private initializeOnUserInteraction() {
    const initAudio = () => {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
        console.log('AudioContext initialized');
      }
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };
    
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });
  }

  /**
   * バックエンドから音声ストリームを取得して再生
   */
  async playNarration(text: string, voiceType: 'narrator' | 'elder' | 'demon' = 'narrator') {
    // 音声タイプに応じたエンドポイント
    const endpoint = `/api/audio/synthesize`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceType })
    });

    if (!response.body) {
      throw new Error('音声ストリームを取得できません');
    }

    const reader = response.body.getReader();
    await this.processStream(reader);
  }

  private async processStream(reader: ReadableStreamDefaultReader<Uint8Array>) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // 音声データをキューに追加
      this.audioQueue.push(value.buffer);
      
      // 再生が開始されていなければ開始
      if (!this.isPlaying) {
        await this.startPlayback();
      }
    }
  }

  private async startPlayback() {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    
    while (this.audioQueue.length > 0) {
      const buffer = this.audioQueue.shift()!;
      
      try {
        // 音声データをデコード
        const audioBuffer = await this.audioContext.decodeAudioData(buffer);
        
        // AudioBufferSourceNodeを作成
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        
        // ボリューム制御用のGainNodeを追加
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = this.currentVolume;
        
        // 接続: source -> gain -> destination
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // 再生タイミングの計算（シームレス再生）
        const currentTime = this.audioContext.currentTime;
        const startTime = Math.max(currentTime, this.nextPlayTime);
        
        source.start(startTime);
        this.nextPlayTime = startTime + audioBuffer.duration;
        
        // 次のチャンクの処理
        await new Promise(resolve => {
          source.onended = resolve;
        });
        
      } catch (error) {
        console.error('音声デコードエラー:', error);
      }
    }
    
    this.isPlaying = false;
  }

  /**
   * ボリューム調整（0.0 - 1.0）
   */
  setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * 再生を停止
   */
  stop() {
    this.audioQueue = [];
    this.isPlaying = false;
    this.nextPlayTime = 0;
  }
}
```

### 3.3 ゲーム統合例

```typescript
// src/game/AudioNarrator.ts
import { StreamingAudioPlayer } from '../utils/StreamingAudioPlayer';
import { AIVISService } from '../services/AIVISService';

export class AudioNarrator {
  private player: StreamingAudioPlayer;
  private aivis: AIVISService;
  private enabled: boolean = true;

  constructor() {
    this.player = new StreamingAudioPlayer();
    this.aivis = new AIVISService();
  }

  /**
   * 重要な場面でナレーションを再生
   */
  async narrateImportantScene(day: number, text: string) {
    // 重要な日のみ音声を再生（コスト管理）
    const importantDays = [1, 10, 20, 30];
    
    if (!this.enabled || !importantDays.includes(day)) {
      return;
    }

    try {
      // 感情に応じたスタイルを選択
      let styleId = 0; // デフォルト: ニュートラル
      
      if (day === 1) {
        styleId = 1; // 希望に満ちた
      } else if (day === 30) {
        styleId = 4; // 緊迫した
      }

      // 音声を生成して再生
      await this.player.playNarration(text, 'narrator');
      
    } catch (error) {
      console.error('音声再生エラー:', error);
      // 音声再生に失敗してもゲームは継続
    }
  }

  /**
   * NPCの台詞を音声化
   */
  async speakAsNPC(npcName: string, dialogue: string) {
    if (!this.enabled) return;

    const voiceMap = {
      'Elder_Morgan': 'elder',
      'Demon_Lord': 'demon',
    };

    const voiceType = voiceMap[npcName] || 'narrator';
    
    try {
      await this.player.playNarration(dialogue, voiceType);
    } catch (error) {
      console.error(`NPC音声エラー (${npcName}):`, error);
    }
  }

  /**
   * 音声機能の有効/無効切り替え
   */
  toggleAudio(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.player.stop();
    }
  }
}
```

## 4. UI実装

### 4.1 音声コントロールUI

```html
<!-- public/index.html -->
<div class="audio-controls">
  <button id="audio-toggle" class="btn-audio">
    <span class="audio-on">🔊</span>
    <span class="audio-off" style="display: none;">🔇</span>
  </button>
  
  <input type="range" 
         id="volume-slider" 
         min="0" 
         max="100" 
         value="70"
         class="volume-control">
  
  <span id="volume-display">70%</span>
</div>
```

```typescript
// src/ui/audioControls.ts
export class AudioControls {
  private narrator: AudioNarrator;
  private audioEnabled = true;
  
  constructor(narrator: AudioNarrator) {
    this.narrator = narrator;
    this.initializeControls();
  }

  private initializeControls() {
    // 音声ON/OFFトグル
    const toggleBtn = document.getElementById('audio-toggle');
    toggleBtn?.addEventListener('click', () => {
      this.audioEnabled = !this.audioEnabled;
      this.narrator.toggleAudio(this.audioEnabled);
      
      // UIを更新
      const onIcon = toggleBtn.querySelector('.audio-on');
      const offIcon = toggleBtn.querySelector('.audio-off');
      
      if (this.audioEnabled) {
        onIcon.style.display = 'inline';
        offIcon.style.display = 'none';
      } else {
        onIcon.style.display = 'none';
        offIcon.style.display = 'inline';
      }
    });

    // ボリュームスライダー
    const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    const volumeDisplay = document.getElementById('volume-display');
    
    volumeSlider?.addEventListener('input', (e) => {
      const volume = parseInt((e.target as HTMLInputElement).value);
      this.narrator.player.setVolume(volume / 100);
      
      if (volumeDisplay) {
        volumeDisplay.textContent = `${volume}%`;
      }
    });
  }
}
```

## 5. エラーハンドリングとフォールバック

```typescript
// src/services/AudioErrorHandler.ts
export class AudioErrorHandler {
  private retryCount = 0;
  private maxRetries = 3;
  
  async handleAudioError(error: Error, fallbackAction?: () => void) {
    console.error('音声処理エラー:', error);
    
    // レート制限エラーの場合
    if (error.message.includes('429')) {
      console.log('レート制限に達しました。音声を一時的に無効化します。');
      // 1分後に再試行
      setTimeout(() => {
        this.retryCount = 0;
      }, 60000);
      return;
    }
    
    // ネットワークエラーの場合
    if (error.message.includes('fetch')) {
      this.retryCount++;
      
      if (this.retryCount < this.maxRetries) {
        console.log(`再試行中... (${this.retryCount}/${this.maxRetries})`);
        // 指数バックオフで再試行
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, this.retryCount) * 1000)
        );
        return true; // 再試行を示す
      }
    }
    
    // フォールバック処理
    if (fallbackAction) {
      fallbackAction();
    }
    
    return false;
  }
}
```

## 6. 料金とレート制限

### 6.1 現在の料金体系

| プラン | 料金 | 制限 | 備考 |
|--------|------|------|------|
| 無料ベータ | **¥0** | なし | 現在提供中 |
| 将来の従量課金 | 未定 | 未定 | 正式リリース後 |
| 法人向け | 月額制 | カスタム | Citorasサーバー |

### 6.2 レート制限ヘッダー

```typescript
// APIレスポンスのヘッダー例
interface RateLimitHeaders {
  'X-Aivis-RateLimit-Requests-Limit': string;     // 最大リクエスト数
  'X-Aivis-RateLimit-Requests-Remaining': string;  // 残りリクエスト数
  'X-Aivis-RateLimit-Requests-Reset': string;      // リセットまでの秒数
}
```

## 7. ベストプラクティス

1. **重要な場面のみ音声化** - コスト管理とユーザー体験のバランス
2. **ストリーミング再生** - レスポンスの体感速度向上
3. **エラーハンドリング** - 音声失敗でもゲーム継続
4. **ユーザー制御** - 音声ON/OFF、ボリューム調整を提供
5. **キャッシュ活用** - 同じナレーションは再利用

---

*このドキュメントはAIVIS Cloud API公式ドキュメントを基に作成されました。*
*無料ベータ期間中のため、仕様は変更される可能性があります。*