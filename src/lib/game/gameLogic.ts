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
 * Enables or disables extra visual effects (Final 10 tension + 90% drop particles)
 * @param state - Current game state
 * @param enabled - Whether extra visual effects should be enabled
 * @returns Updated game state with extra visual effects toggled
 */
export function setExtraVisualEffects(state: GameState, enabled: boolean): GameState {
  return {
    ...state,
    extraVisualEffects: enabled,
  };
}

/**
 * Enables or disables the strategic coin system
 * @param state - Current game state
 * @param enabled - Whether coin system should be enabled
 * @returns Updated game state with coin system toggled
 */
export function setCoinsEnabled(state: GameState, enabled: boolean): GameState {
  return {
    ...state,
    coinsEnabled: enabled,
  };
}

/**
 * Sets the initial number of coins each player starts with
 * @param state - Current game state
 * @param coins - Initial coin count (0-5)
 * @returns Updated game state with initial coins set
 */
export function setInitialCoins(state: GameState, coins: number): GameState {
  const clampedCoins = Math.max(0, Math.min(coins, state.maxCoins));
  return {
    ...state,
    initialCoins: clampedCoins,
    // Update existing players' coins if in lobby
    players: state.phase === "lobby"
      ? state.players.map((p) => ({ ...p, coins: clampedCoins }))
      : state.players,
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
    players: [...state.players, { ...player, losses: 0, coins: state.initialCoins }],
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
 * Awards a coin to a player (capped at maxCoins)
 * @param state - Current game state
 * @param playerId - ID of the player to award coin to
 * @param amount - Number of coins to award (default 1)
 * @returns Updated game state with coins awarded
 */
export function awardCoins(state: GameState, playerId: string, amount: number = 1): GameState {
  if (!state.coinsEnabled) return state;

  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId
        ? { ...p, coins: Math.min(p.coins + amount, state.maxCoins) }
        : p
    ),
  };
}

/**
 * Spends a coin from a player (if they have enough)
 * @param state - Current game state
 * @param playerId - ID of the player spending coin
 * @param amount - Number of coins to spend (default 1)
 * @returns Updated game state with coins spent, or null if player doesn't have enough
 */
export function spendCoins(state: GameState, playerId: string, amount: number = 1): GameState | null {
  if (!state.coinsEnabled) return null;

  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.coins < amount) return null;

  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, coins: p.coins - amount } : p
    ),
  };
}

/**
 * Checks if a player can afford a coin-based action
 * @param state - Current game state
 * @param playerId - ID of the player
 * @param cost - Cost in coins (default 1)
 * @returns True if player has enough coins, false otherwise
 */
export function canAffordAction(state: GameState, playerId: string, cost: number = 1): boolean {
  if (!state.coinsEnabled) return false;

  const player = state.players.find((p) => p.id === playerId);
  return player ? player.coins >= cost : false;
}

/**
 * Sets the next player manually (for coin-based "choose next player" ability)
 * @param state - Current game state
 * @param targetPlayerId - ID of the player to go next
 * @returns Updated game state with new current player, or null if invalid
 */
export function setNextPlayer(state: GameState, targetPlayerId: string): GameState | null {
  const targetIndex = state.players.findIndex((p) => p.id === targetPlayerId);

  // Validate target
  if (targetIndex === -1) return null;
  const targetPlayer = state.players[targetIndex];
  if (!targetPlayer.isConnected || targetPlayer.isSpectator) return null;

  return {
    ...state,
    currentPlayerIndex: targetIndex,
  };
}

/**
 * Activates "Roll Twice" ability for a player (costs 1 coin)
 * Player will roll twice and choose which result to keep
 * @param state - Current game state
 * @param playerId - ID of the player activating roll twice
 * @returns Updated game state with roll twice activated, or null if player can't afford
 */
export function activateRollTwice(state: GameState, playerId: string): GameState | null {
  if (!canAffordAction(state, playerId, 1)) return null;

  const newState = spendCoins(state, playerId, 1);
  if (!newState) return null;

  return {
    ...newState,
    rollTwicePlayerId: playerId,
  };
}

/**
 * Sets next player override (costs 1 coin)
 * After current player's turn, specified player goes next instead of rotation
 * @param state - Current game state
 * @param playerId - ID of the player setting the override
 * @param targetPlayerId - ID of the player who should go next
 * @returns Updated game state with override set, or null if player can't afford
 */
export function setNextPlayerOverride(state: GameState, playerId: string, targetPlayerId: string): GameState | null {
  if (!canAffordAction(state, playerId, 1)) return null;

  // Validate target
  const targetPlayer = state.players.find((p) => p.id === targetPlayerId);
  if (!targetPlayer || targetPlayer.isSpectator || !targetPlayer.isConnected) return null;
  if (targetPlayerId === playerId) return null; // Can't choose yourself

  const newState = spendCoins(state, playerId, 1);
  if (!newState) return null;

  return {
    ...newState,
    nextPlayerOverride: targetPlayerId,
  };
}

/**
 * Clears roll-twice state (called after roll is complete)
 * @param state - Current game state
 * @returns Updated game state with roll-twice cleared
 */
export function clearRollTwice(state: GameState): GameState {
  return {
    ...state,
    rollTwicePlayerId: null,
    rollTwiceResults: null,
  };
}

/**
 * Activates "Skip Roll" ability for a player (costs 2 coins)
 * Player skips their turn without rolling, passing to the next player
 * @param state - Current game state
 * @param playerId - ID of the player activating skip roll
 * @returns Updated game state with turn skipped, or null if player can't afford
 */
export function activateSkipRoll(state: GameState, playerId: string): GameState | null {
  if (!canAffordAction(state, playerId, 2)) return null;

  const newState = spendCoins(state, playerId, 2);
  if (!newState) return null;

  // Determine next player (use override if set, otherwise use rotation)
  const nextPlayerIndex = newState.nextPlayerOverride
    ? newState.players.findIndex((p) => p.id === newState.nextPlayerOverride)
    : getNextPlayerIndex(newState);

  // Advance to next player without changing currentMaxRoll
  return {
    ...newState,
    currentPlayerIndex: nextPlayerIndex >= 0 ? nextPlayerIndex : getNextPlayerIndex(newState),
    nextPlayerOverride: null, // Clear override after using it
  };
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
 * Skips to the next connected player if the current player is disconnected
 * Used to prevent the game from getting stuck when a player disconnects during their turn
 * @param state - Current game state
 * @returns Updated game state with current player advanced if needed
 */
export function skipDisconnectedPlayer(state: GameState): GameState {
  if (state.phase !== "playing") return state;

  const currentPlayer = getCurrentPlayer(state);

  // If current player is connected, no need to skip
  if (currentPlayer && currentPlayer.isConnected && !currentPlayer.isSpectator) {
    return state;
  }

  // Current player is disconnected or doesn't exist, advance to next connected player
  const nextIndex = getNextPlayerIndex(state);

  // If we couldn't find any connected players, return state unchanged
  if (nextIndex === state.currentPlayerIndex) {
    return state;
  }

  return {
    ...state,
    currentPlayerIndex: nextIndex,
  };
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
 * Calculates the animation duration based on the max roll value
 * Extra visual effects mode has slower, more dramatic animations
 *
 * @param maxRoll - The maximum roll value for this animation
 * @param extraVisualEffectsEnabled - Whether extra visual effects are enabled
 * @returns Animation duration in milliseconds
 */
export function calculateAnimationDuration(maxRoll: number, extraVisualEffectsEnabled: boolean): number {
  const tickCount = 11; // Number of animation ticks (11 iterations before showing result)

  if (extraVisualEffectsEnabled && maxRoll < 10) {
    // Calculate intensity: closer to 1 = more intense
    const intensity = Math.pow((10 - maxRoll) / 9, 0.6);
    // Base speed: 50ms, slowest: 80ms at max intensity
    const tickDuration = 50 + (intensity * 30);
    return tickCount * tickDuration;
  }

  // Standard animation speed
  return tickCount * 50;
}

/**
 * Phase 1: Initiates a roll and signals clients to start animation
 * This should be called immediately and broadcast to start the animation
 * The actual roll result is NOT revealed yet - it's returned separately for Phase 2
 *
 * @param state - Current game state
 * @param playerId - ID of the player making the roll
 * @returns Object with updated state (result hidden) and the roll result for host
 */
export function initiateRoll(state: GameState, playerId: string): { state: GameState; rollResult: number | null; rollTwiceResults?: [number, number] | null } {
  if (state.phase !== "playing") return { state, rollResult: null };
  if (!isPlayerTurn(state, playerId)) return { state, rollResult: null };

  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.isSpectator) return { state, rollResult: null };

  // Check if roll-twice is active for this player
  const isRollTwice = state.rollTwicePlayerId === playerId;

  let result: number;
  let rollTwiceResults: [number, number] | null = null;

  if (isRollTwice) {
    // Generate TWO rolls
    const roll1 = generateRoll(state.currentMaxRoll);
    const roll2 = generateRoll(state.currentMaxRoll);

    // If EITHER roll is 1, player automatically loses (no choice given)
    // This prevents exploiting roll-twice at low ranges
    if (roll1 === 1 || roll2 === 1) {
      rollTwiceResults = null; // Don't show picker
      result = 1; // Force the loss
    } else {
      rollTwiceResults = [roll1, roll2];
      result = roll1; // Default to first roll (player will choose)
    }
  } else {
    result = generateRoll(state.currentMaxRoll);
  }

  // Store the max before this roll (for detecting max rolls later)
  const maxBeforeRoll = state.currentMaxRoll;

  // Phase 1: Tell clients "roll is happening" but DON'T reveal the result yet!
  // Clients will animate with random numbers
  const newState = {
    ...state,
    isRolling: true,              // Signal: animation should start
    lastMaxRoll: maxBeforeRoll,   // Store for max roll detection later
    lastRollPlayerId: playerId,   // Who's rolling
    // lastRoll is NOT set yet! Result hidden from clients!
    rollTwiceResults: rollTwiceResults, // Store both rolls if roll-twice active
  };

  return { state: newState, rollResult: result, rollTwiceResults };
}

/**
 * Phase 2: Completes a roll by revealing the result and applying game logic consequences
 * This should be called after animation delay and broadcast
 *
 * @param state - Current game state (isRolling should be true from Phase 1)
 * @param playerId - ID of the player who rolled
 * @param rollResult - The actual roll result (kept secret during Phase 1)
 * @returns Updated game state with result revealed and consequences applied
 */
export function completeRoll(state: GameState, playerId: string, rollResult: number): GameState {
  if (state.phase !== "playing") return state;
  // Allow completion if roll-twice picker is active (isRolling=false but rollTwiceResults present)
  if (!state.isRolling && !state.rollTwiceResults) return state; // No roll in progress

  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.isSpectator) return state;

  const result = rollResult;

  // Create roll history entry (add AFTER animation completes to avoid spoiling)
  const rollEntry: RollEntry = {
    playerId: player.id,
    playerName: player.name,
    playerColor: player.color,
    playerEmoji: player.emoji,
    maxRange: state.lastMaxRoll ?? state.currentMaxRoll,
    result,
    timestamp: Date.now(),
  };

  // Check if this was a MAX ROLL (player rolled the maximum possible)
  const wasMaxRoll = result === (state.lastMaxRoll ?? state.currentMaxRoll) && result > 1;

  // Player rolled 1 - they lose this round, game continues
  if (result === 1) {
    const playerTeam = getPlayerTeam(state, playerId);

    let updatedState: GameState = {
      ...state,
      isRolling: false,              // Animation complete, result revealed
      lastRoll: result,              // NOW reveal the result!
      lastLoserId: playerId,
      lastLoserTeamId: playerTeam?.id ?? null,
      rollHistory: addToRollHistory(state.rollHistory, rollEntry),
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
      // Clear coin ability states
      nextPlayerOverride: null,
      rollTwicePlayerId: null,
      rollTwiceResults: null,
    };

    // Award 1 coin for losing (if coins enabled)
    updatedState = awardCoins(updatedState, playerId, 1);

    return updatedState;
  }

  // Determine next player (use override if set, otherwise use rotation)
  const nextPlayerIndex = state.nextPlayerOverride
    ? state.players.findIndex((p) => p.id === state.nextPlayerOverride)
    : getNextPlayerIndex(state);

  // Continue game with new max and next player
  let updatedState: GameState = {
    ...state,
    isRolling: false,              // Animation complete, result revealed
    lastRoll: result,              // NOW reveal the result!
    currentMaxRoll: result,
    rollHistory: addToRollHistory(state.rollHistory, rollEntry),
    currentPlayerIndex: nextPlayerIndex >= 0 ? nextPlayerIndex : getNextPlayerIndex(state),
    lastLoserId: null, // Clear last loser when game continues normally
    lastLoserTeamId: null, // Clear last loser team when game continues normally
    nextPlayerOverride: null, // Clear override after using it
    rollTwicePlayerId: null, // Clear roll-twice state
    rollTwiceResults: null,
  };

  // Award 1 coin for rolling MAX (if coins enabled)
  if (wasMaxRoll) {
    updatedState = awardCoins(updatedState, playerId, 1);
  }

  return updatedState;
}

/**
 * Processes a player's roll and updates the game state (LEGACY - synchronous version)
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
 * @deprecated Use initiateRoll + completeRoll for proper animation timing
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
    // Reset all player scores and coins
    players: state.players.map((p) => ({ ...p, losses: 0, coins: state.initialCoins })),
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
