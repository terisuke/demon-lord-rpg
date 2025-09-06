import { z } from 'zod';

// プレイヤー役割スキーマ
export const PlayerRoleSchema = z.enum([
  'hero',
  'merchant',
  'coward',
  'traitor',
  'villager',
  'sage',
  'mercenary',
]);

// プレイヤー統計スキーマ
export const PlayerStatsSchema = z.object({
  level: z.number().min(1).max(100),
  health: z.number().min(0).max(100),
  strength: z.number().min(0).max(100),
  knowledge: z.number().min(0).max(100),
  reputation: z.number().min(-100).max(100),
  wealth: z.number().min(0),
  allies: z.array(z.string()),
});

// インベントリアイテムスキーマ
export const InventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['weapon', 'item', 'food', 'information']),
  value: z.number().min(0),
  description: z.string().optional(),
});

// NPC関係スキーマ
export const NPCRelationshipSchema = z.object({
  npcName: z.string(),
  affinity: z.number().min(-100).max(100),
  trust: z.number().min(0).max(100),
  knownInformation: z.array(z.string()),
});

// ゲーム状態スキーマ
export const GameStateSchema = z.object({
  currentDay: z.number().int().min(1).max(30),
  playerRole: PlayerRoleSchema,
  playerName: z.string().min(1).max(50),
  location: z.string(),
  playerStats: PlayerStatsSchema,
  inventory: z.array(InventoryItemSchema),
  gameFlags: z.record(z.string(), z.boolean()),
  npcRelationships: z.record(z.string(), NPCRelationshipSchema),
});

// 選択肢の結果スキーマ
export const ConsequenceEffectSchema = z.object({
  type: z.enum(['stat', 'item', 'flag', 'relationship', 'location']),
  target: z.string(),
  change: z.union([z.number(), z.string(), z.boolean()]),
});

export const DelayedEffectSchema = ConsequenceEffectSchema.extend({
  delayDays: z.number().min(0).max(30),
});

// 選択肢スキーマ
export const ChoiceSchema = z.object({
  id: z.string(),
  text: z.string(),
  requirements: z
    .object({
      stats: PlayerStatsSchema.partial().optional(),
      items: z.array(z.string()).optional(),
      flags: z.array(z.string()).optional(),
      role: z.array(PlayerRoleSchema).optional(),
    })
    .optional(),
  consequences: z.object({
    immediate: z.array(ConsequenceEffectSchema),
    delayed: z.array(DelayedEffectSchema).optional(),
  }),
});

// ゲームイベントスキーマ
export const GameEventSchema = z.object({
  id: z.string(),
  day: z.number().int().min(1).max(30),
  type: z.enum(['morning', 'noon', 'evening', 'night']),
  title: z.string(),
  description: z.string(),
  choices: z.array(ChoiceSchema),
});

// エンディングタイプスキーマ
export const EndingTypeSchema = z.enum([
  'PERFECT_VICTORY',
  'COSTLY_VICTORY',
  'TACTICAL_RETREAT',
  'DEVASTATING_DEFEAT',
  'ESCAPE_SUCCESS',
  'BETRAYAL_SUCCESS',
  'MERCHANT_SUCCESS',
  'UNEXPECTED_PEACE',
]);

// コマンド入力スキーマ
export const CommandInputSchema = z.object({
  command: z.string().min(1).max(500),
  sessionId: z.string().uuid().optional(),
});

// レスポンススキーマ
export const GameResponseSchema = z.object({
  success: z.boolean(),
  narrative: z.string(),
  gameState: GameStateSchema.optional(),
  choices: z.array(ChoiceSchema).optional(),
  error: z.string().optional(),
});
