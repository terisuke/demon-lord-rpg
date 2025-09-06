# API仕様書

## 1. API概要

### 1.1 ベースURL
```
開発環境: http://localhost:3141
本番環境: https://api.demon-lord-rpg.com (TBD)
```

### 1.2 認証
現在のバージョンでは認証は不要（将来的にJWT実装予定）

### 1.3 レスポンス形式
すべてのAPIはJSON形式でレスポンスを返します。

## 2. エンドポイント一覧

### 2.1 ゲームコマンド

#### POST /api/command
プレイヤーのコマンドを送信し、ゲームを進行させる

**リクエスト:**
```typescript
interface CommandRequest {
  command: string;        // プレイヤーの入力テキスト
  sessionId?: string;     // セッションID（オプション）
  context?: {
    location?: string;    // 現在地（オプション）
    quickAction?: boolean; // クイックアクション（オプション）
  };
}
```

**レスポンス:**
```typescript
interface CommandResponse {
  success: boolean;
  messageId: string;      // メッセージID（SSEで参照）
  timestamp: number;
}
```

**例:**
```bash
curl -X POST http://localhost:3141/api/command \
  -H "Content-Type: application/json" \
  -d '{
    "command": "北の森へ向かう",
    "sessionId": "abc123"
  }'
```

### 2.2 Server-Sent Events

#### GET /api/events
ゲームイベントのリアルタイムストリーム

**接続例:**
```javascript
const eventSource = new EventSource('/api/events?sessionId=abc123');

eventSource.addEventListener('narrative', (e) => {
  const data = JSON.parse(e.data);
  console.log('物語:', data.text);
});

eventSource.addEventListener('state', (e) => {
  const data = JSON.parse(e.data);
  console.log('状態更新:', data);
});

eventSource.addEventListener('choice', (e) => {
  const data = JSON.parse(e.data);
  console.log('選択肢:', data.options);
});
```

**イベントタイプ:**

| イベント | データ構造 | 説明 |
|---------|-----------|------|
| `narrative` | `{text: string, speaker?: string}` | 物語テキスト |
| `state` | `GameState` | ゲーム状態の更新 |
| `choice` | `{options: Choice[], timeout?: number}` | 選択肢の提示 |
| `audio` | `{url: string, text: string}` | 音声データ |
| `image` | `{url: string, description: string}` | 生成画像 |
| `error` | `{message: string, code: string}` | エラー通知 |

### 2.3 ゲーム状態

#### GET /api/state
現在のゲーム状態を取得

**レスポンス:**
```typescript
interface GameStateResponse {
  currentDay: number;
  maxDays: 30;
  playerRole: PlayerRole;
  location: string;
  playerStats: {
    level: number;
    hp: number;
    maxHp: number;
    strength: number;
    reputation: number;
    knowledge: number;
    gold: number;
  };
  inventory: InventoryItem[];
  questLog: Quest[];
  relationships: NPCRelationship[];
  gameFlags: Record<string, boolean>;
  doomsdayApproach: number; // 0-100
}
```

**例:**
```bash
curl http://localhost:3141/api/state?sessionId=abc123
```

### 2.4 セーブ/ロード

#### POST /api/save
ゲームをセーブ

**リクエスト:**
```typescript
interface SaveRequest {
  sessionId: string;
  slot: number; // 1-5
  saveName?: string;
}
```

**レスポンス:**
```typescript
interface SaveResponse {
  success: boolean;
  slot: number;
  saveName: string;
  timestamp: number;
}
```

#### GET /api/saves
セーブデータ一覧を取得

**レスポンス:**
```typescript
interface SavesListResponse {
  saves: Array<{
    slot: number;
    saveName: string;
    playerRole: string;
    currentDay: number;
    timestamp: number;
  }>;
}
```

#### POST /api/load
セーブデータをロード

**リクエスト:**
```typescript
interface LoadRequest {
  slot: number;
  sessionId?: string; // 新規またはsessionId
}
```

**レスポンス:**
```typescript
interface LoadResponse {
  success: boolean;
  sessionId: string;
  gameState: GameStateResponse;
}
```

### 2.5 プレイヤー設定

#### POST /api/player/create
新規プレイヤー作成

**リクエスト:**
```typescript
interface CreatePlayerRequest {
  name: string;
  role: PlayerRole;
  appearance?: {
    avatar?: string;
    color?: string;
  };
}
```

**レスポンス:**
```typescript
interface CreatePlayerResponse {
  success: boolean;
  sessionId: string;
  player: {
    id: string;
    name: string;
    role: PlayerRole;
    startingStats: PlayerStats;
  };
}
```

#### POST /api/player/action
プレイヤーアクション実行

**リクエスト:**
```typescript
interface PlayerActionRequest {
  sessionId: string;
  action: {
    type: "move" | "interact" | "use_item" | "combat" | "trade";
    target?: string;
    parameters?: Record<string, any>;
  };
}
```

### 2.6 NPC インタラクション

#### GET /api/npcs
現在地のNPC一覧

**レスポンス:**
```typescript
interface NPCListResponse {
  location: string;
  npcs: Array<{
    id: string;
    name: string;
    role: string;
    availability: "available" | "busy" | "sleeping";
    relationship: number; // -100 to 100
  }>;
}
```

#### POST /api/npc/interact
NPCと対話

**リクエスト:**
```typescript
interface NPCInteractRequest {
  sessionId: string;
  npcId: string;
  message?: string;
  action?: "talk" | "trade" | "quest" | "gift";
}
```

### 2.7 クエスト

#### GET /api/quests/available
利用可能なクエスト一覧

**レスポンス:**
```typescript
interface AvailableQuestsResponse {
  quests: Array<{
    id: string;
    title: string;
    description: string;
    giver: string;
    rewards: {
      gold?: number;
      items?: string[];
      reputation?: number;
    };
    requirements?: {
      level?: number;
      reputation?: number;
      items?: string[];
    };
  }>;
}
```

#### POST /api/quest/accept
クエストを受諾

**リクエスト:**
```typescript
interface AcceptQuestRequest {
  sessionId: string;
  questId: string;
}
```

### 2.8 インベントリ

#### GET /api/inventory
インベントリ内容を取得

**レスポンス:**
```typescript
interface InventoryResponse {
  items: Array<{
    id: string;
    name: string;
    type: "weapon" | "armor" | "consumable" | "quest" | "misc";
    quantity: number;
    description: string;
    value: number;
  }>;
  capacity: number;
  used: number;
}
```

#### POST /api/item/use
アイテムを使用

**リクエスト:**
```typescript
interface UseItemRequest {
  sessionId: string;
  itemId: string;
  target?: string; // 対象（自分/NPC/オブジェクト）
}
```

### 2.9 音声（開発中）

#### POST /api/audio/synthesize
テキストを音声に変換

**リクエスト:**
```typescript
interface SynthesizeRequest {
  text: string;
  voice?: string; // 音声タイプ
  speed?: number; // 0.5 - 2.0
  emotion?: "neutral" | "happy" | "sad" | "angry" | "fearful";
}
```

**レスポンス:**
```typescript
interface SynthesizeResponse {
  audioUrl: string;
  duration: number; // 秒
  format: "mp3" | "wav";
}
```

## 3. エラーハンドリング

### 3.1 エラーレスポンス形式

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: number;
  };
}
```

### 3.2 エラーコード一覧

| コード | HTTPステータス | 説明 |
|--------|--------------|------|
| `INVALID_COMMAND` | 400 | 無効なコマンド |
| `SESSION_NOT_FOUND` | 404 | セッションが見つからない |
| `INVALID_GAME_STATE` | 400 | ゲーム状態が不正 |
| `RATE_LIMIT_EXCEEDED` | 429 | レート制限超過 |
| `AI_SERVICE_ERROR` | 503 | AI サービスエラー |
| `INTERNAL_ERROR` | 500 | 内部エラー |

## 4. WebSocket API（将来実装）

### 4.1 接続

```javascript
const ws = new WebSocket('ws://localhost:3141/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    sessionId: 'abc123'
  }));
};
```

### 4.2 メッセージ形式

```typescript
interface WSMessage {
  type: string;
  payload: any;
  timestamp: number;
}
```

## 5. レート制限

| エンドポイント | 制限 | ウィンドウ |
|--------------|------|-----------|
| `/api/command` | 10 | 1分 |
| `/api/state` | 30 | 1分 |
| `/api/save` | 5 | 10分 |
| `/api/audio/*` | 20 | 1分 |

## 6. 開発者向けツール

### 6.1 デバッグモード

```bash
# デバッグモードで起動
DEBUG=true npm run dev
```

デバッグモードでは追加のエンドポイントが有効になります：

- `GET /api/debug/agents` - エージェント状態
- `GET /api/debug/memory` - メモリ使用状況
- `POST /api/debug/reset` - ゲームリセット

### 6.2 テスト用エンドポイント

```bash
# ゲーム状態を特定の日に設定
POST /api/debug/set-day
{
  "day": 29
}

# 特定のエンディングをトリガー
POST /api/debug/trigger-ending
{
  "ending": "PERFECT_VICTORY"
}
```

## 7. SDKとクライアントライブラリ

### 7.1 JavaScript SDK（計画中）

```javascript
import { DemonLordRPG } from '@demon-lord-rpg/sdk';

const game = new DemonLordRPG({
  baseUrl: 'http://localhost:3141',
  sessionId: 'abc123'
});

// コマンド送信
await game.sendCommand('北へ向かう');

// イベントリスナー
game.on('narrative', (text) => {
  console.log(text);
});

game.on('choice', (options) => {
  // 選択肢表示
});
```

---

*この仕様書はバージョン1.0.0に基づいています。APIは開発中のため変更される可能性があります。*
