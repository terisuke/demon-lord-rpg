// src/server.ts
import express from 'express';
import { GameLoop } from './game/GameLoop';
import { AudioNarrator } from './features/audioNarration';

const app = express();
const port = process.env.PORT || 3141;

app.use(express.json());
app.use(express.static('public'));

const gameLoop = new GameLoop();
const narrator = new AudioNarrator();

// ゲームコマンドAPI
app.post('/api/command', async (req, res) => {
  const { command } = req.body;
  
  try {
    const response = await gameLoop.processPlayerAction(command);
    
    // 音声生成（非同期で実行）
    if (response.narrative) {
      narrator.narrate(response.narrative).catch(console.error);
    }
    
    res.json(response);
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

app.listen(port, () => {
  console.log(`🎮 ゲームサーバー起動: http://localhost:${port}`);
});