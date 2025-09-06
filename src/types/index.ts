// ゲームの基本型定義
export type PlayerRole =
  | 'hero'
  | 'merchant'
  | 'coward'
  | 'traitor'
  | 'villager'
  | 'sage'
  | 'mercenary';

export interface GameState {
  currentDay: number;
  playerRole: PlayerRole;
  playerName: string;
  location: string;
  playerStats: PlayerStats;
  inventory: InventoryItem[];
  gameFlags: Record<string, boolean>;
  npcRelationships: Record<string, NPCRelationship>;
}

export interface PlayerStats {
  level: number;
  health: number;
  strength: number;
  knowledge: number;
  reputation: number;
  wealth: number;
  allies: string[];
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'weapon' | 'item' | 'food' | 'information';
  value: number;
  description?: string;
}

export interface NPCRelationship {
  npcName: string;
  affinity: number; // -100 to +100
  trust: number; // 0 to 100
  knownInformation: string[];
}

export interface GameEvent {
  id: string;
  day: number;
  type: 'morning' | 'noon' | 'evening' | 'night';
  title: string;
  description: string;
  choices: Choice[];
}

export interface Choice {
  id: string;
  text: string;
  requirements?: {
    stats?: Partial<PlayerStats>;
    items?: string[];
    flags?: string[];
    role?: PlayerRole[];
  };
  consequences: {
    immediate: ConsequenceEffect[];
    delayed?: DelayedEffect[];
  };
}

export interface ConsequenceEffect {
  type: 'stat' | 'item' | 'flag' | 'relationship' | 'location';
  target: string;
  change: number | string | boolean;
}

export interface DelayedEffect extends ConsequenceEffect {
  delayDays: number;
}

export interface AgentContext {
  gameState: GameState;
  currentEvent?: GameEvent;
  conversationHistory: string[];
}

export type EndingType =
  | 'PERFECT_VICTORY'
  | 'COSTLY_VICTORY'
  | 'TACTICAL_RETREAT'
  | 'DEVASTATING_DEFEAT'
  | 'ESCAPE_SUCCESS'
  | 'BETRAYAL_SUCCESS'
  | 'MERCHANT_SUCCESS'
  | 'UNEXPECTED_PEACE';
