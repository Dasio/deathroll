import { GameState, Player, RollEntry, Team } from "@/types/game";
import { generateRoll } from "./random";

// Maximum number of roll history entries to keep
const MAX_ROLL_HISTORY = 100;

/**
 * Helper function to add a roll entry to history while maintaining size limit
 */
function addToRollHistory(history: RollEntry[], newEntry: RollEntry): RollEntry[] {
  const newHistory = [...history, newEntry];
  // Keep only the last MAX_ROLL_HISTORY entries
  if (newHistory.length > MAX_ROLL_HISTORY) {
    return newHistory.slice(-MAX_ROLL_HISTORY);
  }
  return newHistory;
}

/**
 * Team Management Functions
 */

/**
 * Creates a new team
 * @param state - Current game state
 * @param name - Team name
 * @param color - Team color (hex)
 * @returns Updated game state with the new team added
 */
export function createTeam(state: GameState, name: string, color: string): GameState {
  const teamId = `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const team: Team = {
    id: teamId,
    name,
    color,
    losses: 0,
  };
  return {
    ...state,
    teams: [...state.teams, team],
  };
}

/**
 * Removes a team and unassigns all its players
 * @param state - Current game state
 * @param teamId - ID of the team to remove
 * @returns Updated game state with the team removed
 */
export function removeTeam(state: GameState, teamId: string): GameState {
  return {
    ...state,
    teams: state.teams.filter((t) => t.id !== teamId),
    players: state.players.map((p) =>
      p.teamId === teamId ? { ...p, teamId: undefined } : p
    ),
  };
}

/**
 * Assigns a player to a team
 * @param state - Current game state
 * @param playerId - ID of the player
 * @param teamId - ID of the team (or undefined to unassign)
 * @returns Updated game state with the player assigned to the team
 */
export function assignPlayerToTeam(
  state: GameState,
  playerId: string,
  teamId: string | undefined
): GameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, teamId } : p
    ),
  };
}

/**
 * Enables or disables team mode
 * @param state - Current game state
 * @param enabled - Whether team mode should be enabled
 * @returns Updated game state with team mode toggled
 */
export function setTeamMode(state: GameState, enabled: boolean): GameState {
  return {
    ...state,
    teamMode: enabled,
  };
}

/**
 * Gets the team for a given player
 * @param state - Current game state
 * @param playerId - ID of the player
 * @returns The team the player belongs to, or null if not in a team
 */
export function getPlayerTeam(state: GameState, playerId: string): Team | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || !player.teamId) return null;
  return state.teams.find((t) => t.id === player.teamId) ?? null;
}

/**
 * Adds a new player to the game state
 * @param state - Current game state
 * @param player - Player to add
 * @returns Updated game state with the new player added
 */
export function addPlayer(state: GameState, player: Player): GameState {
  return {
    ...state,
    players: [...state.players, { ...player, losses: 0 }],
  };
}

/**
 * Removes a player from the game state
 * @param state - Current game state
 * @param playerId - ID of the player to remove
 * @returns Updated game state with the player removed
 */
export function removePlayer(state: GameState, playerId: string): GameState {
  return {
    ...state,
    players: state.players.filter((p) => p.id !== playerId),
  };
}

/**
 * Sets a player's connection status
 * @param state - Current game state
 * @param playerId - ID of the player
 * @param connected - New connection status
 * @returns Updated game state with the player's connection status updated
 */
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

/**
 * Reconnects a player with a new connection ID
 * @param state - Current game state
 * @param playerId - ID of the player to reconnect
 * @param newConnectionId - New connection ID for the player
 * @returns Updated game state with the player reconnected
 */
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

/**
 * Finds a disconnected remote player by name (for reconnection)
 * @param state - Current game state
 * @param name - Name of the player to find
 * @returns The disconnected player if found, null otherwise
 */
export function findDisconnectedPlayerByName(
  state: GameState,
  name: string
): Player | null {
  return (
    state.players.find((p) => p.name === name && !p.isConnected && !p.isLocal) ??
    null
  );
}

/**
 * Starts a new game with the specified initial max roll value
 * @param state - Current game state
 * @param initialMaxRoll - The starting maximum roll value (typically 100)
 * @returns Updated game state in "playing" phase
 */
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

/**
 * Gets the player whose turn it currently is
 * @param state - Current game state
 * @returns The current player, or null if not in playing phase
 */
export function getCurrentPlayer(state: GameState): Player | null {
  if (state.phase !== "playing") return null;
  return state.players[state.currentPlayerIndex] ?? null;
}

/**
 * Checks if it's a specific player's turn
 * @param state - Current game state
 * @param playerId - ID of the player to check
 * @returns True if it's the player's turn, false otherwise
 */
export function isPlayerTurn(state: GameState, playerId: string): boolean {
  const current = getCurrentPlayer(state);
  return current?.id === playerId;
}

function getNextPlayerIndex(state: GameState): number {
  const { players, currentPlayerIndex, teamMode } = state;
  // Skip spectators and disconnected players
  const activePlayers = players.filter((p) => p.isConnected && !p.isSpectator);

  if (activePlayers.length === 0) return currentPlayerIndex;

  // In team mode, advance to next team
  if (teamMode && state.teams.length > 0) {
    const currentPlayer = players[currentPlayerIndex];
    const currentTeamId = currentPlayer?.teamId;

    // Find next team in rotation
    let nextIndex = (currentPlayerIndex + 1) % players.length;
    let attempts = 0;

    while (attempts < players.length) {
      const nextPlayer = players[nextIndex];

      // Skip spectators and disconnected players
      if (!nextPlayer.isConnected || nextPlayer.isSpectator) {
        nextIndex = (nextIndex + 1) % players.length;
        attempts++;
        continue;
      }

      // If next player is on a different team (or no team), use them
      if (nextPlayer.teamId !== currentTeamId) {
        return nextIndex;
      }

      nextIndex = (nextIndex + 1) % players.length;
      attempts++;
    }

    return currentPlayerIndex; // Fallback if we couldn't find a valid next player
  }

  // Non-team mode: standard rotation
  let nextIndex = (currentPlayerIndex + 1) % players.length;
  let attempts = 0;

  // Skip spectators and disconnected players
  while ((!players[nextIndex].isConnected || players[nextIndex].isSpectator) && attempts < players.length) {
    nextIndex = (nextIndex + 1) % players.length;
    attempts++;
  }

  return nextIndex;
}

/**
 * Processes a player's roll and updates the game state
 *
 * Core game logic:
 * - Generates a random number between 1 and currentMaxRoll (inclusive)
 * - If the result is 1, the player loses the round and their loss count increases
 * - If the result is greater than 1, it becomes the new max roll and play continues
 * - Uses cryptographically secure random number generation with rejection sampling
 *
 * @param state - Current game state
 * @param playerId - ID of the player making the roll
 * @returns Updated game state after processing the roll
 */
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
    const playerTeam = getPlayerTeam(state, playerId);

    return {
      ...state,
      lastRoll: result,
      lastMaxRoll: maxBeforeRoll,
      lastRollPlayerId: playerId,
      rollHistory: addToRollHistory(state.rollHistory, rollEntry),
      lastLoserId: playerId,
      lastLoserTeamId: playerTeam?.id ?? null,
      // Increment losses for this player
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, losses: p.losses + 1 } : p
      ),
      // In team mode, increment losses for the entire team
      teams: state.teamMode && playerTeam
        ? state.teams.map((t) =>
            t.id === playerTeam.id ? { ...t, losses: t.losses + 1 } : t
          )
        : state.teams,
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
    rollHistory: addToRollHistory(state.rollHistory, rollEntry),
    currentPlayerIndex: getNextPlayerIndex(state),
    lastLoserId: null, // Clear last loser when game continues normally
    lastLoserTeamId: null, // Clear last loser team when game continues normally
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
    lastLoserTeamId: null,
    roundNumber: 1,
    // Reset all player scores
    players: state.players.map((p) => ({ ...p, losses: 0 })),
    // Reset all team scores
    teams: state.teams.map((t) => ({ ...t, losses: 0 })),
  };
}

export function clearLastLoser(state: GameState): GameState {
  return {
    ...state,
    lastLoserId: null,
    lastLoserTeamId: null,
  };
}
