// src/config/gameConfig.ts - ゲーム設定の集約
export const GAME_CONFIG = {
  // 基本設定
  MAX_DAYS: 30,

  // 画像生成設定
  IMAGE_GENERATION_DAYS: [1, 10, 20, 30],
  IMAGE_COST_PER_GENERATION: 0.07,

  // 特別イベント発生日
  SPECIAL_EVENT_DAYS: [5, 10, 15, 20, 25, 29, 30],

  // Grokモデル設定
  MODELS: {
    NARRATIVE: 'grok-3-mini', // 物語生成 - コスト効率重視
    CHOICES: 'grok-3-mini', // 選択肢生成
    SPECIAL_EVENTS: 'grok-3-mini', // 特別イベント
    IMAGE: 'grok-2-image-1212', // 画像生成
  },

  // プレイヤー役割別初期ステータス
  ROLE_STATS: {
    hero: { strength: 35, reputation: 10, wealth: 100, knowledge: 20 },
    merchant: { strength: 20, reputation: 0, wealth: 300, knowledge: 30 },
    coward: { strength: 10, reputation: 0, wealth: 100, knowledge: 20 },
    traitor: { strength: 20, reputation: -10, wealth: 100, knowledge: 35 },
    sage: { strength: 20, reputation: 0, wealth: 50, knowledge: 40 },
    mercenary: { strength: 40, reputation: 0, wealth: 150, knowledge: 20 },
    villager: { strength: 20, reputation: 0, wealth: 100, knowledge: 20 },
  },

  // エンディング条件
  ENDINGS: {
    HERO_TRIUMPH: { weapon: true, reputation: { min: 50 } },
    WISE_VICTORY: { trained: true, info: true },
    TRAITOR_END: { reputation: { max: -20 } },
    ESCAPIST: { elder: false, weapon: false },
    VILLAGER_RESISTANCE: {}, // デフォルト
  },
} as const;

export type PlayerRole =
  | 'hero'
  | 'merchant'
  | 'coward'
  | 'traitor'
  | 'sage'
  | 'mercenary'
  | 'villager';
export type GameEnding = keyof typeof GAME_CONFIG.ENDINGS;
