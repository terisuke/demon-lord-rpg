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
  dayChange?: number; // 行動の複雑さに応じた時間経過（0=同じ日、1+=日数進行）
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

// AI Response Types for improved type safety
export interface AIActionResponse {
  needsDelegation: boolean;
  delegationTarget: string | null;
  narrative: string;
  stateChanges: StateChanges;
  dayChange?: number;
  choices: Choice[];
}

export interface StateChanges {
  stats?: Partial<PlayerStats>;
  flags?: Record<string, boolean>;
  location?: string;
  day?: number;
}

export interface NPCDelegationResponse {
  narrative: string;
  stateChanges?: StateChanges;
}

export interface EventData {
  title: string;
  description: string;
  choices: Choice[];
}

export interface ChoiceGenerationResponse {
  choices: Choice[];
}
