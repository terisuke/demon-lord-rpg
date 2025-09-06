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

### インストール

```bash
# リポジトリのクローン
git clone [repository-url]
cd demon-lord-rpg

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集してXAI_API_KEYを設定
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

- [アーキテクチャ設計](./docs/ARCHITECTURE.md)
- [セットアップガイド](./docs/SETUP.md)
- [ゲーム設計書](./docs/GAME_DESIGN.md)
- [API仕様書](./docs/API.md)
- [開発ガイドライン](./docs/DEVELOPMENT.md)

## 🎯 開発ロードマップ

### Phase 1: MVP（現在）
- [x] プロジェクト初期化
- [ ] 基本的なエージェント実装
- [ ] 30日カウントシステム
- [ ] 3つのエンディング実装

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

- Issue: [GitHub Issues](https://github.com/[username]/demon-lord-rpg/issues)
- Email: [連絡先メール]

---

*このプロジェクトはAI駆動型インタラクティブフィクションの新たな可能性を探求しています。*
