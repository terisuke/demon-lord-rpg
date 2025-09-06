# 実装ガイド - 30日後の魔王襲来

## 目次
1. [Volt Agent実装詳細](#1-volt-agent実装詳細)
2. [Grok API統合](#2-grok-api統合)
3. [画像生成機能](#3-画像生成機能)
4. [AIVIS Cloud API音声合成](#4-aivis-cloud-api音声合成)
5. [コスト最適化戦略](#5-コスト最適化戦略)
6. [エラーハンドリング](#6-エラーハンドリング)

---

## 1. Volt Agent実装詳細

### 1.1 プロジェクト初期化

```bash
# Volt Agentプロジェクトの作成
npm create voltagent-app@latest demon-lord-rpg

# 対話形式のプロンプト：
# ? Project Name: demon-lord-rpg
# ? AI Provider: OpenAI（一時的に選択、後でGrokに変更）
# ? API Key: （スキップ - Enterキー）
# ? Package Manager: npm
```

生成されるファイル構造：
```
demon-lord-rpg/
├── src/
│   └── index.ts        # メインのアプリケーションコード
├── .env                # 環境変数ファイル
├── package.json        # プロジェクトの依存関係
└── tsconfig.json       # TypeScript設定
```

### 1.2 Grok統合（2つの方法）

#### 方法A: Vercel AI SDK経由（推奨）

**堅牢でコミュニティサポートが充実**

```bash
npm install @voltagent/core @voltagent/vercel-ai @ai-sdk/xai
```

```typescript
// src/agents/GameMasterAgent.ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { xai } from "@ai-sdk/xai";

export class GameMasterAgent extends Agent {
  constructor() {
    super({
      name: "GameMaster",
      instructions: `
        あなたは『銀河ヒッチハイク・ガイド』にインスパイアされた、
        機知に富んだ創造的なストーリーテラーです。
        30日後に魔王が襲来する世界で、プレイヤーの選択に応じて
        複雑で分岐する物語を生成してください。
      `,
      llm: new VercelAIProvider(),
      model: xai("grok-4"), // 高品質な物語生成用
    });
  }

  // カスタムメソッドの追加
  async generateNarrative(context: string): Promise<string> {
    const response = await this.generateText({
      messages: [
        { role: "system", content: this.instructions },
        { role: "user", content: context }
      ]
    });
    return response.text;
  }
}
```

#### 方法B: OpenAI互換API（軽量）

**パフォーマンス重視のアプリケーション向け**

```bash
npm install @voltagent/core @voltagent/xsai
```

```typescript
// src/agents/NPCAgent.ts
import { Agent } from "@voltagent/core";
import { XsaiProvider } from "@voltagent/xsai";

export class NPCAgent extends Agent {
  constructor(npcName: string, personality: string) {
    super({
      name: npcName,
      instructions: personality,
      llm: new XsaiProvider({
        baseURL: "https://api.x.ai/v1", // xAI OpenAI互換エンドポイント
        apiKey: process.env.XAI_API_KEY,
      }),
      model: "grok-3-mini", // NPCにはコスト効率の良いモデル
    });
  }
}
```

### 1.3 Supervisor/Sub-agentパターン

**複雑な協調タスクのための階層的エージェント構造**

```typescript
// src/agents/SupervisorAgent.ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { xai } from "@ai-sdk/xai";

export class SupervisorAgent extends Agent {
  constructor(subAgents: Agent[]) {
    super({
      name: "Supervisor",
      instructions: `
        あなたはゲーム全体を統括するSupervisorです。
        ユーザーのリクエストを分析し、適切なSub-agentにタスクを委任してください。
        
        利用可能なエージェント：
        - WorldLoreAgent: 世界設定、歴史、事実に関する質問
        - NPCAgent: キャラクターとの対話
        - ImageGeneratorAgent: 視覚的コンテンツの生成
        
        複数のステップが必要な場合は、以下の手順を厳密に守ってください：
        1. まず最初のエージェントにタスクを委任
        2. その結果を受け取って分析
        3. 必要に応じて次のエージェントに委任
      `,
      llm: new VercelAIProvider(),
      model: xai("grok-3-mini"),
      subAgents: subAgents, // 自動的にdelegate_taskツールが生成される
    });
  }
}

// Sub-agentの例
export class WorldLoreAgent extends Agent {
  constructor() {
    super({
      name: "WorldLoreAgent",
      instructions: "魔王襲来の世界の歴史と設定を管理します。",
      llm: new VercelAIProvider(),
      model: xai("grok-3"),
      tools: [
        {
          name: "search_lore",
          description: "世界設定を検索",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string" }
            }
          },
          execute: async ({ query }) => {
            // 世界設定データベースから検索
            return { result: "検索結果..." };
          }
        }
      ]
    });
  }
}
```

### 1.4 ワークフローエンジンによる決定論的プロセス

**予測可能で信頼性の高いゲームフローの実装**

```typescript
// src/workflows/GameProgressWorkflow.ts
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

// ワークフローの状態スキーマ
const GameStateSchema = z.object({
  currentDay: z.number(),
  playerAction: z.string(),
  narrativeText: z.string().optional(),
  imageUrl: z.string().optional(),
  audioUrl: z.string().optional(),
  nextChoices: z.array(z.string()).optional(),
});

export const gameProgressWorkflow = createWorkflowChain({
  name: "GameProgress",
  stateSchema: GameStateSchema,
})
// ステップ1: プレイヤーアクションの検証
.andThen({
  name: "ValidateAction",
  execute: async (state) => {
    console.log(`🎮 Day ${state.currentDay}: ${state.playerAction}`);
    
    // アクションの妥当性をチェック
    if (state.playerAction.length < 1) {
      throw new Error("無効なアクション");
    }
    
    return state;
  },
})
// ステップ2: AIエージェントによる物語生成
.andAgent({
  name: "GenerateNarrative",
  agent: new GameMasterAgent(),
  input: (state) => `Day ${state.currentDay}: ${state.playerAction}`,
  output: (state, agentOutput) => ({
    ...state,
    narrativeText: agentOutput,
  }),
})
// ステップ3: 重要な日に画像生成
.andAgent({
  name: "GenerateImage",
  agent: new ImageGeneratorAgent(),
  input: (state) => state.narrativeText || "",
  output: (state, agentOutput) => ({
    ...state,
    imageUrl: agentOutput,
  }),
  when: (state) => [1, 10, 20, 30].includes(state.currentDay),
})
// ステップ4: 音声合成
.andThen({
  name: "SynthesizeAudio",
  execute: async (state) => {
    if ([1, 10, 20, 30].includes(state.currentDay)) {
      // AIVIS APIを呼び出し（後述）
      const audioUrl = await synthesizeNarration(state.narrativeText);
      return { ...state, audioUrl };
    }
    return state;
  },
})
// ステップ5: 次の選択肢を生成
.andAgent({
  name: "GenerateChoices",
  agent: new GameMasterAgent(),
  input: (state) => `現在の状況: ${state.narrativeText}`,
  output: (state, agentOutput) => ({
    ...state,
    nextChoices: JSON.parse(agentOutput),
  }),
});
```

---

## 2. Grok API統合

### 2.1 APIキー管理

```bash
# .envファイル
XAI_API_KEY="xai-..."  # console.x.aiから取得

# セキュリティ: 絶対にコミットしない
echo ".env" >> .gitignore
```

### 2.2 モデル仕様と価格

| モデル | 能力 | コンテキスト | 入力コスト(/1M) | 出力コスト(/1M) | 用途 |
|--------|------|-------------|----------------|----------------|------|
| grok-4 | 最高性能 | 256,000 | $3.00 | $15.00 | 複雑な物語生成 |
| grok-code-fast-1 | 高速推論 | 256,000 | $0.20 | $1.50 | ゲームロジック |
| grok-3 | バランス型 | 131,072 | $3.00 | $15.00 | データ抽出 |
| grok-3-mini | 軽量 | 131,072 | $0.30 | $0.50 | NPC対話 |
| grok-2-image-1212 | 画像生成 | - | - | $0.07/枚 | ビジュアル |

### 2.3 構造化出力による堅牢な実装

```typescript
// src/services/GrokStructuredOutput.ts
import { generateObject } from "ai";
import { xai } from "@ai-sdk/xai";
import { z } from "zod";

// ゲームの選択肢を生成
const GameChoiceSchema = z.object({
  text: z.string().max(50).describe("選択肢のテキスト"),
  consequence: z.string().describe("選択の結果"),
  requiredRole: z.enum(['hero', 'merchant', 'coward', 'traitor']).optional(),
  requiredStats: z.object({
    minReputation: z.number().optional(),
    minGold: z.number().optional(),
  }).optional(),
});

export async function generateGameChoices(context: string, playerState: any) {
  const { object } = await generateObject({
    model: xai('grok-code-fast-1'), // ロジック処理には高速モデル
    schema: z.array(GameChoiceSchema).max(4),
    prompt: `
      現在の状況: ${context}
      プレイヤー状態: ${JSON.stringify(playerState)}
      
      この状況で取りうる選択肢を4つ生成してください。
      プレイヤーのロールに応じた特別な選択肢も含めてください。
    `,
  });
  
  return object;
}
```

### 2.4 キャッシュプロンプトによるコスト削減

```typescript
// src/utils/PromptCache.ts
export class PromptCacheManager {
  // 繰り返し使用される静的プロンプト
  private static readonly CACHED_PROMPTS = {
    WORLD_SETTING: `
      【世界観】30日後に魔王が襲来する中世ファンタジー世界
      【舞台】始まりの村アルファ、人口約500人
      【重要NPC】
      - 村長モーガン（賢明な老人、元冒険者）
      - 商人グロム（情報通、やや強欲）
      - 賢者エララ（古代魔法の知識を持つ）
      【ゲームルール】
      - 1日1アクション
      - 30日後に魔王襲来
      - 複数のエンディング存在
    `,
    CHARACTER_ROLES: `
      【選択可能な役割】
      - 英雄: 戦闘力+10、評判+5
      - 商人: ゴールド+1000、交渉力+10
      - 臆病者: 逃走成功率+50%
      - 裏切り者: 闇の評判+10、裏ルート解放
    `
  };

  // キャッシュ使用で75%コスト削減
  // grok-4: $3.00 → $0.75/1Mトークン（入力）
  static buildPromptWithCache(dynamicContent: string): string {
    return `
      ${this.CACHED_PROMPTS.WORLD_SETTING}
      ${this.CACHED_PROMPTS.CHARACTER_ROLES}
      
      [動的コンテンツ]
      ${dynamicContent}
    `;
  }
}
```

---

## 3. 画像生成機能

### 3.1 ImageGeneratorAgent実装

```typescript
// src/agents/ImageGeneratorAgent.ts
import { Agent, createTool } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { xai } from "@ai-sdk/xai";
import { z } from "zod";

export class ImageGeneratorAgent extends Agent {
  private generationCount = 0;
  private readonly COST_PER_IMAGE = 0.07; // $0.07/枚
  private readonly MAX_IMAGES_PER_GAME = 4; // Day 1, 10, 20, 30
  
  constructor() {
    super({
      name: "ImageGenerator",
      instructions: "ファンタジーRPGの世界観に合った画像を生成します。",
      llm: new VercelAIProvider(),
      model: xai("grok-2-image-1212"),
      tools: [
        createTool({
          name: "generate_scene_image",
          description: "ゲームシーンの画像を生成",
          parameters: z.object({
            prompt: z.string().describe("画像の詳細な説明"),
            style: z.enum(['epic', 'dark', 'hopeful', 'mysterious']).optional(),
          }),
          execute: async ({ prompt, style = 'epic' }) => {
            // 生成上限チェック
            if (this.generationCount >= this.MAX_IMAGES_PER_GAME) {
              return { 
                success: false, 
                error: "画像生成の上限に達しました" 
              };
            }

            try {
              // Grok画像生成API呼び出し
              const response = await fetch("https://api.x.ai/v1/images/generations", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  model: "grok-2-image-1212",
                  prompt: `${style} fantasy RPG art, ${prompt}`,
                  n: 1,
                  size: "1024x1024"
                })
              });

              if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
              }

              const result = await response.json();
              this.generationCount++;

              return {
                success: true,
                imageUrl: result.data[0].url,
                cost: this.COST_PER_IMAGE,
                remainingGenerations: this.MAX_IMAGES_PER_GAME - this.generationCount
              };

            } catch (error) {
              console.error("画像生成エラー:", error);
              return { 
                success: false, 
                error: error.message 
              };
            }
          }
        })
      ]
    });
  }

  // 重要な日のみ画像生成を許可するヘルパーメソッド
  async generateForDay(day: number, context: string): Promise<string | null> {
    const IMPORTANT_DAYS = [1, 10, 20, 30];
    
    if (!IMPORTANT_DAYS.includes(day)) {
      return null;
    }

    const styleMap = {
      1: 'hopeful',    // 始まりの日
      10: 'mysterious', // 中盤の謎
      20: 'dark',      // 危機の接近
      30: 'epic'       // 最終決戦
    };

    const result = await this.tools[0].execute({
      prompt: context,
      style: styleMap[day]
    });

    return result.success ? result.imageUrl : null;
  }
}
```

---

## 4. AIVIS Cloud API音声合成

### 4.1 APIサービス実装

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
   * リアルタイムストリーミング音声合成
   * LLMとの連携に最適化された低レイテンシ実装
   */
  async synthesizeSpeech(
    text: string,
    modelUuid: string = 'default-jp-001',
    styleId: number = 0
  ): Promise<ReadableStream> {
    const requestBody = {
      model_uuid: modelUuid,
      text: text,
      style_id: styleId, // 0:ニュートラル, 1:希望, 4:緊迫
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
      throw new Error('ストリームが返されませんでした');
    }

    return Readable.fromWeb(response.body as any);
  }

  /**
   * 利用可能な音声モデルを検索
   */
  async searchModels(keyword?: string, tags?: string[]) {
    const params = new URLSearchParams();
    if (keyword) params.append('keyword', keyword);
    if (tags) tags.forEach(tag => params.append('tags', tag));

    const response = await fetch(
      `${this.baseUrl}/aivm-models/search?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('モデル検索に失敗しました');
    }

    return response.json();
  }
}
```

### 4.2 Web Audio APIによるストリーミング再生

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
   * fetch APIでストリームを取得し、チャンクごとに処理
   */
  async playStream(url: string): Promise<void> {
    const response = await fetch(url);
    if (!response.body) {
      throw new Error('ストリームが取得できません');
    }

    const reader = response.body.getReader();
    
    // チャンクを逐次処理
    const processChunk = async () => {
      const { done, value } = await reader.read();
      if (done) return;

      // Uint8ArrayをArrayBufferに変換してキューに追加
      this.audioQueue.push(value.buffer);
      
      if (!this.isPlaying) {
        this.schedulePlayback();
      }
      
      await processChunk();
    };

    await processChunk();
  }

  /**
   * AudioBufferSourceNodeを使用したシームレス再生
   */
  private async schedulePlayback(): Promise<void> {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const bufferToDecode = this.audioQueue.shift()!;

    try {
      // 音声データをデコード
      const audioBuffer = await this.audioContext.decodeAudioData(bufferToDecode);
      
      // ソースノードを作成
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // ゲインノードでボリューム制御
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = this.currentVolume;
      
      // 接続: source -> gain -> destination
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // 前のチャンクの終了時刻に合わせて再生をスケジュール
      const currentTime = this.audioContext.currentTime;
      const startTime = Math.max(currentTime, this.nextPlayTime);
      
      source.start(startTime);
      
      // 次の再生時刻を更新
      this.nextPlayTime = startTime + audioBuffer.duration;
      
      // 再生終了時に次のチャンクを処理
      source.onended = () => {
        this.schedulePlayback();
      };
      
    } catch (error) {
      console.error('音声デコードエラー:', error);
      this.isPlaying = false;
    }
  }

  setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
  }

  stop() {
    this.audioQueue = [];
    this.isPlaying = false;
    this.nextPlayTime = 0;
  }
}
```

### 4.3 料金体系とレート制限

| プラン | 料金 | 状況 | 備考 |
|--------|------|------|------|
| **無料ベータ** | **¥0** | **現在提供中** | 完全無料で全機能利用可能 |
| 従量課金（予定） | 未定 | 正式リリース後 | - |
| 月額固定（予定） | 未定 | 正式リリース後 | レート制限付き |
| 法人向け | 月額制 | 利用可能 | Citorasオンプレミス版 |

レート制限ヘッダー：
```typescript
// APIレスポンスヘッダー
interface RateLimitHeaders {
  'X-Aivis-RateLimit-Requests-Limit': string;     // 最大リクエスト数
  'X-Aivis-RateLimit-Requests-Remaining': string;  // 残りリクエスト数  
  'X-Aivis-RateLimit-Requests-Reset': string;      // リセットまでの秒数
}
```

---

## 5. コスト最適化戦略

### 5.1 動的モデルルーティング

```typescript
// src/services/ModelRouter.ts
type TaskType = 'NARRATIVE' | 'LOGIC' | 'NPC' | 'IMAGE' | 'SEARCH';
type ModelChoice = {
  model: string;
  reasoning: string;
  estimatedCost: number;
};

export class ModelRouter {
  /**
   * タスクの複雑さに応じて最適なモデルを選択
   */
  static selectOptimalModel(
    taskType: TaskType,
    complexity: number,
    budget?: number
  ): ModelChoice {
    // 基本的な選択ロジック
    const modelMatrix = {
      NARRATIVE: {
        high: { model: 'grok-4', cost: 18.00 },       // 複雑な物語
        medium: { model: 'grok-3', cost: 18.00 },     // 標準的な物語
        low: { model: 'grok-3-mini', cost: 0.80 }     // 簡単な説明
      },
      LOGIC: {
        high: { model: 'grok-code-fast-1', cost: 1.70 }, // 複雑なロジック
        medium: { model: 'grok-code-fast-1', cost: 1.70 },
        low: { model: 'grok-3-mini', cost: 0.80 }
      },
      NPC: {
        high: { model: 'grok-3-mini', cost: 0.80 },   // すべてのNPCは軽量モデル
        medium: { model: 'grok-3-mini', cost: 0.80 },
        low: { model: 'grok-3-mini', cost: 0.80 }
      },
      IMAGE: {
        high: { model: 'grok-2-image-1212', cost: 0.07 },
        medium: { model: 'grok-2-image-1212', cost: 0.07 },
        low: { model: 'grok-2-image-1212', cost: 0.07 }
      },
      SEARCH: {
        high: { model: 'grok-3', cost: 18.00 },
        medium: { model: 'grok-3-mini', cost: 0.80 },
        low: { model: 'grok-3-mini', cost: 0.80 }
      }
    };

    // 複雑さレベルの判定
    let level: 'high' | 'medium' | 'low';
    if (complexity > 7) level = 'high';
    else if (complexity > 4) level = 'medium';
    else level = 'low';

    // 予算制約がある場合の調整
    if (budget && modelMatrix[taskType][level].cost > budget) {
      level = 'low'; // 最も安価なモデルにフォールバック
    }

    const choice = modelMatrix[taskType][level];
    
    return {
      model: choice.model,
      reasoning: `Task: ${taskType}, Complexity: ${complexity}/10, Level: ${level}`,
      estimatedCost: choice.cost
    };
  }
}
```

### 5.2 使用量トラッキングとコスト監視

```typescript
// src/monitoring/CostTracker.ts
export class CostTracker {
  private usage = {
    models: {
      'grok-4': { inputTokens: 0, outputTokens: 0 },
      'grok-3': { inputTokens: 0, outputTokens: 0 },
      'grok-3-mini': { inputTokens: 0, outputTokens: 0 },
      'grok-code-fast-1': { inputTokens: 0, outputTokens: 0 },
    },
    images: 0,
    totalCost: 0,
    sessionStart: new Date()
  };

  // モデル別の料金表（1Mトークンあたり）
  private readonly PRICING = {
    'grok-4': { input: 3.00, output: 15.00 },
    'grok-3': { input: 3.00, output: 15.00 },
    'grok-3-mini': { input: 0.30, output: 0.50 },
    'grok-code-fast-1': { input: 0.20, output: 1.50 },
  };

  trackUsage(model: string, inputTokens: number, outputTokens: number) {
    if (model in this.usage.models) {
      this.usage.models[model].inputTokens += inputTokens;
      this.usage.models[model].outputTokens += outputTokens;
      
      const pricing = this.PRICING[model];
      const cost = (
        (inputTokens * pricing.input / 1_000_000) +
        (outputTokens * pricing.output / 1_000_000)
      );
      
      this.usage.totalCost += cost;
    }
  }

  trackImageGeneration() {
    this.usage.images++;
    this.usage.totalCost += 0.07;
  }

  getSessionReport() {
    const duration = (Date.now() - this.usage.sessionStart.getTime()) / 1000 / 60; // 分
    
    return {
      duration: `${Math.round(duration)} minutes`,
      totalCost: `$${this.usage.totalCost.toFixed(4)}`,
      imageCount: this.usage.images,
      breakdown: Object.entries(this.usage.models).map(([model, usage]) => ({
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cost: this.calculateModelCost(model, usage)
      })),
      costPerMinute: `$${(this.usage.totalCost / duration).toFixed(4)}`,
      projectedDailyCost: `$${(this.usage.totalCost / duration * 1440).toFixed(2)}`
    };
  }

  private calculateModelCost(model: string, usage: any): string {
    const pricing = this.PRICING[model];
    const cost = (
      (usage.inputTokens * pricing.input / 1_000_000) +
      (usage.outputTokens * pricing.output / 1_000_000)
    );
    return `$${cost.toFixed(4)}`;
  }
}
```

---

## 6. エラーハンドリング

### 6.1 包括的なエラー処理戦略

```typescript
// src/utils/ErrorHandler.ts
export class GameErrorHandler {
  private retryConfig = {
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelay: 1000,
  };

  /**
   * APIエラーの統一処理
   */
  async handleAPIError(
    error: any,
    context: string,
    retryCallback?: () => Promise<any>
  ): Promise<any> {
    console.error(`[${context}] エラー発生:`, error);

    // エラータイプの判定
    const errorType = this.classifyError(error);

    switch (errorType) {
      case 'RATE_LIMIT':
        return this.handleRateLimit(error, retryCallback);
      
      case 'NETWORK':
        return this.handleNetworkError(error, retryCallback);
      
      case 'AUTH':
        throw new Error('認証エラー: APIキーを確認してください');
      
      case 'SERVER':
        return this.handleServerError(error, retryCallback);
      
      default:
        // 不明なエラーはフォールバック処理
        return this.fallbackStrategy(context);
    }
  }

  private classifyError(error: any): string {
    if (error.status === 429 || error.message?.includes('rate limit')) {
      return 'RATE_LIMIT';
    }
    if (error.status === 401 || error.status === 403) {
      return 'AUTH';
    }
    if (error.status >= 500) {
      return 'SERVER';
    }
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return 'NETWORK';
    }
    return 'UNKNOWN';
  }

  private async handleRateLimit(error: any, retryCallback?: () => Promise<any>) {
    console.log('レート制限に達しました。待機中...');
    
    // Retry-Afterヘッダーがあれば使用
    const retryAfter = error.headers?.['retry-after'] || 60;
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    
    if (retryCallback) {
      return retryCallback();
    }
    
    return null;
  }

  private async handleNetworkError(
    error: any,
    retryCallback?: () => Promise<any>,
    attempt = 0
  ): Promise<any> {
    if (attempt >= this.retryConfig.maxRetries) {
      console.error('最大再試行回数に達しました');
      return this.fallbackStrategy('network');
    }

    const delay = this.retryConfig.initialDelay * 
                  Math.pow(this.retryConfig.backoffMultiplier, attempt);
    
    console.log(`再試行中 (${attempt + 1}/${this.retryConfig.maxRetries})...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (retryCallback) {
      try {
        return await retryCallback();
      } catch (retryError) {
        return this.handleNetworkError(retryError, retryCallback, attempt + 1);
      }
    }
    
    return null;
  }

  private async handleServerError(error: any, retryCallback?: () => Promise<any>) {
    console.error('サーバーエラーが発生しました');
    
    // 5秒待機して再試行
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    if (retryCallback) {
      try {
        return await retryCallback();
      } catch (retryError) {
        return this.fallbackStrategy('server');
      }
    }
    
    return null;
  }

  /**
   * フォールバック戦略
   */
  private fallbackStrategy(context: string): any {
    console.log(`フォールバック処理を実行: ${context}`);
    
    const fallbacks = {
      'narrative': 'エラーが発生しました。物語は続きます...',
      'image': null, // 画像なしで続行
      'audio': null, // 音声なしで続行
      'choices': ['続ける', '休憩する', 'セーブする'], // デフォルト選択肢
      'network': { success: false, message: 'オフラインモードで続行' },
      'server': { success: false, message: 'しばらくお待ちください' },
    };
    
    return fallbacks[context] || null;
  }
}

// グローバルエラーハンドラーのインスタンス
export const gameErrorHandler = new GameErrorHandler();
```

### 6.2 Volt Agentでのエラー処理

```typescript
// src/agents/ErrorHandlingAgent.ts
import { Agent } from "@voltagent/core";
import { gameErrorHandler } from "../utils/ErrorHandler";

export class ErrorHandlingAgent extends Agent {
  async generateTextWithRetry(messages: any[]): Promise<string> {
    try {
      const response = await this.generateText({ messages });
      return response.text;
    } catch (error) {
      // エラーハンドラーに委譲
      const fallback = await gameErrorHandler.handleAPIError(
        error,
        'narrative',
        () => this.generateText({ messages })
      );
      
      return fallback || "物語は続きます...";
    }
  }
}
```

---

## まとめ

このガイドは、Grok API、Volt Agent、AIVIS Cloud APIの最新仕様に基づいて作成されています。

### 重要なポイント

1. **Volt Agent**: Supervisor/Sub-agentパターンとワークフローエンジンを活用
2. **Grok API**: タスクに応じた適切なモデル選択とキャッシュプロンプトの活用
3. **画像生成**: 重要な場面のみに限定してコスト管理
4. **音声合成**: AIVIS Cloud APIのストリーミング機能でレイテンシ削減
5. **エラー処理**: 包括的なフォールバック戦略でゲーム体験を維持

### 推定コスト（1プレイあたり）

| 項目 | 使用量 | コスト |
|------|-------|--------|
| Grok-4（物語） | 10,000トークン | $0.18 |
| Grok-3-mini（NPC） | 50,000トークン | $0.04 |
| 画像生成 | 4枚 | $0.28 |
| 音声合成 | 無料（ベータ） | $0.00 |
| **合計** | - | **$0.50** |

---

*最終更新: 2025年9月*
*参照: xAI Grok API、Volt Agent、AIVIS Cloud API公式ドキュメント*