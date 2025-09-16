# 🏰 30日後の魔王襲来 - AI駆動型テキストベースRPG

## 📖 概要

「30日後の魔王襲来」は、プレイヤーが自由に役割を選び、30日後に襲来する魔王に対して様々な方法で立ち向かう（または逃げる）AI駆動型のテキストベースRPGです。

### 🎮 ゲームの特徴
- **自由な役割選択**: 英雄、商人、臆病者、裏切り者など、多様な役割でプレイ可能
- **構造化された自由度**: 30日間の期限付きで、自由度と緊張感を両立
- **動的な物語生成**: Grok APIによる個性的で予測不可能なナレーション
- **マルチエンディング**: プレイヤーの選択と準備度により変化する結末

## 🛠 技術スタック

| カテゴリ | 技術 | 用途 |
|---------|------|------|
| **フレームワーク** | Volt Agent | エージェントオーケストレーション |
| **AI/LLM** | Grok API (xAI) | 対話生成・ナラティブ |
| **言語** | TypeScript | 開発言語 |
| **データベース** | LibSQL (SQLite) | セーブデータ管理 |
| **音声** | AIVIS Cloud API | 音声合成（開発中） |
| **通信** | Server-Sent Events | リアルタイム通信 |

## 🚀 クイックスタート

### 前提条件
- Node.js v20以上
- npm または yarn
- Grok API キー（[xAI Console](https://console.x.ai)で取得）
- AIVIS Cloud API キー（[公式サイト](https://aivis-project.com/)で取得、現在無料）

### インストール

```bash
# リポジトリのクローン
git clone [repository-url]
cd demon-lord-rpg

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集して以下を設定：
# - XAI_API_KEY（必須）
# - AIVIS_API_KEY（音声機能用、オプション）
```

### 開発サーバーの起動

```bash
npm run dev
```

### ビルド

```bash
npm run build
npm start
```

## 📁 プロジェクト構造

```
demon-lord-rpg/
├── src/
│   ├── agents/         # 各エージェント定義
│   ├── types/          # TypeScript型定義
│   ├── utils/          # ユーティリティ関数
│   ├── services/       # 外部API連携
│   └── index.ts        # エントリーポイント
├── public/             # フロントエンド資産
├── docs/               # ドキュメント
├── specs/              # 仕様書
└── tests/              # テストファイル
```

## 📚 ドキュメント

### 基本ドキュメント
- [アーキテクチャ設計](./docs/ARCHITECTURE.md)
- [セットアップガイド](./docs/SETUP.md)
- [ゲーム設計書](./docs/GAME_DESIGN.md)
- [開発ガイドライン](./docs/DEVELOPMENT.md)

### 技術ドキュメント
- [🔧 実装ガイド](./docs/IMPLEMENTATION_GUIDE.md) - 完全な技術実装詳細
- [⚡ クイックスタート](./docs/QUICK_START.md) - 即座に動作するコード例  
- [📊 開発記録](./docs/DEVELOPMENT_JOURNEY.md) - **技術記事用**詳細なトライ&エラー
- [🔍 デバッグガイド](./docs/DEBUG_MONITORING.md) - VoltOps統合監視
- [🎙️ AIVIS統合](./docs/AIVIS_INTEGRATION.md) - 音声合成詳細
- [📖 APIリファレンス](./docs/API_REFERENCE.md)
- [🔧 トラブルシューティング](./docs/TROUBLESHOOTING.md)

## 🎯 開発ロードマップ

### Phase 1: MVP（完了 ✅）
- [x] プロジェクト初期化
- [x] Volt Agent + Grok API統合  
- [x] 完全自由度の実装（プレイヤーが何でも入力可能）
- [x] 動的物語生成（AI駆動）
- [x] 画像生成機能（Day 1,10,20,30）
- [x] 30日カウントダウンシステム
- [x] 5つのエンディング分岐
- [x] Web UI実装
- [x] 自由入力 + 動的選択肢システム

### Phase 2: 拡張機能
- [ ] 音声合成統合
- [ ] より複雑なNPCインタラクション
- [ ] セーブ/ロード機能の強化
- [ ] WebUIの改善

### Phase 3: 高度な機能
- [ ] マルチプレイヤー対応
- [ ] ビジュアル要素の追加
- [ ] コミュニティコンテンツ

## 🤝 貢献方法

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. プルリクエストを開く

詳細は[開発ガイドライン](./docs/DEVELOPMENT.md)を参照してください。

## 📄 ライセンス

[ライセンスタイプを記載]

## 👥 開発チーム

- **Product Manager**: [担当者名]
- **Tech Lead**: [担当者名]
- **Backend Engineer**: [担当者名]
- **Frontend Engineer**: [担当者名]
- **Technical Writer**: [担当者名]

## 📞 お問い合わせ

- **GitHub Issues**: [GitHub Issues](https://github.com/terisuke/demon-lord-rpg/issues)
- **公式メール**: company@cor-jp.com
- **技術サポート**: GitHub Issuesをご利用ください

---

*このプロジェクトはAI駆動型インタラクティブフィクションの新たな可能性を探求しています。*
