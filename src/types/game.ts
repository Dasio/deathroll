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
  currentPlayerIndex: number;
  currentMaxRoll: number;
  initialMaxRoll: number;
  lastRoll: number | null;
  lastMaxRoll: number | null; // Max range before last roll (to detect max rolls)
  lastRollPlayerId: string | null; // Who made the last roll
  rollHistory: RollEntry[];
  lastLoserId: string | null; // Who just lost (for brief display)
  roundNumber: number;
}

export function createInitialGameState(): GameState {
  return {
    phase: "lobby",
    players: [],
    currentPlayerIndex: 0,
    currentMaxRoll: 100,
    initialMaxRoll: 100,
    lastRoll: null,
    lastMaxRoll: null,
    lastRollPlayerId: null,
    rollHistory: [],
    lastLoserId: null,
    roundNumber: 1,
  };
}
