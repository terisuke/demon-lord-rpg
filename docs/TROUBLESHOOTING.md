# トラブルシューティングガイド

## 1. Volt Agent関連

### エラー: `No memory manager available`

**原因**: MemoryManagerが初期化されていない、またはワークフローに設定されていない

**解決法**:
```typescript
import { MemoryManager, InMemoryStorage } from '@voltagent/core';

// MemoryManagerを初期化
const memoryManager = new MemoryManager(new InMemoryStorage());

// ワークフローに設定
const workflow = createWorkflow({
  name: "my-workflow",
  memory: memoryManager,  // これが重要
  // ...
});
```

### エラー: `Agent requires 1 type argument(s)`

**原因**: TypeScriptの型パラメータが不足

**解決法**:
```typescript
// ❌ 間違い
class MyAgent extends Agent { }

// ✅ 正しい
class MyAgent extends Agent<VercelAIProvider> { }
```

### エラー: `Property 'generateText' does not exist`

**原因**: Agentクラスのメソッドを正しく継承していない

**解決法**:
```typescript
class MyAgent extends Agent<VercelAIProvider> {
  async generateResponse(messages: any[]) {
    // superを使用して親クラスのメソッドを呼び出す
    return await super.generateText({ messages });
  }
}
```

### エラー: `delegate_task tool not available`

**原因**: subAgentsが正しく設定されていない

**解決法**:
```typescript
const supervisorAgent = new Agent({
  name: "Supervisor",
  // ...
  subAgents: [agent1, agent2], // 配列として渡す
});
```

## 2. Grok API関連

### エラー: `401 Unauthorized`

**原因**: APIキーが無効または設定されていない

**解決法**:
1. `.env`ファイルを確認
   ```env
   XAI_API_KEY=xa-... # 正しいキーか確認
   ```
2. 環境変数が読み込まれているか確認
   ```typescript
   console.log(process.env.XAI_API_KEY); // undefined でないか
   ```
3. xAI Consoleで新しいキーを生成

### エラー: `429 Too Many Requests`

**原因**: レート制限に達した

**解決法**:
```typescript
// 指数バックオフで再試行
async function retryWithBackoff(fn: () => Promise<any>, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.status === 429 && i < retries - 1) {
        const waitTime = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
}
```

### エラー: `Model not found: grok-4-heavy`

**原因**: grok-4-heavyは特別なサブスクリプションが必要

**解決法**:
```typescript
// 標準APIで利用可能なモデルを使用
const model = xai('grok-4');  // grok-4-heavyではなくgrok-4を使用
```

### 画像生成でコストが高すぎる

**原因**: 無制限に画像を生成している

**解決法**:
```typescript
class ImageGenerator {
  private budget = 0.28; // $0.28/プレイ（4枚）
  private generated = 0;
  
  async generate(prompt: string) {
    if (this.generated >= 4) {
      throw new Error('画像生成の上限に達しました');
    }
    // 生成処理...
    this.generated++;
  }
}
```

## 3. AIVIS Cloud API関連

### エラー: `AudioContext was not allowed to start`

**原因**: ユーザーインタラクションなしでAudioContextを初期化

**解決法**:
```typescript
// ユーザーアクション後に初期化
document.addEventListener('click', () => {
  if (!this.audioContext) {
    this.audioContext = new AudioContext();
  }
}, { once: true });
```

### 音声が途切れる

**原因**: バッファリング不足またはネットワーク遅延

**解決法**:
```typescript
class AudioPlayer {
  private minBufferSize = 3; // 最低3チャンクバッファ
  
  async processStream(reader: ReadableStreamDefaultReader) {
    // 最初にバッファを貯める
    while (this.audioQueue.length < this.minBufferSize) {
      const { done, value } = await reader.read();
      if (done) break;
      this.audioQueue.push(value.buffer);
    }
    // その後再生開始
    this.startPlayback();
  }
}
```

### エラー: `Failed to decode audio data`

**原因**: 不正な音声フォーマットまたは破損したデータ

**解決法**:
```typescript
try {
  const audioBuffer = await audioContext.decodeAudioData(buffer);
} catch (error) {
  console.error('デコードエラー:', error);
  // 次のチャンクをスキップして継続
  continue;
}
```

## 4. TypeScript関連

### エラー: `Cannot find module '@/agents'`

**原因**: パスエイリアスが正しく設定されていない

**解決法**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### エラー: `Type 'string' is not assignable to type 'never'`

**原因**: 型推論が失敗している

**解決法**:
```typescript
// 明示的に型を指定
const choices: Choice[] = [
  { id: '1', text: '選択肢1' } as Choice
];
```

## 5. パフォーマンス問題

### APIレスポンスが遅い

**原因**: 重いモデルを全てのタスクに使用

**解決法**:
```typescript
// タスクに応じたモデル選択
function selectModel(complexity: number): string {
  if (complexity > 8) return 'grok-4';
  if (complexity > 5) return 'grok-code-fast-1';
  return 'grok-3-mini';
}
```

### メモリリーク

**原因**: イベントリスナーやストリームが解放されていない

**解決法**:
```typescript
class Component {
  private listeners: (() => void)[] = [];
  
  cleanup() {
    // 全てのリスナーを解除
    this.listeners.forEach(remove => remove());
    // ストリームを閉じる
    this.stream?.cancel();
  }
}
```

## 6. 開発環境の問題

### `npm run dev`が動作しない

**原因**: 依存関係の不整合

**解決法**:
```bash
# クリーンインストール
rm -rf node_modules package-lock.json
npm install

# TypeScriptのビルドエラーを確認
npm run typecheck
```

### 環境変数が読み込まれない

**原因**: `.env`ファイルの位置または形式が間違っている

**解決法**:
1. `.env`ファイルがプロジェクトルートにあるか確認
2. 改行コードがLF（Unix形式）か確認
3. dotenvが正しく初期化されているか確認
   ```typescript
   import dotenv from 'dotenv';
   dotenv.config(); // 最初に実行
   ```

## 7. デバッグテクニック

### API呼び出しのログ

```typescript
// 開発環境でのみログを有効化
if (process.env.NODE_ENV === 'development') {
  console.log('API Request:', {
    model,
    tokens: { input: inputTokens, output: outputTokens },
    cost: estimatedCost
  });
}
```

### VoltOpsコンソールの活用

```bash
# VoltOpsでエージェントの動作を可視化
npm run dev
# ブラウザで表示されるVoltOpsリンクを開く
```

### エラー境界の設定

```typescript
try {
  // 危険な処理
} catch (error) {
  console.error('詳細なエラー情報:', {
    message: error.message,
    stack: error.stack,
    context: { /* 関連情報 */ }
  });
  // フォールバック処理
}
```

---

*問題が解決しない場合は、GitHubのIssuesに詳細なエラー情報と再現手順を記載してください。*