export interface Player {
  id: string;
  name: string;
  isLocal: boolean;
  isConnected: boolean;
  connectionId?: string;
  losses: number;
  isSpectator: boolean;
  color: string; // hex color for avatar
  emoji: string; // emoji avatar
  teamId?: string; // optional team assignment
  coins: number; // Strategic coin currency for abilities
}

export interface Team {
  id: string;
  name: string;
  color: string;
  losses: number;
}

export interface RollEntry {
  playerId: string;
  playerName: string;
  playerColor: string;
  playerEmoji: string;
  maxRange: number;
  result: number;
  timestamp: number;
}

export interface GameState {
  phase: "lobby" | "playing";
  players: Player[];
  teams: Team[]; // Team definitions
  teamMode: boolean; // Whether team mode is enabled
  final10Mode: boolean; // Whether Final 10 mode is enabled (visual effects when max roll < 10)
  currentPlayerIndex: number;
  currentMaxRoll: number;
  initialMaxRoll: number;
  isRolling: boolean; // True during animation (Phase 1), false when result revealed (Phase 2)
  lastRoll: number | null;
  lastMaxRoll: number | null; // Max range before last roll (to detect max rolls)
  lastRollPlayerId: string | null; // Who made the last roll
  rollHistory: RollEntry[];
  lastLoserId: string | null; // Who just lost (for brief display)
  lastLoserTeamId: string | null; // Which team just lost (for team mode)
  roundNumber: number;
  // Strategic coin system
  coinsEnabled: boolean; // Whether coin system is enabled
  initialCoins: number; // Starting coins per player (0-5)
  maxCoins: number; // Maximum coins a player can have (default 5)
  rollTwicePlayerId: string | null; // Player who activated roll-twice (if any)
  rollTwiceResults: [number, number] | null; // Two roll results (if roll-twice active)
  nextPlayerOverride: string | null; // Override for next player (set by coin ability)
}

export function createInitialGameState(): GameState {
  return {
    phase: "lobby",
    players: [],
    teams: [],
    teamMode: false,
    final10Mode: true, // Enabled by default for dramatic tension
    currentPlayerIndex: 0,
    currentMaxRoll: 100,
    initialMaxRoll: 100,
    isRolling: false,
    lastRoll: null,
    lastMaxRoll: null,
    lastRollPlayerId: null,
    rollHistory: [],
    lastLoserId: null,
    lastLoserTeamId: null,
    roundNumber: 1,
    // Strategic coin system
    coinsEnabled: false, // Disabled by default
    initialCoins: 3, // Default 3 coins per player
    maxCoins: 5, // Maximum 5 coins
    rollTwicePlayerId: null,
    rollTwiceResults: null,
    nextPlayerOverride: null,
  };
}
