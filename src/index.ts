// src/index.ts - PdMのQUICK_START.md MVP版
import { VoltAgent, Agent } from '@voltagent/core';
import { VercelAIProvider } from '@voltagent/vercel-ai';
import { xai } from '@ai-sdk/xai';
import * as dotenv from 'dotenv';

dotenv.config();

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const mode = args[0] || 'simple';

  if (mode === 'server' || mode === 'web') {
    // HTTPサーバーモード（フロントエンド付き）
    console.log('🌐 HTTPサーバーモードを起動します...');
    const { default: startServer } = await import('./server');
    await startServer();
    return;
  }

  // ゲームモード
  console.log('🤖 ゲームモードを起動します...');

  const UnifiedGameEngine = (await import('./game/UnifiedGameEngine')).default;
  const gameEngine = new UnifiedGameEngine();

  // コマンドライン引数でゲームモードを指定
  if (args.includes('--volt-agent')) {
    gameEngine.setGameMode('volt-agent');
  } else {
    gameEngine.setGameMode('simple');
  }

  // デモモードの設定
  const demoMode = args.includes('--demo');

  console.log('');
  console.log('🎮 Available Game Modes:');
  const modeInfo = gameEngine.getGameModeInfo();
  Object.entries(modeInfo).forEach(([key, info]) => {
    const indicator = gameEngine.getGameMode() === key ? '👉' : '  ';
    console.log(`${indicator} ${info.name}: ${info.description}`);
    console.log(`     Status: ${info.status}`);
  });
  console.log('');

  // ゲーム開始
  await gameEngine.startGame({ demoMode });
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
