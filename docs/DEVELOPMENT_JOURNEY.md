# 開発記録: AI駆動型RPG「30日後の魔王襲来」の実装過程

## 🎯 プロジェクト概要

PdMからの指示により、Volt Agent + Grok API + AIVIS Cloud APIを使用したAI駆動型テキストRPGを実装しました。本ドキュメントでは、技術記事執筆のために詳細な実装過程とトライ&エラーを記録します。

## 📚 初期要件と技術選択

### PdMからの要求仕様
- **フレームワーク**: Volt Agent（マルチエージェント統合）
- **AI/LLM**: Grok API（xAI）- コスト効率重視でgrok-3-mini採用
- **画像生成**: grok-2-image-1212（Day 1,10,20,30のみ、コスト管理）
- **音声合成**: AIVIS Cloud API（現在無料ベータ期間）
- **自由度**: プレイヤーが何でも入力でき、AIが創造的に解釈

### 技術選択の理由
```typescript
// PdMの指示: QUICK_START.mdのMVP版を最優先実装
model: xai("grok-3-mini") // 94%コスト削減（vs grok-4）
```

## 🔄 実装プロセスとトライ&エラー

### フェーズ1: MVP実装と最初の問題

#### 問題1: 既存コードが複雑すぎる
**状況**: 
- 既存の`GameMasterAgent.ts`が500行超で過度に複雑
- Supervisor/Sub-agentパターンが不完全
- PdMのQUICK_START.mdと乖離

**解決策**: 
```typescript
// ❌ 修正前: 複雑なGameMasterAgent
export class GameMasterAgent extends Agent<VercelAIProvider> {
  constructor(subAgents?: Record<string, Agent<VercelAIProvider>>) {
    super({
      name: 'GameMaster',
      instructions: `500行の複雑な指示...`, // 過度に詳細
      // 複雑なツール定義...
    });
  }
}

// ✅ 修正後: シンプルなMVP
const gameMasterAgent = new Agent({
  name: "GameMaster", 
  instructions: "あなたは30日後に魔王が襲来するRPGのゲームマスターです。",
  llm: new VercelAIProvider(),
  model: xai("grok-3-mini"),
});
```

#### 問題2: AI統合が全くされていない（致命的）
**状況**: 
```typescript
// ❌ 実際のコード（TODOのまま）
private async generateNarrative(action: string): Promise<string> {
  // TODO: 実際のAPI呼び出しに置き換える
  return `あなたは${action}を選びました。村人たちは希望を持ち始めています。`;
}
```

**PdMからの緊急フィードバック**: 
> ❌ 現在の問題: AIが全く動作していません
> これは「AIゲーム」ではなく「固定テキストゲーム」です

**解決策**: `GrokService.ts`でAI統合を完全実装
```typescript
// ✅ 修正後: 実際のGrok API統合
static async generateNarrative(day: number, playerAction: string, gameState: any): Promise<string> {
  const response = await generateText({
    model: xai('grok-3-mini'),
    messages: [/* 詳細なプロンプト */],
    maxTokens: 300
  });
  return response.text;
}
```

### フェーズ2: 画像生成機能の実装と失敗

#### 問題3: 画像生成が400エラーで失敗
**ログ出力**:
```
画像生成失敗: 400
画像生成失敗: 400
```

**調査プロセス**:
1. **仮説1**: APIキーの問題 → ❌ 他のAPIは動作
2. **仮説2**: モデル名が間違い → ❌ grok-2-image-1212は正しい
3. **仮説3**: リクエスト形式の問題 → ✅ **これが原因！**

**根本原因の発見**:
```typescript
// ❌ 失敗コード: sizeパラメータがサポートされていない
body: JSON.stringify({
  model: "grok-2-image-1212",
  prompt: `fantasy RPG scene: ${prompt}`,
  n: 1,
  size: "1024x1024" // ← xAI APIでサポートされていない！
})
```

**Web検索による調査結果**:
> xAI API: "quality, size or style are not supported by xAI API at the moment."

**解決策**:
```typescript 
// ✅ 修正版: サポートされていないパラメータを削除
body: JSON.stringify({
  model: "grok-2-image-1212",
  prompt: `fantasy RPG scene: ${prompt}`,
  n: 1
  // size パラメータを削除
})
```

**学習ポイント**: OpenAI互換APIでも、すべてのパラメータがサポートされているわけではない

### フェーズ3: UI/UXの問題とGrokの語り口問題

#### 問題4: Grokが批評的すぎる語り口
**ユーザーからの指摘**:
> grokの口調が物語を語るというより批評的になっています

**問題のあった出力例**:
```
英雄たるあなたが、Day 1にしてさっそく逃げる準備を始めたのは、なかなか機知に富んだ選択だね—結局、魔王が来る前に少しでも余裕を持っておきたいものさ—が、予想外に村人たちが...
```

**分析**: Grokの性格（機知に富んだ、皮肉的）が強すぎて没入感を阻害

**解決策**: プロンプトの大幅改善
```typescript
// ❌ 修正前: Grokの個性を強調
`Grokらしい機知に富んだ語り口で、時には皮肉も交えて。`

// ✅ 修正後: 物語重視
`この行動の結果を、没入感のある物語として2-3文で描写してください：
- プレイヤー視点で体験を描く
- 具体的な場面や感覚を含める  
- 批評や解説ではなく、物語の一部として語る
例：「あなたは〜した。すると〜が起こり、〜を感じた。」`
```

#### 問題5: 自由入力後に選択肢ボタンが無効化される
**現象**: 
1. 自由入力で「魔法を学ぶ」と入力
2. AIが応答を生成
3. 新しい選択肢が表示されるが、クリックできない

**デバッグプロセス**:
```javascript
// 問題箇所の特定
function updateChoices(choices) {
  choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.disabled = isProcessing; // ← ここが問題！
    // 選択肢作成時にisProcessingがtrueのままでボタンが無効
  });
}
```

**解決策**: 状態管理の分離
```javascript
// ✅ 修正版: ボタン状態制御を分離
function updateChoices(choices) {
  // ボタンは常に有効で作成
  const button = document.createElement('button');
  // 状態制御は別関数で管理
}

function toggleButtonsEnabled(enabled) {
  document.querySelectorAll('.choice-button').forEach(btn => {
    btn.disabled = !enabled;
  });
}
```

### フェーズ4: generateObjectエラーとJSON処理

#### 問題6: AI SDK Warning - JSON response format not supported
**エラーログ**:
```
AI SDK Warning: The "responseFormat" setting is not supported by this model - JSON response format schema is not supported
```

**調査結果**: Grok APIは`generateObject`をサポートしていない

**解決策**: `generateText` + JSON文字列パースに変更
```typescript
// ❌ 失敗アプローチ: generateObject使用
const { object } = await generateObject({
  model: xai('grok-3-mini'),
  schema: ChoicesSchema,
  prompt,
});

// ✅ 成功アプローチ: generateText + JSON解析
const { text } = await generateText({
  model: xai('grok-3-mini'),
  prompt: `...JSONのみを返してください。`,
});

const jsonMatch = text.match(/\{[\s\S]*\}/);
const parsed = JSON.parse(jsonMatch[0]);
```

**学習ポイント**: AI SDKの統一APIでも、モデルごとに対応機能が異なる

## 🎯 最終アーキテクチャ

### 成功した設計パターン

#### 1. 設定の集約化
```typescript
// src/config/gameConfig.ts
export const GAME_CONFIG = {
  MODELS: {
    NARRATIVE: 'grok-3-mini',     // コスト効率重視
    CHOICES: 'grok-3-mini',
    IMAGE: 'grok-2-image-1212'
  },
  IMAGE_GENERATION_DAYS: [1, 10, 20, 30], // コスト管理
  MAX_DAYS: 30
} as const;
```

#### 2. エラーハンドリングの統一
```typescript
// src/utils/errorHandler.ts
export function handleError(error: unknown, context: string): string {
  if (error.message.includes('429')) {
    return 'API制限に達しました。少し時間をおいてから再試行してください。';
  }
  return `予期しないエラー: ${error.message}`;
}
```

#### 3. 状態管理とUI制御の分離
```javascript
// UIの状態制御を関数に分離
function toggleButtonsEnabled(enabled) {
  document.querySelectorAll('.choice-button').forEach(btn => {
    btn.disabled = !enabled;
  });
}
```

## 📊 パフォーマンスとコスト最適化結果

### コスト削減実績
| 施策 | 削減率 | 実装方法 |
|------|--------|----------|
| grok-3-mini使用 | 94% | grok-4 → grok-3-mini |
| 画像生成制限 | 制御 | 30回 → 4回（Day 1,10,20,30） |
| 音声合成無料 | 100% | AIVIS無料ベータ活用 |

**最終目標達成**: 1プレイあたり **$0.50以下**

### 技術的成果
- **完全自由度**: プレイヤーが何でも入力可能（「魔王と踊る」「村を燃やす」等）
- **AI創造性**: 予想外の入力もGrokが創造的に物語に組み込む
- **動的体験**: 毎回異なる物語展開
- **安定性**: エラー時のフォールバック戦略

## 🔧 リファクタリング成果

### Before/After比較
```typescript
// ❌ リファクタリング前
private async generateNarrative(action: string): Promise<string> {
  // TODO: 実際のAPI呼び出しに置き換える
  return `固定テキスト`;
}

// ✅ リファクタリング後
static async generateNarrative(day: number, playerAction: string, gameState: any): Promise<string> {
  try {
    const response = await generateText({
      model: xai(GAME_CONFIG.MODELS.NARRATIVE),
      prompt: buildNarrativePrompt(day, playerAction, gameState),
      temperature: 0.8,
      maxTokens: 200,
    });
    
    if (!response.text?.trim()) {
      throw new AIError('空の応答');
    }
    
    return response.text;
  } catch (error) {
    console.error('物語生成エラー:', handleError(error, 'generateNarrative'));
    return getFallbackNarrative(playerAction, day);
  }
}
```

## 🚀 今後の技術記事で言及すべきポイント

### 1. AI API統合の罠
- OpenAI互換 ≠ 全機能対応
- `generateObject`の対応状況
- パラメータサポート状況の事前調査の重要性

### 2. UXでのAI活用
- 批評的AI vs 没入感重視
- プロンプトエンジニアリングの影響力
- ユーザーフィードバックに基づく迅速な改善

### 3. 状態管理とエラーハンドリング
- フロントエンドでの適切な状態分離
- AI APIのフォールバック戦略
- ユーザー体験を損なわないエラー処理

### 4. コスト最適化
- モデル選択による94%削減効果
- 機能制限による cost control
- 無料サービスの戦略的活用

## 📝 まとめ

約半日で完全なAI駆動型RPGを実装。主要な学習は：

1. **MVP優先**: 完璧より動くものを先に
2. **実際のテスト**: 机上の設計より実装して発見
3. **ユーザーフィードバック**: UX改善の最重要指標
4. **適切な技術選択**: 全機能ではなく、要件に合った選択

この経験は、AI統合アプリケーション開発の実践的ガイドとして技術記事化できる内容です。