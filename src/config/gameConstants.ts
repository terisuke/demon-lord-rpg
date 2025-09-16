// ゲーム定数定義
export const GAME_CONSTANTS = {
  // 基本ゲーム設定
  MAX_DAYS: 30,
  STARTING_DAY: 1,

  // プレイヤー能力値の範囲
  MAX_HEALTH: 100,
  MAX_REPUTATION: 100,
  MIN_REPUTATION: -100,
  STARTING_GOLD: 100,

  // 時間経過の確率
  RANDOM_DAY_ADVANCE_THRESHOLD: 0.7,

  // 重要な日程
  WARNING_DAYS: {
    DAY_10: 10,
    DAY_20: 20,
    DAY_25: 25,
    DAY_29: 29,
    FINAL_DAY: 30
  },

  // 画像生成の間隔
  IMAGE_GENERATION_INTERVAL: 3,
  IMPORTANT_IMAGE_DAYS: [1, 5, 10, 15, 20, 25, 30],

  // エラーメッセージ
  ERROR_MESSAGES: {
    MISSING_API_KEY: 'XAI_API_KEY が設定されていません',
    INVALID_PLAYER_NAME: '名前を入力してください',
    GAME_ENGINE_NOT_INITIALIZED: 'Game engine not initialized. Call initialize() first.',
    ACTION_PROCESSING_FAILED: '行動処理に失敗しました'
  },

  // ゲームバランス調整
  DAILY_HEALTH_RECOVERY: 5,
  DAILY_REPUTATION_DECAY: 1,
  FATIGUE_THRESHOLD: 90,

  // AIモデル設定
  MODELS: {
    GAME_MASTER: 'grok-4',
    STORY_TELLER: 'grok-4',
    EVENT_MANAGER: 'grok-code-fast-1',
    NPC_AGENTS: 'grok-3-mini',
    IMAGE_GENERATOR: 'grok-2-image-1212'
  }
} as const;

// 型安全性のための型定義
export type GameConstants = typeof GAME_CONSTANTS;
export type PlayerRole = 'hero' | 'merchant' | 'coward' | 'traitor' | 'villager' | 'sage' | 'mercenary';
export type ModelType = keyof typeof GAME_CONSTANTS.MODELS;