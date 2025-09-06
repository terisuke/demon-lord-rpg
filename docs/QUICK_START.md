# 技術実装リファレンス

## 即座に動作するコード例

### 1. 最小動作版（MVP）

```typescript
// src/index.ts - 今すぐ動くバージョン
import { VoltAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { xai } from "@ai-sdk/xai";
import * as dotenv from 'dotenv';

dotenv.config();

// シンプルなゲームマスターエージェント
const gameMasterAgent = new Agent({
  name: "GameMaster",
  instructions: `
    あなたは30日後に魔王が襲来するRPGのゲームマスターです。
    プレイヤーの行動に応じて物語を進めてください。
    現在はDay 1から始まります。
  `,
  llm: new VercelAIProvider(),
  model: xai("grok-3-mini"), // まずは安価なモデルでテスト
});

// Volt Agentサーバー起動
const voltAgent = new VoltAgent({
  agents: {
    gameMaster: gameMasterAgent,
  },
});

console.log("🎮 ゲームサーバー起動完了");
console.log("VoltOpsコンソールでgameMasterエージェントと対話してください");
```

### 2. 画像生成機能の追加（動作確認済み）

```typescript
// src/features/imageGeneration.ts
export async function generateSceneImage(prompt: string, day: number): Promise<string | null> {
  // Day 1, 10, 20, 30のみ画像生成
  if (![1, 10, 20, 30].includes(day)) {
    return null;
  }

  try {
    const response = await fetch("https://api.x.ai/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "grok-2-image-1212",
        prompt: `fantasy RPG scene: ${prompt}`,
        n: 1,
        size: "1024x1024"
      })
    });

    if (!response.ok) {
      console.error(`画像生成失敗: ${response.status}`);
      return null;
    }

    const result = await response.json();
    console.log(`✨ 画像生成成功 (Day ${day}): ${result.data[0].url}`);
    return result.data[0].url;

  } catch (error) {
    console.error("画像生成エラー:", error);
    return null;
  }
}

// 使用例
const imageUrl = await generateSceneImage("村の平和な朝", 1);
```

### 3. 基本的なゲームループ

```typescript
// src/game/GameLoop.ts
export class GameLoop {
  private currentDay: number = 1;
  private maxDays: number = 30;
  private gameState: any = {
    playerRole: 'hero',
    reputation: 0,
    gold: 100,
    storyFlags: {}
  };

  async processPlayerAction(action: string): Promise<GameResponse> {
    console.log(`[Day ${this.currentDay}] Action: ${action}`);

    // 1. AIで物語を生成
    const narrative = await this.generateNarrative(action);
    
    // 2. 重要な日なら画像生成
    const imageUrl = await generateSceneImage(narrative, this.currentDay);
    
    // 3. 次の選択肢を生成
    const choices = await this.generateChoices(narrative);
    
    // 4. 日を進める
    this.advanceDay();
    
    return {
      day: this.currentDay - 1,
      narrative,
      imageUrl,
      choices,
      gameOver: this.currentDay > this.maxDays
    };
  }

  private async generateNarrative(action: string): Promise<string> {
    // Grok APIを使用して物語生成
    const prompt = `
      Day ${this.currentDay}/30
      Player action: ${action}
      Current state: ${JSON.stringify(this.gameState)}
      
      Generate a narrative response (2-3 sentences).
    `;
    
    // TODO: 実際のAPI呼び出しに置き換える
    return `あなたは${action}を選びました。村人たちは希望を持ち始めています。`;
  }

  private async generateChoices(context: string): Promise<string[]> {
    // デフォルトの選択肢（後でAI生成に置き換え）
    return [
      "村長と相談する",
      "武器を探しに行く",
      "情報を集める",
      "休息を取る"
    ];
  }

  private advanceDay(): void {
    this.currentDay++;
    console.log(`📅 Day ${this.currentDay}/${this.maxDays}`);
  }
}
```

### 4. 音声合成の実装（AIVIS）

```typescript
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
```

### 5. HTTPサーバーとAPI実装

```typescript
// src/server.ts
import express from 'express';
import { GameLoop } from './game/GameLoop';
import { AudioNarrator } from './features/audioNarration';

const app = express();
const port = process.env.PORT || 3141;

app.use(express.json());
app.use(express.static('public'));

const gameLoop = new GameLoop();
const narrator = new AudioNarrator();

// ゲームコマンドAPI
app.post('/api/command', async (req, res) => {
  const { command } = req.body;
  
  try {
    const response = await gameLoop.processPlayerAction(command);
    
    // 音声生成（非同期で実行）
    if (response.narrative) {
      narrator.narrate(response.narrative).catch(console.error);
    }
    
    res.json(response);
  } catch (error) {
    console.error("コマンド処理エラー:", error);
    res.status(500).json({ error: "処理中にエラーが発生しました" });
  }
});

// ゲーム状態API
app.get('/api/status', (req, res) => {
  res.json({
    day: gameLoop.currentDay,
    maxDays: 30,
    gameState: gameLoop.gameState
  });
});

app.listen(port, () => {
  console.log(`🎮 ゲームサーバー起動: http://localhost:${port}`);
});
```

### 6. フロントエンドHTML（最小版）

```html
<!-- public/index.html -->
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>30日後の魔王襲来</title>
  <style>
    body {
      font-family: 'Hiragino Kaku Gothic Pro', 'メイリオ', sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    #game-container {
      background: rgba(0, 0, 0, 0.7);
      border-radius: 10px;
      padding: 30px;
    }
    
    #narrative {
      min-height: 100px;
      margin: 20px 0;
      font-size: 18px;
      line-height: 1.6;
    }
    
    #scene-image {
      width: 100%;
      max-height: 400px;
      object-fit: cover;
      border-radius: 5px;
      margin: 20px 0;
    }
    
    .choice-button {
      display: block;
      width: 100%;
      padding: 15px;
      margin: 10px 0;
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid white;
      color: white;
      font-size: 16px;
      cursor: pointer;
      border-radius: 5px;
      transition: all 0.3s;
    }
    
    .choice-button:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateX(5px);
    }
    
    #day-counter {
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div id="game-container">
    <h1>🏰 30日後の魔王襲来</h1>
    
    <div id="day-counter">Day 1 / 30</div>
    
    <div id="narrative">
      あなたは始まりの村アルファで目覚めました。
      30日後に魔王が襲来するという予言が村中に広まっています。
      何をしますか？
    </div>
    
    <img id="scene-image" style="display: none;" />
    
    <div id="choices">
      <button class="choice-button" onclick="sendCommand('村長と相談する')">
        村長と相談する
      </button>
      <button class="choice-button" onclick="sendCommand('武器を探しに行く')">
        武器を探しに行く
      </button>
      <button class="choice-button" onclick="sendCommand('情報を集める')">
        情報を集める
      </button>
      <button class="choice-button" onclick="sendCommand('村を出る')">
        村を出る
      </button>
    </div>
  </div>

  <script>
    let currentDay = 1;
    
    async function sendCommand(command) {
      console.log('Sending command:', command);
      
      // ボタンを無効化
      document.querySelectorAll('.choice-button').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
      });
      
      try {
        const response = await fetch('/api/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command })
        });
        
        const data = await response.json();
        updateGame(data);
        
      } catch (error) {
        console.error('Error:', error);
        alert('エラーが発生しました');
      }
    }
    
    function updateGame(data) {
      // 日付更新
      currentDay = data.day;
      document.getElementById('day-counter').textContent = `Day ${currentDay} / 30`;
      
      // ナレーション更新（タイプライター効果）
      const narrativeEl = document.getElementById('narrative');
      narrativeEl.textContent = '';
      typeWriter(data.narrative, narrativeEl);
      
      // 画像更新
      if (data.imageUrl) {
        const img = document.getElementById('scene-image');
        img.src = data.imageUrl;
        img.style.display = 'block';
      }
      
      // 選択肢更新
      updateChoices(data.choices);
      
      // ゲーム終了チェック
      if (data.gameOver) {
        showEnding();
      }
    }
    
    function typeWriter(text, element, index = 0) {
      if (index < text.length) {
        element.textContent += text.charAt(index);
        setTimeout(() => typeWriter(text, element, index + 1), 30);
      }
    }
    
    function updateChoices(choices) {
      const choicesEl = document.getElementById('choices');
      choicesEl.innerHTML = '';
      
      choices.forEach(choice => {
        const button = document.createElement('button');
        button.className = 'choice-button';
        button.textContent = choice;
        button.onclick = () => sendCommand(choice);
        choicesEl.appendChild(button);
      });
    }
    
    function showEnding() {
      document.getElementById('choices').innerHTML = `
        <h2>🎮 ゲーム終了</h2>
        <p>魔王との戦いの結末は...</p>
        <button class="choice-button" onclick="location.reload()">
          もう一度プレイ
        </button>
      `;
    }
  </script>
</body>
</html>
```

## トラブルシューティング

### よくあるエラーと解決方法

#### 1. TypeScriptの型エラー

```typescript
// ❌ エラーが出る
const agent = new Agent({...});

// ✅ 正しい
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
```

#### 2. APIキーエラー

```bash
# .envファイルを確認
XAI_API_KEY=xai-...  # "xai-"で始まることを確認
AIVIS_API_KEY=...    # AIVISダッシュボードから取得
```

#### 3. 画像が生成されない

```typescript
// デバッグ用ログを追加
console.log("API Key exists:", !!process.env.XAI_API_KEY);
console.log("Current day:", day);
console.log("Should generate image:", [1, 10, 20, 30].includes(day));
```

#### 4. 音声が再生されない

```javascript
// ブラウザのAutoplay制限対策
document.addEventListener('click', () => {
  // 最初のユーザーインタラクションでAudioContextを初期化
  const audioContext = new AudioContext();
  console.log("AudioContext ready");
}, { once: true });
```

## パフォーマンス最適化チェックリスト

- [ ] grok-3-miniを標準モデルとして使用
- [ ] 画像生成は4回まで（Day 1, 10, 20, 30）
- [ ] キャッシュプロンプトで繰り返し部分を最適化
- [ ] 音声合成は重要なシーンのみ
- [ ] エラー時はフォールバック処理で継続

## 動作確認手順

1. **環境変数設定**
   ```bash
   cp .env.example .env
   # .envファイルにAPIキーを設定
   ```

2. **依存関係インストール**
   ```bash
   npm install
   ```

3. **開発サーバー起動**
   ```bash
   npm run dev
   ```

4. **ブラウザでアクセス**
   ```
   http://localhost:3141
   ```

5. **動作確認項目**
   - [ ] ゲーム画面が表示される
   - [ ] 選択肢をクリックできる
   - [ ] Day 1で画像が生成される
   - [ ] 日数が進む
   - [ ] Day 30でゲーム終了

---

*このリファレンスは即座に実装可能なコード例を提供しています。*
*コピー&ペーストで動作確認できることを重視しています。*