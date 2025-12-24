/**
 * localStorage and sessionStorage utilities for DeathRoll game state persistence
 * Handles saving/loading host game state and player session info
 */

import { GameState } from "@/types/game";
import { logger } from "./logger";

// Key prefixes for localStorage
const STORAGE_PREFIX = "deathroll_";
const HOST_STATE_KEY = `${STORAGE_PREFIX}host_state`;
const HOST_ROOM_CODE_KEY = `${STORAGE_PREFIX}host_room_code`;
const PLAYER_SESSION_KEY = `${STORAGE_PREFIX}player_session`;

// Key prefixes for sessionStorage (temporary state during connection)
const SESSION_PREFIX = "deathroll_session_";
const ACTIVE_GAME_STATE_KEY = `${SESSION_PREFIX}active_game`;

// Maximum age for saved sessions (1 hour in milliseconds)
const MAX_SESSION_AGE = 60 * 60 * 1000;

export interface SavedHostState {
  roomCode: string;
  gameState: GameState;
  timestamp: number;
}

export interface SavedPlayerSession {
  roomCode: string;
  playerName: string;
  playerId: string;
  timestamp: number;
}

export interface ActiveGameSession {
  roomCode: string;
  playerId: string;
  playerName: string;
  lastKnownGameState: GameState;
  timestamp: number;
  isSpectator: boolean;
}

/**
 * Safely parse JSON with error handling
 */
function safeParse<T>(json: string | null): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Check if a saved session is still valid (not too old)
 */
function isSessionValid(timestamp: number): boolean {
  return Date.now() - timestamp < MAX_SESSION_AGE;
}

// ============ HOST STORAGE FUNCTIONS ============

/**
 * Save host game state to localStorage
 */
export function saveHostState(roomCode: string, gameState: GameState): void {
  try {
    const saved: SavedHostState = {
      roomCode,
      gameState,
      timestamp: Date.now(),
    };
    localStorage.setItem(HOST_STATE_KEY, JSON.stringify(saved));
    localStorage.setItem(HOST_ROOM_CODE_KEY, roomCode);
  } catch (error) {
    logger.error("Failed to save host state:", error);
  }
}

/**
 * Load host game state from localStorage
 * Returns null if no valid saved state exists
 */
export function loadHostState(): SavedHostState | null {
  try {
    const saved = safeParse<SavedHostState>(localStorage.getItem(HOST_STATE_KEY));
    if (!saved) return null;

    // Check if session is still valid
    if (!isSessionValid(saved.timestamp)) {
      clearHostState();
      return null;
    }

    return saved;
  } catch (error) {
    logger.error("Failed to load host state:", error);
    return null;
  }
}

/**
 * Clear host game state from localStorage
 */
export function clearHostState(): void {
  try {
    localStorage.removeItem(HOST_STATE_KEY);
    localStorage.removeItem(HOST_ROOM_CODE_KEY);
  } catch (error) {
    logger.error("Failed to clear host state:", error);
  }
}

/**
 * Get just the room code from host state
 */
export function getHostRoomCode(): string | null {
  try {
    return localStorage.getItem(HOST_ROOM_CODE_KEY);
  } catch (error) {
    logger.error("Failed to get host room code:", error);
    return null;
  }
}

// ============ PLAYER STORAGE FUNCTIONS ============

/**
 * Save player session info to localStorage
 */
export function savePlayerSession(
  roomCode: string,
  playerName: string,
  playerId: string
): void {
  try {
    const saved: SavedPlayerSession = {
      roomCode,
      playerName,
      playerId,
      timestamp: Date.now(),
    };
    localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(saved));
  } catch (error) {
    logger.error("Failed to save player session:", error);
  }
}

/**
 * Load player session info from localStorage
 * Returns null if no valid saved session exists
 */
export function loadPlayerSession(): SavedPlayerSession | null {
  try {
    const saved = safeParse<SavedPlayerSession>(
      localStorage.getItem(PLAYER_SESSION_KEY)
    );
    if (!saved) return null;

    // Check if session is still valid
    if (!isSessionValid(saved.timestamp)) {
      clearPlayerSession();
      return null;
    }

    return saved;
  } catch (error) {
    logger.error("Failed to load player session:", error);
    return null;
  }
}

/**
 * Clear player session info from localStorage
 */
export function clearPlayerSession(): void {
  try {
    localStorage.removeItem(PLAYER_SESSION_KEY);
  } catch (error) {
    logger.error("Failed to clear player session:", error);
  }
}

// ============ GENERAL UTILITY FUNCTIONS ============

/**
 * Clear all DeathRoll data from localStorage
 */
export function clearAllStorage(): void {
  clearHostState();
  clearPlayerSession();
}

/**
 * Check if browser supports localStorage
 */
export function isStorageAvailable(): boolean {
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

// ============ SESSION STORAGE FUNCTIONS ============
// For temporary active game state during connection (cleared on tab close)

/**
 * Save active game session to sessionStorage
 * This is used to persist state during connection drops
 */
export function saveActiveGameSession(
  roomCode: string,
  playerId: string,
  playerName: string,
  gameState: GameState,
  isSpectator: boolean = false
): void {
  try {
    const session: ActiveGameSession = {
      roomCode,
      playerId,
      playerName,
      lastKnownGameState: gameState,
      timestamp: Date.now(),
      isSpectator,
    };
    sessionStorage.setItem(ACTIVE_GAME_STATE_KEY, JSON.stringify(session));
  } catch (error) {
    logger.error("Failed to save active game session:", error);
  }
}

/**
 * Load active game session from sessionStorage
 * Returns null if no valid session exists
 */
export function loadActiveGameSession(): ActiveGameSession | null {
  try {
    const saved = safeParse<ActiveGameSession>(
      sessionStorage.getItem(ACTIVE_GAME_STATE_KEY)
    );
    if (!saved) return null;

    // Session storage doesn't expire like localStorage
    // It's automatically cleared when tab is closed
    return saved;
  } catch (error) {
    logger.error("Failed to load active game session:", error);
    return null;
  }
}

/**
 * Clear active game session from sessionStorage
 */
export function clearActiveGameSession(): void {
  try {
    sessionStorage.removeItem(ACTIVE_GAME_STATE_KEY);
  } catch (error) {
    logger.error("Failed to clear active game session:", error);
  }
}

/**
 * Check if browser supports sessionStorage
 */
export function isSessionStorageAvailable(): boolean {
  try {
    const test = "__session_storage_test__";
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}
