// src/server.ts
import express from 'express';
import { OptimizedGameLoop } from './game/OptimizedGameLoop';
import { AudioNarrator } from './features/audioNarration';

const app = express();
const defaultPort = parseInt(process.env.PORT || '3141');

app.use(express.json());
app.use(express.static('public'));

const gameLoop = new OptimizedGameLoop();
const narrator = new AudioNarrator();

// ゲームコマンドAPI
app.post('/api/command', async (req, res) => {
  const { command } = req.body;
  
  try {
    const response = await gameLoop.processPlayerActionOptimized(command);
    
    // OptimizedGameLoopは既に音声データを含んでいる可能性がある
    let audioData = response.audio?.data || null;
    
    // 音声データがない場合は生成
    if (!audioData && response.narrative) {
      console.log('🎵 Starting audio generation for client...');
      const audioResult = await narrator.narrate(response.narrative, gameLoop.currentDayNumber);
      if (audioResult.success) {
        audioData = audioResult.audioData;
        console.log('✅ Audio data prepared for client');
      } else {
        console.log('⏭️ Audio generation skipped:', audioResult.reason);
      }
    }
    
    // レスポンスを標準形式に変換
    const responseWithAudio = {
      day: response.day,
      narrative: response.narrative,
      imageUrl: response.imageUrl,
      choices: response.choices,
      gameOver: response.gameOver,
      specialEvent: response.specialEvent,
      audioData,
      // ゲーム状態を含める
      gameState: response.gameState
    };
    
    res.json(responseWithAudio);
  } catch (error) {
    console.error("コマンド処理エラー:", error);
    res.status(500).json({ error: "処理中にエラーが発生しました" });
  }
});

// ゲーム状態API
app.get('/api/status', (req, res) => {
  res.json({
    day: gameLoop.currentDayNumber,
    maxDays: 30,
    gameState: gameLoop.gameStateData
  });
});

// ポート競合を回避してサーバーを起動
function startServerWithPortFallback(startPort: number): void {
  const server = app.listen(startPort, () => {
    console.log(`🎮 ゲームサーバー起動: http://localhost:${startPort}`);
    if (startPort !== defaultPort) {
      console.log(`⚠️ ポート${defaultPort}が使用中のため、ポート${startPort}を使用します`);
    }
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ ポート${startPort}が使用中です。次のポート${startPort + 1}を試します...`);
      startServerWithPortFallback(startPort + 1);
    } else {
      console.error('❌ サーバー起動に失敗しました:', err);
      process.exit(1);
    }
  });
}

// サーバー起動
startServerWithPortFallback(defaultPort);