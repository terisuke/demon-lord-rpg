# セットアップガイド

## 📋 前提条件

以下のソフトウェアがインストールされている必要があります：

- **Node.js**: v20.0.0以上（推奨: v22.x）
- **npm**: v9.0.0以上
- **Git**: 最新版
- **VS Code**: 推奨エディタ（オプション）

## 🔑 APIキーの取得

### 1. Grok API (xAI)

1. [xAI Console](https://console.x.ai)にアクセス
2. アカウントを作成（GoogleまたはXアカウントでログイン可）
3. 左メニューから「API Keys」を選択
4. 「Create API Key」をクリック
5. キーに名前を付けて作成（例：`demon-lord-rpg`）
6. **⚠️ 重要**: 表示されたキーを直ちにコピー（一度しか表示されません）

### 2. AIVIS Cloud API（オプション - 音声機能用）

*現在調査中のため、後日追加予定*

## 🚀 プロジェクトセットアップ

### Step 1: リポジトリのクローン

```bash
# HTTPSでクローン
git clone https://github.com/[username]/demon-lord-rpg.git

# またはSSHでクローン
git clone git@github.com:[username]/demon-lord-rpg.git

# プロジェクトディレクトリに移動
cd demon-lord-rpg
```

### Step 2: Volt Agentプロジェクトの初期化

```bash
# Volt Agentプロジェクトを初期化
npm create voltagent-app@latest .

# プロンプトに従って設定
# ? Project Name: demon-lord-rpg
# ? AI Provider: Groq (一時的に選択、後でGrokに変更)
# ? API Key: スキップ（Enterキー）
# ? Package Manager: npm
```

### Step 3: 依存関係のインストール

```bash
# 基本依存関係
npm install @voltagent/core @voltagent/vercel-ai @ai-sdk/xai zod

# 開発依存関係
npm install -D typescript @types/node tsx eslint prettier \
  eslint-config-prettier eslint-plugin-prettier \
  @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### Step 4: 環境変数の設定

```bash
# .env.exampleをコピー
cp .env.example .env

# .envファイルを編集
nano .env  # またはお好みのエディタで開く
```

`.env`ファイルの内容：

```env
# Grok API設定
XAI_API_KEY=your_grok_api_key_here

# オプション：音声API設定
AIVIS_API_KEY=your_aivis_api_key_here

# サーバー設定
PORT=3141
NODE_ENV=development

# データベース設定（デフォルトはローカルSQLite）
DATABASE_URL=file:./.voltagent/memory.db

# デバッグ設定
DEBUG=true
LOG_LEVEL=info
```

### Step 5: TypeScript設定

`tsconfig.json`を作成：

```bash
cat > tsconfig.json << 'EOF'
{
  "extends": "@tsconfig/node22/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

### Step 6: プロジェクト構造の作成

```bash
# ディレクトリ構造を作成
mkdir -p src/{agents,types,utils,services,schemas}
mkdir -p public/{css,js,assets}
mkdir -p tests/{unit,integration}

# 基本ファイルの作成
touch src/index.ts
touch src/types/index.ts
touch src/schemas/index.ts
```

## 🔧 開発環境の設定

### VS Code推奨拡張機能

`.vscode/extensions.json`を作成：

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "streetsidesoftware.code-spell-checker",
    "usernamehw.errorlens",
    "gruntfuggly.todo-tree"
  ]
}
```

### ESLint設定

`.eslintrc.js`を作成：

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
```

### Prettier設定

`.prettierrc.json`を作成：

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "semi": true,
  "printWidth": 100
}
```

## ✅ 動作確認

### Step 1: 基本的なエージェントテスト

`src/index.ts`に以下を記述：

```typescript
import { VoltAgent, Agent } from '@voltagent/core';
import { VercelAIProvider } from '@voltagent/vercel-ai';
import { xai } from '@ai-sdk/xai';

const testAgent = new Agent({
  name: 'TestAgent',
  instructions: 'You are a helpful test agent.',
  llm: new VercelAIProvider(),
  model: xai('grok-4'),
});

async function test() {
  const response = await testAgent.generateText({
    prompt: 'Say hello to the demon lord RPG!',
  });
  console.log(response.text);
}

test().catch(console.error);
```

### Step 2: テスト実行

```bash
# 開発モードで実行
npm run dev

# 正常に動作すれば、Grokからの応答が表示されます
```

## 🐛 トラブルシューティング

### 問題: APIキーエラー

```
Error: Invalid API key
```

**解決方法**:
1. `.env`ファイルのAPIキーを確認
2. キーの前後に余分なスペースがないか確認
3. xAI Consoleで新しいキーを生成

### 問題: モジュールが見つからない

```
Cannot find module '@voltagent/core'
```

**解決方法**:
```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

### 問題: TypeScriptエラー

```
TSError: ⨯ Unable to compile TypeScript
```

**解決方法**:
```bash
# TypeScript設定を確認
npx tsc --noEmit

# 型定義を再インストール
npm install -D @types/node
```

### 問題: ポート使用中

```
Error: Port 3141 is already in use
```

**解決方法**:
```bash
# 別のポートを使用
PORT=3142 npm run dev

# または使用中のプロセスを終了
lsof -i :3141
kill -9 [PID]
```

## 📞 サポート

セットアップで問題が発生した場合：

1. [GitHub Issues](https://github.com/[username]/demon-lord-rpg/issues)で報告
2. エラーメッセージの全文を含める
3. 実行した手順を詳細に記載
4. 環境情報（Node.jsバージョン等）を含める

## 🎯 次のステップ

セットアップが完了したら：

1. [開発ガイドライン](./DEVELOPMENT.md)を読む
2. [ゲーム設計書](./GAME_DESIGN.md)で仕様を確認
3. [アーキテクチャ設計](./ARCHITECTURE.md)でシステム構成を理解
4. 実装を開始！

---

*Happy Coding! 🚀*
