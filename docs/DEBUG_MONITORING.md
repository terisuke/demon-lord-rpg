# デバッグ＆監視ガイド

## VoltOps統合による可観測性

### 1. VoltOpsセットアップ

```typescript
// src/monitoring/voltops.ts
import { VoltOpsClient } from '@voltagent/voltops';

export const voltOpsClient = new VoltOpsClient({
  apiKey: process.env.VOLTOPS_API_KEY,
  projectId: 'demon-lord-rpg',
  environment: process.env.NODE_ENV || 'development',
  
  // トレーシング設定
  enableTracing: true,
  tracingSampleRate: 1.0, // 開発環境では100%
  
  // プロンプトキャッシュ設定
  promptCache: {
    enabled: true,
    ttl: 300, // 5分
    maxSize: 100,
  },
  
  // カスタムメタデータ
  metadata: {
    gameVersion: '1.0.0',
    maxDays: 30,
  }
});
```

### 2. エージェント実行の可視化

VoltOpsコンソールで確認できる情報：

```typescript
// エージェント実行のトレース例
{
  traceId: "abc123",
  spans: [
    {
      name: "GameMasterAgent.generateNarrative",
      duration: 1234,
      input: { day: 1, action: "村長と相談" },
      output: { narrative: "..." },
      tokens: { input: 150, output: 200 },
      cost: 0.0008
    },
    {
      name: "ImageGeneratorAgent.generate",
      duration: 3456,
      result: { imageUrl: "...", cost: 0.07 }
    }
  ]
}
```

### 3. デバッグログ戦略

```typescript
// src/utils/logger.ts
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class GameLogger {
  private level: LogLevel;
  
  constructor() {
    this.level = process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO;
  }
  
  error(message: string, error?: any) {
    console.error(`❌ [ERROR] ${message}`, error);
    voltOpsClient.logError({ message, error });
  }
  
  warn(message: string, data?: any) {
    if (this.level >= LogLevel.WARN) {
      console.warn(`⚠️ [WARN] ${message}`, data);
    }
  }
  
  info(message: string, data?: any) {
    if (this.level >= LogLevel.INFO) {
      console.log(`ℹ️ [INFO] ${message}`, data);
    }
  }
  
  debug(message: string, data?: any) {
    if (this.level >= LogLevel.DEBUG) {
      console.log(`🔍 [DEBUG] ${message}`, data);
    }
  }
  
  // ゲーム専用ログ
  gameEvent(event: string, details: any) {
    this.info(`🎮 [GAME] ${event}`, details);
    voltOpsClient.trackEvent(event, details);
  }
}

export const logger = new GameLogger();
```

## パフォーマンス監視

### 1. メトリクス収集

```typescript
// src/monitoring/metrics.ts
export class PerformanceMonitor {
  private metrics = {
    apiCalls: 0,
    totalLatency: 0,
    errors: 0,
    tokenUsage: { input: 0, output: 0 },
    imageGenerations: 0,
    audioSynthesis: 0,
  };
  
  trackAPICall(model: string, latency: number, tokens: any) {
    this.metrics.apiCalls++;
    this.metrics.totalLatency += latency;
    this.metrics.tokenUsage.input += tokens.input || 0;
    this.metrics.tokenUsage.output += tokens.output || 0;
    
    logger.debug(`API Call: ${model}`, {
      latency: `${latency}ms`,
      tokens
    });
  }
  
  trackError(error: any) {
    this.metrics.errors++;
    logger.error('Performance issue detected', error);
  }
  
  getReport() {
    const avgLatency = this.metrics.totalLatency / this.metrics.apiCalls || 0;
    
    return {
      summary: {
        totalAPICalls: this.metrics.apiCalls,
        averageLatency: `${avgLatency.toFixed(0)}ms`,
        errorRate: `${(this.metrics.errors / this.metrics.apiCalls * 100).toFixed(2)}%`,
      },
      tokenUsage: this.metrics.tokenUsage,
      features: {
        imagesGenerated: this.metrics.imageGenerations,
        audioSynthesized: this.metrics.audioSynthesis,
      }
    };
  }
}
```

### 2. レート制限の監視

```typescript
// src/monitoring/rateLimitMonitor.ts
export class RateLimitMonitor {
  private limits = {
    grok: { rpm: 480, tpm: 2000000 },
    aivis: { rpm: 100 }, // 仮定値
  };
  
  private usage = new Map<string, {
    requests: number[],
    tokens: number[],
  }>();
  
  track(service: string, tokens?: number) {
    if (!this.usage.has(service)) {
      this.usage.set(service, { requests: [], tokens: [] });
    }
    
    const now = Date.now();
    const data = this.usage.get(service)!;
    
    // 1分間のウィンドウで管理
    data.requests.push(now);
    data.requests = data.requests.filter(t => t > now - 60000);
    
    if (tokens) {
      data.tokens.push(tokens);
      data.tokens = data.tokens.filter((_, i) => 
        data.requests[i] > now - 60000
      );
    }
    
    // 警告チェック
    this.checkLimits(service);
  }
  
  private checkLimits(service: string) {
    const data = this.usage.get(service)!;
    const limit = this.limits[service];
    
    if (!limit) return;
    
    const requestCount = data.requests.length;
    const tokenCount = data.tokens.reduce((a, b) => a + b, 0);
    
    // 80%で警告
    if (requestCount > limit.rpm * 0.8) {
      logger.warn(`Rate limit warning: ${service}`, {
        current: requestCount,
        limit: limit.rpm,
        percentage: `${(requestCount / limit.rpm * 100).toFixed(0)}%`
      });
    }
    
    if (limit.tpm && tokenCount > limit.tpm * 0.8) {
      logger.warn(`Token limit warning: ${service}`, {
        current: tokenCount,
        limit: limit.tpm,
        percentage: `${(tokenCount / limit.tpm * 100).toFixed(0)}%`
      });
    }
  }
}
```

## デバッグツール

### 1. 開発用コンソールコマンド

```typescript
// src/debug/console.ts
export class DebugConsole {
  static commands = {
    // 日数を設定
    setDay(day: number) {
      gameState.currentDay = day;
      logger.info(`Day set to ${day}`);
    },
    
    // リソースを追加
    addGold(amount: number) {
      gameState.gold += amount;
      logger.info(`Added ${amount} gold`);
    },
    
    // 画像生成をテスト
    async testImage() {
      const url = await generateSceneImage("テスト画像", 1);
      logger.info(`Test image: ${url}`);
    },
    
    // 音声合成をテスト
    async testAudio(text: string = "テスト音声です") {
      await narrator.narrate(text);
      logger.info("Audio test completed");
    },
    
    // エラーをシミュレート
    simulateError(type: 'api' | 'network' | 'rate') {
      switch(type) {
        case 'api':
          throw new Error("Simulated API error");
        case 'network':
          throw new Error("fetch failed");
        case 'rate':
          throw { status: 429, message: "Rate limit exceeded" };
      }
    },
    
    // パフォーマンスレポート
    perfReport() {
      console.table(performanceMonitor.getReport());
    },
    
    // ゲーム状態をダンプ
    dumpState() {
      console.log(JSON.stringify(gameState, null, 2));
    },
  };
}

// ブラウザコンソールで使用可能にする
if (typeof window !== 'undefined') {
  (window as any).debug = DebugConsole.commands;
}
```

### 2. エラー境界とフォールバック

```typescript
// src/components/ErrorBoundary.ts
export class GameErrorBoundary {
  private fallbackState: any = null;
  
  async execute<T>(
    operation: () => Promise<T>,
    fallback: T,
    context: string
  ): Promise<T> {
    try {
      const result = await operation();
      
      // 成功時は状態を保存
      this.fallbackState = result;
      return result;
      
    } catch (error) {
      logger.error(`Error in ${context}`, error);
      
      // フォールバック戦略
      if (this.fallbackState && typeof this.fallbackState === typeof fallback) {
        logger.info("Using cached fallback state");
        return this.fallbackState;
      }
      
      logger.info("Using default fallback");
      return fallback;
    }
  }
}
```

## トラブルシューティングガイド

### 一般的な問題と解決方法

#### 問題: エージェントが応答しない

```typescript
// デバッグ手順
1. VoltOpsコンソールでトレースを確認
2. APIキーが正しく設定されているか確認
3. レート制限に達していないか確認

// 確認コマンド
console.log("API Key exists:", !!process.env.XAI_API_KEY);
console.log("Rate limit status:", rateLimitMonitor.getStatus());
```

#### 問題: 画像が生成されない

```typescript
// チェックリスト
const diagnostics = {
  apiKeySet: !!process.env.XAI_API_KEY,
  currentDay: gameState.currentDay,
  isImportantDay: [1, 10, 20, 30].includes(gameState.currentDay),
  generationCount: imageGenerator.generationCount,
  underLimit: imageGenerator.generationCount < 4,
};

console.table(diagnostics);
```

#### 問題: 音声が再生されない

```javascript
// ブラウザコンソールで診断
const audioContext = new AudioContext();
console.log("AudioContext state:", audioContext.state);
console.log("Sample rate:", audioContext.sampleRate);

// 自動再生ポリシーのチェック
navigator.permissions.query({ name: 'autoplay' }).then(result => {
  console.log("Autoplay permission:", result.state);
});
```

### メモリリークの検出

```typescript
// src/monitoring/memoryMonitor.ts
export class MemoryMonitor {
  private baseline: number | null = null;
  
  start() {
    if (typeof performance !== 'undefined' && performance.memory) {
      this.baseline = performance.memory.usedJSHeapSize;
      logger.info("Memory monitoring started", {
        baseline: `${(this.baseline / 1024 / 1024).toFixed(2)} MB`
      });
    }
  }
  
  check() {
    if (!this.baseline || !performance.memory) return;
    
    const current = performance.memory.usedJSHeapSize;
    const diff = current - this.baseline;
    const diffMB = diff / 1024 / 1024;
    
    if (diffMB > 50) {
      logger.warn("Potential memory leak detected", {
        increase: `${diffMB.toFixed(2)} MB`,
        current: `${(current / 1024 / 1024).toFixed(2)} MB`
      });
    }
  }
}
```

## 本番環境の監視

### 1. ヘルスチェックエンドポイント

```typescript
// src/routes/health.ts
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {
      grok: checkGrokAPI(),
      aivis: checkAIVISAPI(),
      database: checkDatabase(),
    },
    metrics: performanceMonitor.getReport(),
  };
  
  const isHealthy = Object.values(health.services).every(s => s);
  
  res.status(isHealthy ? 200 : 503).json(health);
});
```

### 2. アラート設定

```typescript
// src/monitoring/alerts.ts
export class AlertManager {
  private thresholds = {
    errorRate: 0.05,      // 5%
    avgLatency: 2000,     // 2秒
    costPerHour: 5.00,    // $5/時間
  };
  
  check(metrics: any) {
    const alerts = [];
    
    if (metrics.errorRate > this.thresholds.errorRate) {
      alerts.push({
        level: 'critical',
        message: `High error rate: ${(metrics.errorRate * 100).toFixed(2)}%`
      });
    }
    
    if (metrics.avgLatency > this.thresholds.avgLatency) {
      alerts.push({
        level: 'warning',
        message: `High latency: ${metrics.avgLatency}ms`
      });
    }
    
    if (metrics.costPerHour > this.thresholds.costPerHour) {
      alerts.push({
        level: 'warning',
        message: `High cost: $${metrics.costPerHour.toFixed(2)}/hour`
      });
    }
    
    return alerts;
  }
}
```

## デバッグのベストプラクティス

### DO's ✅
- VoltOpsコンソールを常に開いておく
- 各エージェント実行のトレースを確認
- エラーは即座にログに記録
- パフォーマンスメトリクスを定期的に確認
- フォールバック処理を実装

### DON'Ts ❌
- console.logだけでデバッグ
- エラーを握りつぶす
- 本番環境でDEBUGレベルのログ
- レート制限の警告を無視
- メモリリークを放置

## 便利なデバッグスニペット

```javascript
// ブラウザコンソールで即座に使える

// ゲーム状態を確認
debug.dumpState();

// パフォーマンスレポート
debug.perfReport();

// 特定の日にジャンプ
debug.setDay(29);

// エラーをシミュレート
debug.simulateError('rate');

// 画像生成テスト
await debug.testImage();

// 音声合成テスト
await debug.testAudio("魔王が接近しています");
```

---

*効果的なデバッグと監視により、問題を早期に発見し、ユーザー体験を向上させます。*