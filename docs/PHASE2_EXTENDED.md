# 🚀 PHASE 2 拡張要件 - AIの真の力を解放

## 🔥 最重要: 未活用機能の完全実装

### 1. AIVIS Speech API - 音声による没入感

#### 1.1 フル音声対応の実装

```typescript
// src/services/EnhancedAudioService.ts

export class EnhancedAudioService {
  private aivis: AIVISService;
  private audioPlayer: StreamingAudioPlayer;
  private voiceSettings = {
    narrator: { modelId: 'jp-male-calm', styleId: 0 },
    elder: { modelId: 'jp-male-old', styleId: 1 },
    merchant: { modelId: 'jp-male-energetic', styleId: 2 },
    demon: { modelId: 'jp-male-deep', styleId: 4 },
    heroine: { modelId: 'jp-female-young', styleId: 0 }
  };
  
  // すべてのナレーションを自動音声化
  async autoNarrate(text: string, day: number): Promise<void> {
    // 感情を日数から自動判定
    const emotion = this.getEmotionByDay(day);
    
    // 重要度を判定
    const importance = this.calculateImportance(text, day);
    
    if (importance > 0.3) { // 30%以上の重要度で音声化
      await this.narrate(text, emotion);
    }
  }
  
  private getEmotionByDay(day: number): number {
    if (day <= 5) return 0; // 平穏
    if (day <= 15) return 1; // 希望
    if (day <= 25) return 3; // 不安
    return 4; // 緊迫
  }
  
  // NPCごとの声の使い分け
  async speakAsCharacter(character: string, dialogue: string): Promise<void> {
    const voice = this.voiceSettings[character] || this.voiceSettings.narrator;
    
    const stream = await this.aivis.synthesizeSpeech(
      dialogue,
      voice.modelId,
      voice.styleId
    );
    
    await this.audioPlayer.playStream(stream);
  }
  
  // BGM的な環境音声
  async playAmbientNarration(day: number): Promise<void> {
    const ambientTexts = {
      1: "穏やかな朝。鳥のさえずりが聞こえる...",
      10: "村に緊張が漂い始めている...",
      20: "不穏な空気。魔王軍の気配が...",
      29: "嵐の前の静けさ...",
      30: "運命の時は来た！"
    };
    
    if (ambientTexts[day]) {
      await this.narrate(ambientTexts[day], this.getEmotionByDay(day));
    }
  }
}
```

#### 1.2 音声UIコントロール

```typescript
// src/components/AudioControls.tsx

export const AudioControls = () => {
  const [autoPlay, setAutoPlay] = useState(true);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [characterVoices, setCharacterVoices] = useState(true);
  
  return (
    <div className="audio-panel">
      <button onClick={() => setAutoPlay(!autoPlay)}>
        {autoPlay ? '🔊 音声ON' : '🔇 音声OFF'}
      </button>
      
      <label>
        読み上げ速度
        <input 
          type="range" 
          min="0.5" 
          max="2.0" 
          step="0.1"
          value={voiceSpeed}
          onChange={(e) => setVoiceSpeed(e.target.value)}
        />
      </label>
      
      <label>
        <input 
          type="checkbox"
          checked={characterVoices}
          onChange={(e) => setCharacterVoices(e.target.checked)}
        />
        キャラクターボイス
      </label>
    </div>
  );
};
```

### 2. Grok リアルタイム検索 - 現実世界との連動

#### 2.1 リアルワールドイベント統合

```typescript
// src/services/RealWorldIntegration.ts

export class RealWorldIntegration {
  /**
   * 現実世界の情報をゲームに反映
   */
  static async integrateRealWorldEvents(day: number): Promise<string[]> {
    const events = [];
    
    // Day 5: 今日の天気を取り込む
    if (day === 5) {
      const weather = await this.searchCurrentWeather();
      events.push(`商人が言った：「外の世界では${weather}らしいぞ」`);
    }
    
    // Day 10: 最新ニュースを組み込む
    if (day === 10) {
      const news = await this.searchLatestNews();
      events.push(`偵察隊の報告：「${news}という噂を聞いた」`);
    }
    
    // Day 15: トレンドを反映
    if (day === 15) {
      const trends = await this.searchTrends();
      events.push(`村の若者たちが「${trends}」について話している`);
    }
    
    return events;
  }
  
  private static async searchCurrentWeather(): Promise<string> {
    const { text } = await generateText({
      model: xai('grok-3'),
      prompt: 'リアルタイム検索を使って、東京の今日の天気を教えて。一言で。',
      tools: {
        search: {
          type: 'function',
          function: {
            name: 'web_search',
            description: 'Search the web',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string' }
              }
            }
          }
        }
      }
    });
    
    return text;
  }
  
  // プレイヤーの質問に現実のデータで答える
  static async answerWithRealData(question: string): Promise<string> {
    const prompt = `
    プレイヤーの質問: "${question}"
    
    リアルタイム検索を使って、現実世界の最新情報を基に答えてください。
    ただし、ファンタジー世界の住人として、その情報を「予言」や「占い」として伝えてください。
    `;
    
    const { text } = await generateText({
      model: xai('grok-3'),
      prompt,
      tools: {
        search: {
          type: 'function',
          function: {
            name: 'web_search',
            description: 'Search for real-world information'
          }
        }
      }
    });
    
    return text;
  }
}
```

#### 2.2 動的な世界観の拡張

```typescript
// src/game/DynamicWorldBuilder.ts

export class DynamicWorldBuilder {
  /**
   * プレイヤーの興味に基づいて世界を拡張
   */
  static async expandWorld(playerInterest: string): Promise<WorldExpansion> {
    // プレイヤーが「ドラゴン」に言及したら、ドラゴンの情報を検索
    if (playerInterest.includes('ドラゴン')) {
      const dragonLore = await this.searchFantasyLore('dragon mythology');
      return {
        newLocation: '竜の谷',
        description: dragonLore,
        newNPC: '老竜ヴォルガノス',
        questUnlocked: 'ドラゴンの試練'
      };
    }
    
    // プレイヤーが「魔法」に興味を示したら
    if (playerInterest.includes('魔法')) {
      const magicSystem = await this.searchFantasyLore('magic systems RPG');
      return {
        newLocation: '魔法学院',
        description: magicSystem,
        newNPC: '大魔導師エルミナ',
        questUnlocked: '失われた呪文書'
      };
    }
    
    return null;
  }
  
  // 他のゲームやファンタジー作品から着想を得る
  private static async searchFantasyLore(topic: string): Promise<string> {
    const { text } = await generateText({
      model: xai('grok-3'),
      prompt: `
      検索して、${topic}に関する面白い設定やアイデアを見つけて、
      このRPGの世界観に合うように翻案してください。
      `,
      tools: { search: webSearchTool }
    });
    
    return text;
  }
}
```

### 3. マルチモーダル体験の実現

#### 3.1 音声入力対応

```typescript
// src/features/VoiceInput.ts

export class VoiceInput {
  private recognition: SpeechRecognition;
  
  constructor() {
    this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    this.recognition.lang = 'ja-JP';
    this.recognition.continuous = false;
  }
  
  async startListening(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };
      
      this.recognition.onerror = reject;
      this.recognition.start();
    });
  }
}

// UIに音声入力ボタンを追加
<button onClick={async () => {
  const voiceInput = new VoiceInput();
  const command = await voiceInput.startListening();
  sendCommand(command);
}}>
  🎤 音声で入力
</button>
```

#### 3.2 感情分析による演出

```typescript
// src/services/EmotionAnalysis.ts

export class EmotionAnalysis {
  static analyzePlayerEmotion(text: string): EmotionState {
    const emotions = {
      aggressive: /攻撃|殺す|倒す|戦う|破壊/,
      fearful: /怖い|逃げる|隠れる|助けて/,
      curious: /なぜ|どうして|調べる|知りたい/,
      friendly: /友達|仲間|助ける|協力/,
      greedy: /金|宝|盗む|奪う/
    };
    
    for (const [emotion, pattern] of Object.entries(emotions)) {
      if (pattern.test(text)) {
        return emotion as EmotionState;
      }
    }
    
    return 'neutral';
  }
  
  // 感情に応じた音楽や効果音を再生
  static async playEmotionalResponse(emotion: EmotionState) {
    const soundMap = {
      aggressive: 'battle-drums.mp3',
      fearful: 'tension-strings.mp3',
      curious: 'mystery-chimes.mp3',
      friendly: 'peaceful-flute.mp3',
      greedy: 'coin-jingle.mp3'
    };
    
    // 効果音を再生
    const audio = new Audio(`/sounds/${soundMap[emotion]}`);
    await audio.play();
  }
}
```

### 4. AIの個性を最大限に活かす

#### 4.1 Grokの皮肉な性格を活用

```typescript
// src/services/GrokPersonality.ts

export class GrokPersonality {
  static async generateSarcasticCommentary(action: string, outcome: string): Promise<string> {
    const prompt = `
    プレイヤーの行動: ${action}
    結果: ${outcome}
    
    Grokらしい皮肉を込めたコメントを1文で。
    例: "勇者が逃げるとは、なんて革新的な戦略だ"
    `;
    
    const { text } = await generateText({
      model: xai('grok-4'),
      prompt,
      temperature: 0.9 // 創造性を高める
    });
    
    return `💭 ${text}`;
  }
}
```

#### 4.2 メタ要素の導入

```typescript
// src/game/MetaElements.ts

export class MetaElements {
  // AIが自己言及する
  static async breakFourthWall(day: number): Promise<string> {
    if (day === 15) {
      return "ナレーター：「正直に言うと、私はAIなんだ。でも君の冒険を面白くするために全力を尽くすよ」";
    }
    
    if (day === 29) {
      return "ナレーター：「明日で終わりか...君との冒険も楽しかったよ。最高のエンディングを一緒に作ろう」";
    }
    
    return null;
  }
  
  // プレイヤーの遊び方を学習
  static async adaptToPlayStyle(history: PlayerAction[]): Promise<string> {
    const style = this.analyzePlayStyle(history);
    
    const styleComments = {
      aggressive: "君は戦闘的だね。魔王も恐れているかも",
      peaceful: "平和的解決を好むんだね。それも一つの勇気だ",
      chaotic: "予測不能な行動...それがAIの私を最も楽しませる",
      strategic: "慎重で計画的。まるでチェスのようだ"
    };
    
    return styleComments[style];
  }
}
```

### 5. パフォーマンス最適化

#### 5.1 並列処理の実装

```typescript
// src/services/ParallelProcessor.ts

export class ParallelProcessor {
  static async processGameTurn(action: string, day: number): Promise<GameResponse> {
    // すべてを並列で処理
    const [
      narrative,
      choices,
      image,
      audio,
      realWorldEvent,
      sarcasticComment
    ] = await Promise.all([
      GrokService.generateNarrative(day, action, gameState),
      GrokService.generateChoices(day, narrative, gameState),
      day % 10 === 0 ? generateSceneImage(narrative, day) : null,
      EnhancedAudioService.autoNarrate(narrative, day),
      RealWorldIntegration.integrateRealWorldEvents(day),
      GrokPersonality.generateSarcasticCommentary(action, narrative)
    ]);
    
    return {
      narrative,
      choices,
      image,
      audio: true,
      specialEvents: realWorldEvent,
      aiComment: sarcasticComment
    };
  }
}
```

## 📊 実装優先順位（改訂版）

### 🔥 P0: 今日中（最優先）
1. **音声自動読み上げ** - すべてのナレーションを音声化
2. **リアルタイム検索統合** - 現実世界の情報を取り込む
3. **並列処理** - レスポンス速度向上

### 📈 P1: 明日朝まで
4. **音声入力** - マイクで命令
5. **感情分析と演出** - プレイヤーの感情に応じた演出
6. **Grokの個性活用** - 皮肉なコメント

### 🎮 P2: 明日中
7. **メタ要素** - AIの自己言及
8. **動的世界拡張** - プレイヤーの興味に応じた世界構築
9. **プレイスタイル適応** - プレイヤーの傾向を学習

## 🎯 成功指標（更新版）

| 機能 | 目標 | 測定方法 |
|------|------|---------|
| 音声読み上げ率 | 80%以上のテキスト | ログ分析 |
| リアルタイム検索 | 1ゲーム5回以上 | API呼び出し数 |
| 音声入力使用率 | 30%以上 | 入力方法の統計 |
| 平均セッション時間 | 30分以上 | アナリティクス |
| 感情的な反応 | 70%のプレイヤー | フィードバック |

## 💡 革新的な機能アイデア

### ストリーミング配信対応
```typescript
// 配信者向け機能
- 視聴者の投票で選択肢を決定
- チャット欄のコメントをゲームに反映
- TwitchやYouTube連携
```

### AI同士の対話
```typescript
// 複数のAIキャラクターが議論
- 村長AI vs 商人AI の議論を見る
- プレイヤーが仲裁役
```

### 時間連動イベント
```typescript
// 現実の時間と連動
- 朝にプレイすると朝のイベント
- 深夜にプレイすると特別な展開
- 週末限定クエスト
```

## 📝 テスト要件

```typescript
// 必須テストケース
describe('Phase 2 Features', () => {
  test('音声が自動再生される', async () => {
    // Day 1のナレーションが音声化されることを確認
  });
  
  test('リアルタイム検索が動作する', async () => {
    // 実際の天気情報が取得できることを確認
  });
  
  test('音声入力が認識される', async () => {
    // 「村長と話す」と音声入力して処理されることを確認
  });
  
  test('感情に応じた演出が発生する', async () => {
    // 攻撃的な入力で戦闘BGMが流れることを確認
  });
  
  test('並列処理でレスポンスが高速化', async () => {
    // 2秒以内にすべての処理が完了することを確認
  });
});
```

## 🚀 実装のポイント

1. **音声を最優先** - 没入感が劇的に向上
2. **リアルタイム検索で差別化** - 他のゲームにない独自性
3. **Grokの個性を前面に** - ただのAIでなく「Grok」として
4. **すべてを並列処理** - 待ち時間を最小化

---

**締切: 本日23:59（延長）**
**デモ: 明日14:00**

これらの機能を実装すれば、**真に革新的なAI駆動型RPG**になります！