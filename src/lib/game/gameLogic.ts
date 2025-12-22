import { GameState, Player, RollEntry } from "@/types/game";
import { generateRoll } from "./random";

export function addPlayer(state: GameState, player: Player): GameState {
  return {
    ...state,
    players: [...state.players, { ...player, losses: 0 }],
  };
}

export function removePlayer(state: GameState, playerId: string): GameState {
  return {
    ...state,
    players: state.players.filter((p) => p.id !== playerId),
  };
}

export function setPlayerConnected(
  state: GameState,
  playerId: string,
  connected: boolean
): GameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, isConnected: connected } : p
    ),
  };
}

export function reconnectPlayer(
  state: GameState,
  playerId: string,
  newConnectionId: string
): GameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId
        ? { ...p, isConnected: true, connectionId: newConnectionId }
        : p
    ),
  };
}

export function findDisconnectedPlayerByName(
  state: GameState,
  name: string
): Player | null {
  return (
    state.players.find((p) => p.name === name && !p.isConnected && !p.isLocal) ??
    null
  );
}

export function startGame(state: GameState, initialMaxRoll: number): GameState {
  // Count only non-spectator players
  const activePlayers = state.players.filter((p) => !p.isSpectator);
  if (activePlayers.length < 1) {
    return state;
  }

  return {
    ...state,
    phase: "playing",
    currentPlayerIndex: 0,
    currentMaxRoll: initialMaxRoll,
    initialMaxRoll: initialMaxRoll,
    lastRoll: null,
    lastMaxRoll: null,
    lastRollPlayerId: null,
    rollHistory: [],
    lastLoserId: null,
    roundNumber: 1,
  };
}

export function getCurrentPlayer(state: GameState): Player | null {
  if (state.phase !== "playing") return null;
  return state.players[state.currentPlayerIndex] ?? null;
}

export function isPlayerTurn(state: GameState, playerId: string): boolean {
  const current = getCurrentPlayer(state);
  return current?.id === playerId;
}

function getNextPlayerIndex(state: GameState): number {
  const { players, currentPlayerIndex } = state;
  // Skip spectators and disconnected players
  const activePlayers = players.filter((p) => p.isConnected && !p.isSpectator);

  if (activePlayers.length === 0) return currentPlayerIndex;

  let nextIndex = (currentPlayerIndex + 1) % players.length;
  let attempts = 0;

  // Skip spectators and disconnected players
  while ((!players[nextIndex].isConnected || players[nextIndex].isSpectator) && attempts < players.length) {
    nextIndex = (nextIndex + 1) % players.length;
    attempts++;
  }

  return nextIndex;
}

export function processRoll(state: GameState, playerId: string): GameState {
  if (state.phase !== "playing") return state;
  if (!isPlayerTurn(state, playerId)) return state;

  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.isSpectator) return state;

  const result = generateRoll(state.currentMaxRoll);

  const rollEntry: RollEntry = {
    playerId: player.id,
    playerName: player.name,
    playerColor: player.color,
    playerEmoji: player.emoji,
    maxRange: state.currentMaxRoll,
    result,
    timestamp: Date.now(),
  };

  // Store the max before this roll (for detecting max rolls)
  const maxBeforeRoll = state.currentMaxRoll;

  // Player rolled 1 - they lose this round, game continues
  if (result === 1) {
    return {
      ...state,
      lastRoll: result,
      lastMaxRoll: maxBeforeRoll,
      lastRollPlayerId: playerId,
      rollHistory: [...state.rollHistory, rollEntry],
      lastLoserId: playerId,
      // Increment losses for this player
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, losses: p.losses + 1 } : p
      ),
      // Reset for new round - loser starts next round and chooses range
      currentMaxRoll: state.initialMaxRoll,
      roundNumber: state.roundNumber + 1,
      // Loser stays as current player to start new round
      // (currentPlayerIndex stays the same)
    };
  }

  // Continue game with new max and next player
  return {
    ...state,
    currentMaxRoll: result,
    lastRoll: result,
    lastMaxRoll: maxBeforeRoll,
    lastRollPlayerId: playerId,
    rollHistory: [...state.rollHistory, rollEntry],
    currentPlayerIndex: getNextPlayerIndex(state),
    lastLoserId: null, // Clear last loser when game continues normally
  };
}

export function resetGame(state: GameState): GameState {
  return {
    ...state,
    phase: "lobby",
    currentPlayerIndex: 0,
    currentMaxRoll: state.initialMaxRoll,
    lastRoll: null,
    lastMaxRoll: null,
    lastRollPlayerId: null,
    rollHistory: [],
    lastLoserId: null,
    roundNumber: 1,
    // Reset all player scores
    players: state.players.map((p) => ({ ...p, losses: 0 })),
  };
}

export function clearLastLoser(state: GameState): GameState {
  return {
    ...state,
    lastLoserId: null,
  };
}
