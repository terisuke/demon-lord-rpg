# 開発ガイドライン

## 1. 開発フロー

### 1.1 ブランチ戦略

```
main
 ├── develop
 │    ├── feature/add-npc-dialogue
 │    ├── feature/combat-system
 │    └── fix/save-load-bug
 └── release/v1.0.0
```

- `main`: 本番環境用、常に安定した状態を保つ
- `develop`: 開発用統合ブランチ
- `feature/*`: 新機能開発
- `fix/*`: バグ修正
- `release/*`: リリース準備

### 1.2 コミットメッセージ規約

```
<type>(<scope>): <subject>

<body>

<footer>
```

**タイプ:**
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: フォーマット修正
- `refactor`: リファクタリング
- `test`: テスト追加/修正
- `chore`: ビルド/補助ツール

**例:**
```
feat(agent): Add merchant NPC with trading system

- Implement TradeAgent class
- Add inventory management for trades
- Create trade UI components

Closes #123
```

## 2. コーディング規約

### 2.1 TypeScript スタイルガイド

#### 命名規則

```typescript
// クラス: PascalCase
class GameMasterAgent { }

// インターフェース: PascalCase with 'I' prefix (optional)
interface IPlayerState { }
interface PlayerState { } // Also acceptable

// 関数: camelCase
function calculateDamage() { }

// 定数: UPPER_SNAKE_CASE
const MAX_DAYS = 30;

// 変数: camelCase
let currentDay = 1;

// Enum: PascalCase (values: UPPER_SNAKE_CASE)
enum GameState {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  ENDED = "ENDED"
}
```

#### 型定義

```typescript
// 明示的な型定義を推奨
const processCommand = (command: string): Promise<CommandResult> => {
  // 実装
};

// Union型の活用
type PlayerRole = "hero" | "merchant" | "coward" | "traitor";

// インターフェースの拡張
interface BaseCharacter {
  name: string;
  level: number;
}

interface Player extends BaseCharacter {
  role: PlayerRole;
  inventory: Item[];
}
```

### 2.2 ファイル構造

```typescript
// 1ファイル1エクスポートの原則
// src/agents/GameMasterAgent.ts
export class GameMasterAgent {
  // 実装
}

// インデックスファイルでの再エクスポート
// src/agents/index.ts
export { GameMasterAgent } from './GameMasterAgent';
export { NPCAgent } from './NPCAgent';
```

### 2.3 エラーハンドリング

```typescript
// カスタムエラークラスの使用
class GameError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'GameError';
  }
}

// Try-catchでの適切なエラー処理
async function executeCommand(command: string) {
  try {
    const result = await processCommand(command);
    return result;
  } catch (error) {
    if (error instanceof GameError) {
      logger.error(`Game error: ${error.code}`, error.details);
      throw error;
    }
    
    // 予期しないエラーはラップ
    throw new GameError(
      'Unexpected error occurred',
      'INTERNAL_ERROR',
      error
    );
  }
}
```

## 3. エージェント開発ガイド

### 3.1 新規エージェントの作成手順

1. **エージェントクラスの作成**

```typescript
// src/agents/CustomNPCAgent.ts
import { Agent } from '@voltagent/core';
import { VercelAIProvider } from '@voltagent/vercel-ai';
import { xai } from '@ai-sdk/xai';

export class CustomNPCAgent extends Agent {
  constructor() {
    super({
      name: 'CustomNPC',
      instructions: `
        あなたは[キャラクター設定]です。
        [性格や話し方の指示]
        [知識や能力の制限]
      `,
      llm: new VercelAIProvider(),
      model: xai('grok-3-mini'), // コスト最適化
      tools: [
        // 必要なツールを定義
      ]
    });
  }
  
  // カスタムメソッド
  async generateDialogue(context: GameContext): Promise<string> {
    // 実装
  }
}
```

2. **エージェントの登録**

```typescript
// src/agents/registry.ts
import { CustomNPCAgent } from './CustomNPCAgent';

export const agentRegistry = {
  customNPC: new CustomNPCAgent(),
  // 他のエージェント
};
```

### 3.2 エージェント間通信

```typescript
// Supervisorパターンの実装
class GameMasterAgent extends Agent {
  constructor(private subAgents: Record<string, Agent>) {
    super({
      name: 'GameMaster',
      // ... 設定
    });
  }
  
  async delegateToNPC(npcName: string, task: string) {
    const npc = this.subAgents[npcName];
    if (!npc) {
      throw new GameError(`NPC ${npcName} not found`, 'NPC_NOT_FOUND');
    }
    
    return await npc.generateText({
      prompt: task,
      userContext: this.getCurrentContext()
    });
  }
}
```

## 4. テスト戦略

### 4.1 テストの種類と配置

```
tests/
├── unit/           # 単体テスト
│   ├── agents/
│   ├── utils/
│   └── schemas/
├── integration/    # 統合テスト
│   ├── api/
│   └── workflows/
└── e2e/           # E2Eテスト
    └── scenarios/
```

### 4.2 テストの書き方

```typescript
// tests/unit/agents/GameMasterAgent.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GameMasterAgent } from '@/agents/GameMasterAgent';

describe('GameMasterAgent', () => {
  let agent: GameMasterAgent;
  
  beforeEach(() => {
    agent = new GameMasterAgent();
  });
  
  it('should process player command correctly', async () => {
    const result = await agent.processCommand('go north');
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('narrative');
  });
  
  it('should maintain game state', () => {
    // テスト実装
  });
});
```

### 4.3 モックとスタブ

```typescript
// Grok APIのモック
import { vi } from 'vitest';

vi.mock('@ai-sdk/xai', () => ({
  xai: vi.fn(() => ({
    generateText: vi.fn().mockResolvedValue({
      text: 'Mocked response'
    })
  }))
}));
```

## 5. パフォーマンス最適化

### 5.1 コスト最適化チェックリスト

- [ ] 適切なモデル選択（grok-4 vs grok-3-mini）
- [ ] キャッシュプロンプトの活用
- [ ] バッチ処理の実装
- [ ] 不要なAPI呼び出しの削減

### 5.2 実装例

```typescript
// モデル選択の最適化
class ModelSelector {
  static selectModel(taskType: TaskType): string {
    const modelMap: Record<TaskType, string> = {
      'complex_narrative': 'grok-4',
      'simple_dialogue': 'grok-3-mini',
      'code_generation': 'grok-code-fast-1',
      'image_generation': 'grok-2-image-1212'
    };
    
    return modelMap[taskType] || 'grok-3-mini';
  }
}

// キャッシュの実装
class PromptCache {
  private cache = new Map<string, CachedResponse>();
  
  async get(prompt: string): Promise<string | null> {
    const cached = this.cache.get(prompt);
    if (cached && !this.isExpired(cached)) {
      return cached.response;
    }
    return null;
  }
  
  set(prompt: string, response: string) {
    this.cache.set(prompt, {
      response,
      timestamp: Date.now()
    });
  }
}
```

## 6. デバッグとロギング

### 6.1 ログレベル

```typescript
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

// 環境変数で制御
const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';
```

### 6.2 構造化ログ

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// 使用例
logger.info('Player action', {
  player: playerId,
  action: 'move',
  location: 'forest',
  timestamp: Date.now()
});
```

## 7. セキュリティガイドライン

### 7.1 入力検証

```typescript
import { z } from 'zod';

// 入力スキーマの定義
const CommandSchema = z.object({
  command: z.string().min(1).max(500),
  sessionId: z.string().uuid()
});

// 検証の実装
function validateCommand(input: unknown) {
  try {
    return CommandSchema.parse(input);
  } catch (error) {
    throw new GameError('Invalid input', 'VALIDATION_ERROR', error);
  }
}
```

### 7.2 APIキー管理

```typescript
// 環境変数の検証
function validateEnvironment() {
  const required = ['XAI_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}
```

## 8. リリースプロセス

### 8.1 リリースチェックリスト

- [ ] すべてのテストがパス
- [ ] コードレビュー完了
- [ ] ドキュメント更新
- [ ] CHANGELOG.md 更新
- [ ] バージョン番号更新
- [ ] タグ作成

### 8.2 バージョニング

セマンティックバージョニング（SemVer）に従う：

- `MAJOR.MINOR.PATCH`
- MAJOR: 破壊的変更
- MINOR: 後方互換性のある機能追加
- PATCH: 後方互換性のあるバグ修正

## 9. 貢献者向けガイド

### 9.1 Issue の作成

```markdown
## 概要
[問題や提案の簡潔な説明]

## 再現手順（バグの場合）
1. [ステップ1]
2. [ステップ2]
3. [エラーが発生]

## 期待される動作
[どうあるべきか]

## 実際の動作
[現在どうなっているか]

## 環境
- OS: [e.g., macOS 14.0]
- Node.js: [e.g., 20.0.0]
- ブラウザ: [該当する場合]
```

### 9.2 Pull Request テンプレート

```markdown
## 変更内容
[何を変更したか]

## 変更理由
[なぜ変更が必要か]

## テスト
- [ ] 単体テスト追加/更新
- [ ] 統合テスト実施
- [ ] 手動テスト完了

## チェックリスト
- [ ] コードレビュー依頼
- [ ] ドキュメント更新
- [ ] CHANGELOG.md 更新
```

## 10. トラブルシューティング

### 10.1 よくある問題と解決方法

| 問題 | 原因 | 解決方法 |
|------|------|----------|
| Grok API接続エラー | APIキー未設定 | `.env`ファイル確認 |
| メモリリーク | エージェント未解放 | 適切なクリーンアップ実装 |
| 応答遅延 | 不適切なモデル選択 | モデル最適化 |

### 10.2 デバッグツール

```bash
# VoltOpsでのトレース
VOLTOPS_ENABLED=true npm run dev

# 詳細ログ出力
DEBUG=* npm run dev

# メモリプロファイリング
node --inspect src/index.js
```

---

*このガイドラインは継続的に改善されます。提案がある場合はIssueを作成してください。*
