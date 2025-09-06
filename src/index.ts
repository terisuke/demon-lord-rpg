// src/index.ts - PdMのQUICK_START.md MVP版
import { VoltAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { xai } from "@ai-sdk/xai";
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'volt';

  if (mode === 'server' || mode === 'web') {
    // HTTPサーバーモード（フロントエンド付き）
    console.log("🌐 HTTPサーバーモードを起動します...");
    await import('./server');
    return;
  }

  // VoltAgentコンソールモード（デフォルト）
  console.log("🤖 VoltAgentコンソールモードを起動します...");

  // シンプルなゲームマスターエージェント
  const gameMasterAgent = new Agent({
    name: "GameMaster",
    instructions: `
      あなたは30日後に魔王が襲来するRPGのゲームマスターです。
      プレイヤーの行動に応じて物語を進めてください。
      現在はDay 1から始まります。
    `,
    llm: new VercelAIProvider(),
    model: xai("grok-3-mini"), // まずは安価なモデルでテスト
  });

  // Volt Agentサーバー起動
  const voltAgent = new VoltAgent({
    agents: {
      gameMaster: gameMasterAgent,
    },
  });

  console.log("🎮 ゲームサーバー起動完了");
  console.log("VoltOpsコンソールでgameMasterエージェントと対話してください");
  console.log("");
  console.log("🌐 Web版を起動するには:");
  console.log("   npm run dev server");
  console.log("   または");
  console.log("   npx tsx src/index.ts server");
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('❌ 予期しないエラーが発生しました:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未処理のPromise拒否:', reason);
  process.exit(1);
});

// メイン関数の実行 - ESモジュール対応
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ メイン関数でエラーが発生しました:', error);
    process.exit(1);
  });
}