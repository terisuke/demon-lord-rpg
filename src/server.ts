// src/server.ts - P0機能統合版（並列処理最適化）
import express from 'express';
import { GameLoop } from './game/GameLoop';
import { optimizedGameLoop } from './game/OptimizedGameLoop';
import { AudioNarrator } from './features/audioNarration';

const app = express();
const port = process.env.PORT || 3141;

app.use(express.json());
app.use(express.static('public'));

// P0: 最適化モード切り替え
const USE_OPTIMIZED_MODE = process.env.OPTIMIZED_MODE !== 'false'; // デフォルトで最適化ON
const gameLoop = USE_OPTIMIZED_MODE ? optimizedGameLoop : new GameLoop();
const narrator = new AudioNarrator();

console.log('🎵 AIVIS Enhanced Audio Server 起動');
console.log(`🚀 並列処理最適化: ${USE_OPTIMIZED_MODE ? 'ON' : 'OFF'}`);
console.log(`   統計: ${JSON.stringify(narrator.getStats())}`);

// ゲームコマンドAPI（P0機能統合 + 並列処理最適化）
app.post('/api/command', async (req, res) => {
  const { command } = req.body;

  try {
    let response;

    if (USE_OPTIMIZED_MODE && 'processPlayerActionOptimized' in gameLoop) {
      // 最適化モード：既に音声処理も含めて並列実行
      console.log(`⚡ [最適化] 並列処理開始: "${command}"`);
      response = await (gameLoop as any).processPlayerActionOptimized(command);

      // パフォーマンス情報をログ出力
      console.log(
        `⚡ パフォーマンス: 全体${response.performance.totalTime}ms ` +
          `(並列${response.performance.parallelTime}ms + 順次${response.performance.serialTime}ms) ` +
          `完了${response.performance.tasksCompleted}件`
      );
    } else {
      // 従来モード：音声処理を別途実行
      response = await gameLoop.processPlayerAction(command);

      // P0: Day情報付きで音声生成
      let audioResult = null;
      if (response.narrative) {
        console.log(`🎵 [Day ${response.day}] ナレーション音声生成開始`);
        audioResult = await narrator.narrate(response.narrative, response.day, 'narrative');
      }

      // レスポンスに音声データを含める
      response = {
        ...response,
        audio: audioResult?.success
          ? {
              data: audioResult.audioData,
              reason: audioResult.reason,
            }
          : null,
      };
    }

    res.json(response);
  } catch (error) {
    console.error('❌ コマンド処理エラー:', error);
    res.status(500).json({ error: '処理中にエラーが発生しました' });
  }
});

// P0: 音声API
app.post('/api/audio/synthesize', async (req, res) => {
  const { text, day = 1, context = 'narrative' } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'テキストが必要です' });
  }

  try {
    const audioResult = await narrator.narrate(text, day, context);

    if (audioResult.success && audioResult.audioData) {
      // Base64データを直接返す（フロントエンドでAudio要素に設定可能）
      res.json({
        success: true,
        audioData: audioResult.audioData,
        reason: audioResult.reason,
      });
    } else {
      res.json({
        success: false,
        reason: audioResult.reason || '音声生成失敗',
      });
    }
  } catch (error) {
    console.error('❌ 音声合成APIエラー:', error);
    res.status(500).json({ error: '音声合成に失敗しました' });
  }
});

// P0: 音声制御API
app.post('/api/audio/control', async (req, res) => {
  const { action, value } = req.body;

  try {
    switch (action) {
      case 'toggle':
        narrator.toggleAudio(value);
        break;
      case 'volume':
        narrator.setVolume(value);
        break;
      default:
        return res.status(400).json({ error: '不正なアクション' });
    }

    res.json({ success: true, stats: narrator.getStats() });
  } catch (error) {
    console.error('❌ 音声制御エラー:', error);
    res.status(500).json({ error: '音声制御に失敗しました' });
  }
});

// ゲーム状態API（音声統計追加）
app.get('/api/status', (req, res) => {
  res.json({
    day: gameLoop.currentDayNumber,
    maxDays: 30,
    gameState: gameLoop.gameStateData,
    audio: narrator.getStats(), // P0: 音声状態を追加
  });
});

// P0: キャラクター音声API
app.post('/api/character/speak', async (req, res) => {
  const { character, dialogue, day = 1 } = req.body;

  if (!character || !dialogue) {
    return res.status(400).json({ error: 'キャラクター名とセリフが必要です' });
  }

  try {
    const audioResult = await narrator.speakAsCharacter(character, dialogue, day);

    res.json({
      success: audioResult.success,
      audioData: audioResult.audioData || null,
    });
  } catch (error) {
    console.error(`❌ キャラクター音声エラー (${character}):`, error);
    res.status(500).json({ error: 'キャラクター音声生成に失敗しました' });
  }
});

// デバッグ用: AIVIS API状態確認
app.get('/api/audio/debug', async (req, res) => {
  const { aivisEnhanced } = await import('./services/AIVISEnhancedService');

  try {
    const status = aivisEnhanced.getStatus();
    const models = await aivisEnhanced.getAvailableModels();

    res.json({
      timestamp: new Date().toISOString(),
      status: status,
      models: models,
      environment: {
        hasApiKey: !!process.env.AIVIS_API_KEY,
        apiKeyLength: process.env.AIVIS_API_KEY?.length || 0,
      },
    });
  } catch (error) {
    console.error('❌ AIVIS デバッグエラー:', error);
    res.status(500).json({
      error: 'AIVIS状態確認エラー',
      message: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`🎮 Enhanced Game Server 起動: http://localhost:${port}`);
  console.log(`🎵 AIVIS音声統合: ${narrator.getStats().enabled ? '✅ ON' : '❌ OFF'}`);
  console.log('');
  console.log('📍 新API:');
  console.log('   POST /api/audio/synthesize - 音声合成');
  console.log('   POST /api/audio/control - 音声制御');
  console.log('   POST /api/character/speak - キャラクター音声');
  console.log('   GET  /api/audio/debug - AIVIS API状態確認');
});
