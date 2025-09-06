import { generateText } from 'ai';
import { xai } from '@ai-sdk/xai';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config();

// Grok API接続テスト
async function testGrokConnection() {
  console.log('🧪 Grok API接続テストを開始します...');
  
  try {
    // APIキーの確認
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      throw new Error('XAI_API_KEY が設定されていません');
    }
    
    console.log('✅ APIキーが設定されています');
    
    console.log('✅ テストモデルを準備しました');
    
    // API呼び出しテスト
    const response = await generateText({
      model: xai('grok-2-latest'),
      messages: [
        {
          role: 'user',
          content: 'こんにちは！魔王RPGのテストです。簡潔に挨拶してください。'
        }
      ]
    });
    
    console.log('✅ Grok APIからのレスポンス:');
    console.log('📝', response.text);
    
    return true;
  } catch (error) {
    console.error('❌ Grok API接続テストに失敗しました:', error);
    return false;
  }
}

// メイン関数
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'test';

  if (mode === 'play' || mode === 'game') {
    // ゲーム実行モード
    const { startDemonLordRPG } = await import('./game');
    await startDemonLordRPG();
    return;
  }

  // テストモード（デフォルト）
  console.log('🏰 30日後の魔王襲来 - 開発環境テスト');
  console.log('=====================================');
  
  // 環境確認
  console.log('📋 環境情報:');
  console.log(`   Node.js: ${process.version}`);
  console.log(`   環境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   ポート: ${process.env.PORT || 3141}`);
  console.log('');
  
  // Grok API接続テスト
  const connectionTest = await testGrokConnection();
  
  if (connectionTest) {
    console.log('');
    console.log('🎉 すべてのテストが成功しました！');
    console.log('');
    console.log('🎮 ゲームを開始するには:');
    console.log('   npm run dev play');
    console.log('   または');
    console.log('   npx tsx src/index.ts play');
  } else {
    console.log('');
    console.log('❌ テストに失敗しました。環境設定を確認してください。');
    process.exit(1);
  }
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

// メイン関数の実行
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ メイン関数でエラーが発生しました:', error);
    process.exit(1);
  });
}

export { main };