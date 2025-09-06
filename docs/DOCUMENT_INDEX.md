# 📚 ドキュメントインデックス

## プロジェクトドキュメント構成

### 🚀 はじめに
- [README.md](../README.md) - プロジェクト概要とクイックスタート
- [QUICK_START.md](./QUICK_START.md) - **即座に動作するコード例**（新規開発者はここから）

### 🏗 アーキテクチャ＆設計
- [ARCHITECTURE.md](./ARCHITECTURE.md) - システムアーキテクチャ設計
- [GAME_DESIGN.md](./GAME_DESIGN.md) - ゲーム仕様とメカニクス
- [agent-specs.md](../specs/agent-specs.md) - エージェント詳細仕様
- [game-flow.md](../specs/game-flow.md) - ゲームフロー仕様

### 💻 実装ガイド
- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - **完全な技術実装ガイド**
  - Volt Agent統合（2つの方法）
  - Grok API詳細（全モデル仕様、料金、最適化）
  - 画像生成機能（grok-2-image-1212）
  - AIVIS Cloud API音声合成（ストリーミング実装）
  - コスト最適化戦略
  - エラーハンドリング

### 🔧 開発＆運用
- [DEVELOPMENT.md](./DEVELOPMENT.md) - 開発ガイドライン
- [SETUP.md](./SETUP.md) - 環境セットアップ
- [DEBUG_MONITORING.md](./DEBUG_MONITORING.md) - **デバッグと監視**（VoltOps統合）
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - トラブルシューティング

### 🔌 API＆統合
- [API.md](./API.md) - ゲームAPI仕様
- [API_REFERENCE.md](./API_REFERENCE.md) - APIリファレンス
- [AIVIS_INTEGRATION.md](./AIVIS_INTEGRATION.md) - AIVIS Cloud API統合詳細

## 📋 優先順位別読み順

### 新規開発者向け（最速でゲームを動かす）
1. [QUICK_START.md](./QUICK_START.md) - コピペで動く実装例
2. [SETUP.md](./SETUP.md) - 環境構築
3. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - エラー対処

### 機能開発者向け（新機能を追加する）
1. [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - 技術詳細
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - システム構成
3. [DEBUG_MONITORING.md](./DEBUG_MONITORING.md) - デバッグ方法

### プロジェクトマネージャー向け
1. [README.md](../README.md) - プロジェクト概要
2. [GAME_DESIGN.md](./GAME_DESIGN.md) - ゲーム仕様
3. [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)の第5章（コスト最適化）

## 🎯 重要な技術選択

### Volt Agent統合方法
- **推奨**: Vercel AI SDK経由（堅牢性重視）
- **代替**: OpenAI互換API（パフォーマンス重視）

### モデル選択ガイドライン
| タスク | モデル | コスト | 理由 |
|--------|--------|--------|------|
| 物語生成 | grok-4 | 高 | 品質最優先 |
| ゲームロジック | grok-code-fast-1 | 低 | 高速処理 |
| NPC対話 | grok-3-mini | 最低 | コスト効率 |
| 画像生成 | grok-2-image-1212 | $0.07/枚 | 視覚演出 |

### コスト目標
- **1プレイあたり**: $0.50以下
- **画像生成**: 4枚まで（Day 1, 10, 20, 30）
- **音声合成**: 現在無料（AIVIS Cloud APIベータ期間）

## 🔍 キーワード検索

### Volt Agent関連
- Supervisor/Sub-agentパターン → [IMPLEMENTATION_GUIDE.md#13](./IMPLEMENTATION_GUIDE.md#13-supervisorsub-agentパターン)
- ワークフローエンジン → [IMPLEMENTATION_GUIDE.md#14](./IMPLEMENTATION_GUIDE.md#14-ワークフローエンジンによる決定論的プロセス)
- エージェント間通信 → [agent-specs.md](../specs/agent-specs.md)

### Grok API関連
- モデル仕様と価格 → [IMPLEMENTATION_GUIDE.md#22](./IMPLEMENTATION_GUIDE.md#22-モデル仕様と価格)
- 構造化出力 → [IMPLEMENTATION_GUIDE.md#23](./IMPLEMENTATION_GUIDE.md#23-構造化出力による堅牢な実装)
- キャッシュプロンプト → [IMPLEMENTATION_GUIDE.md#24](./IMPLEMENTATION_GUIDE.md#24-キャッシュプロンプトによるコスト削減)

### 画像生成
- ImageGeneratorAgent → [IMPLEMENTATION_GUIDE.md#31](./IMPLEMENTATION_GUIDE.md#31-imagegeneratoragent実装)
- コスト管理 → [QUICK_START.md#2](./QUICK_START.md#2-画像生成機能の追加動作確認済み)

### 音声合成（AIVIS）
- ストリーミング実装 → [IMPLEMENTATION_GUIDE.md#41](./IMPLEMENTATION_GUIDE.md#41-apiサービス実装)
- Web Audio API → [IMPLEMENTATION_GUIDE.md#42](./IMPLEMENTATION_GUIDE.md#42-web-audio-apiによるストリーミング再生)
- 料金体系 → [AIVIS_INTEGRATION.md#6](./AIVIS_INTEGRATION.md#6-料金とレート制限)

### デバッグ＆監視
- VoltOps統合 → [DEBUG_MONITORING.md#1](./DEBUG_MONITORING.md#voltops統合による可観測性)
- パフォーマンス監視 → [DEBUG_MONITORING.md#パフォーマンス監視](./DEBUG_MONITORING.md#パフォーマンス監視)
- デバッグコンソール → [DEBUG_MONITORING.md#1-開発用コンソールコマンド](./DEBUG_MONITORING.md#1-開発用コンソールコマンド)

## 📝 更新履歴

| 日付 | ドキュメント | 更新内容 |
|------|------------|----------|
| 2025-09-06 | IMPLEMENTATION_GUIDE.md | 添付資料を基に全面改訂 |
| 2025-09-06 | QUICK_START.md | 即座に動作するコード例を追加 |
| 2025-09-06 | DEBUG_MONITORING.md | VoltOps統合とデバッグツール追加 |
| 2025-09-06 | DOCUMENT_INDEX.md | ドキュメント全体の索引作成 |

## ⚠️ 注意事項

### APIキー管理
```bash
# 絶対にコミットしないこと
.env
.env.local
.env.production
```

### 現在の制限事項
- grok-4 heavy: API経由では利用不可（SuperGrok Heavy tier限定）
- AIVIS Cloud API: 無料ベータ期間中（将来的に有料化予定）
- 画像生成: 1ゲームあたり4枚まで（コスト管理のため）

### 推奨開発環境
- Node.js: v20以上
- TypeScript: v5.9以上
- npm: v8以上

## 🤝 貢献ガイドライン

ドキュメントの改善提案は以下の形式でお願いします：

1. 誤字・脱字の修正: 直接PRを送信
2. 内容の追加・変更: Issueで議論後にPR
3. 新規ドキュメント: プロポーザルをIssueで提出

## 📞 サポート

- 技術的な質問: [GitHub Issues](https://github.com/[username]/demon-lord-rpg/issues)
- ドキュメントの不明点: このインデックスを参照
- 緊急の問題: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)を確認

---

*このインデックスは、プロジェクトのすべてのドキュメントへの迅速なアクセスを提供します。*
*最終更新: 2025年9月6日*