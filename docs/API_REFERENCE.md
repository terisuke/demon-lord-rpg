# API リファレンス

## 1. xAI Grok API

### 1.1 エンドポイント

| エンドポイント | 説明 |
|--------------|------|
| `https://api.x.ai/v1` | OpenAI互換ベースURL |
| `/chat/completions` | チャット完了 |
| `/images/generations` | 画像生成 |

### 1.2 モデル一覧

| モデル | 用途 | 入力コスト | 出力コスト | コンテキスト |
|--------|------|------------|------------|-------------|
| `grok-4` | 高品質な物語生成、複雑な推論 | $3.00/1M | $15.00/1M | 256K |
| `grok-3-mini` | 軽量タスク、NPC対話 | $0.30/1M | $0.50/1M | 131K |
| `grok-code-fast-1` | ロジック処理、高速推論 | $0.20/1M | $1.50/1M | 256K |
| `grok-2-image-1212` | 画像生成 | - | $0.07/枚 | - |

### 1.3 認証

```typescript
headers: {
  'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
  'Content-Type': 'application/json'
}
```

### 1.4 レート制限

| モデル | リクエスト/分 | トークン/分 |
|--------|-------------|------------|
| grok-4 | 480 | 2,000,000 |
| grok-3-mini | 1,000 | 5,000,000 |

### 1.5 キャッシュプロンプト

繰り返し使用されるプロンプトに対して**75%のコスト削減**:
- grok-4: $3.00 → $0.75/1Mトークン（入力）
- grok-3-mini: $0.30 → $0.075/1Mトークン（入力）

## 2. AIVIS Cloud API

### 2.1 エンドポイント

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/v1/tts/synthesize` | POST | 音声合成（ストリーミング） |
| `/v1/aivm-models/search` | GET | 利用可能モデル検索 |
| `/v1/aivm-models/{uuid}` | GET | モデル詳細取得 |

### 2.2 リクエスト形式

```typescript
// 音声合成リクエスト
interface SynthesizeRequest {
  model_uuid: string;      // 音声モデルID
  text: string;           // 合成するテキスト
  style_id?: number;      // スタイル（0: ニュートラル）
  output_format: 'mp3' | 'wav' | 'opus';
}
```

### 2.3 認証

```typescript
headers: {
  'Authorization': `Bearer ${process.env.AIVIS_API_KEY}`
}
```

### 2.4 レート制限ヘッダー

```typescript
// レスポンスヘッダー
interface RateLimitHeaders {
  'X-Aivis-RateLimit-Requests-Limit': string;
  'X-Aivis-RateLimit-Requests-Remaining': string;
  'X-Aivis-RateLimit-Requests-Reset': string;
}
```

## 3. Volt Agent API

### 3.1 エージェント作成

```typescript
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { xai } from "@ai-sdk/xai";

const agent = new Agent({
  name: string,              // エージェント名
  instructions: string,      // システムプロンプト
  llm: LLMProvider,         // LLMプロバイダー
  model: ModelInstance,     // モデルインスタンス
  tools?: Tool[],           // オプション: ツール配列
  subAgents?: Agent[],      // オプション: サブエージェント
  memory?: MemoryProvider,  // オプション: メモリプロバイダー
});
```

### 3.2 ツール定義

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";

const tool = createTool({
  name: string,              // ツール名
  description: string,       // 説明
  parameters: ZodSchema,     // パラメータスキーマ
  execute: async (params) => any,  // 実行関数
});
```

### 3.3 ワークフロー

```typescript
import { createWorkflowChain } from "@voltagent/core";

const workflow = createWorkflowChain({
  name: string,
  stateSchema: ZodSchema,
})
.andThen({
  name: string,
  execute: async (state) => state,
  when?: (state) => boolean,  // オプション: 条件
})
.andAgent({
  name: string,
  agent: Agent,
  input: (state) => string,
  output: (state, result) => state,
});
```

## 4. 環境変数

### 4.1 必須

```env
# xAI Grok API
XAI_API_KEY=xa-...

# Node環境
NODE_ENV=development|production
```

### 4.2 オプション

```env
# AIVIS Cloud API（音声機能）
AIVIS_API_KEY=your-key

# ポート設定
PORT=3141

# デバッグ
DEBUG=true
LOG_LEVEL=info|warn|error

# データベース
DATABASE_URL=file:./.voltagent/memory.db

# コスト管理
MAX_IMAGE_GENERATION_COST=10.00
MAX_DAILY_API_COST=50.00
```

## 5. エラーコード

### 5.1 xAI Grok API

| コード | 説明 | 対処法 |
|--------|------|--------|
| 401 | 認証エラー | APIキーを確認 |
| 429 | レート制限 | 指数バックオフで再試行 |
| 500 | サーバーエラー | 再試行 |
| 503 | サービス利用不可 | 待機後再試行 |

### 5.2 AIVIS Cloud API

| コード | 説明 | 対処法 |
|--------|------|--------|
| 400 | 不正なリクエスト | パラメータを確認 |
| 401 | 認証エラー | APIキーを確認 |
| 429 | レート制限 | 待機後再試行 |
| 500 | 内部エラー | サポートに連絡 |

## 6. コスト計算例

### 6.1 1プレイあたりの推定コスト

```typescript
// 30日間のゲームプレイ
const costEstimate = {
  // ストーリー生成（grok-4）
  mainStory: {
    calls: 30,
    tokensPerCall: { input: 2000, output: 500 },
    cost: 30 * (2000 * 3.00 + 500 * 15.00) / 1_000_000
    // = $0.405
  },
  
  // NPC対話（grok-3-mini）
  npcDialogue: {
    calls: 100,
    tokensPerCall: { input: 500, output: 200 },
    cost: 100 * (500 * 0.30 + 200 * 0.50) / 1_000_000
    // = $0.025
  },
  
  // 画像生成（4枚）
  images: {
    count: 4,
    cost: 4 * 0.07
    // = $0.28
  },
  
  // 合計
  total: 0.405 + 0.025 + 0.28
  // = $0.71/プレイ
};
```

### 6.2 キャッシュプロンプト適用後

```typescript
// 75%削減を適用
const optimizedCost = {
  mainStory: 30 * (2000 * 0.75 + 500 * 15.00) / 1_000_000,
  // = $0.27（$0.135削減）
  
  total: 0.27 + 0.025 + 0.28
  // = $0.575/プレイ（19%削減）
};
```

## 7. SDK/ライブラリバージョン

### 7.1 推奨バージョン

```json
{
  "@voltagent/core": "^0.1.86",
  "@voltagent/vercel-ai": "^1.0.0",
  "@ai-sdk/xai": "^2.0.16",
  "ai": "^5.0.33",
  "zod": "^3.25.76"
}
```

### 7.2 Node.js要件

- **最小**: v18.0.0
- **推奨**: v20.0.0以上

---

*このAPIリファレンスは2025年9月時点の情報です。*
*最新情報は各サービスの公式ドキュメントを参照してください。*