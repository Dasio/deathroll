/**
 * Statistics tracking system for DeathRoll game
 * Tracks per-player stats and global stats using localStorage
 */

import { logger } from "./logger";

// localStorage key for statistics
const STATISTICS_KEY = "deathroll_statistics";

// ============ TYPES ============

export interface PlayerStats {
  playerId: string;
  playerName: string;
  totalGamesPlayed: number;
  totalWins: number;
  totalLosses: number;
  winRate: number; // Percentage
  longestWinStreak: number;
  currentStreak: number; // Positive for wins, negative for losses
  totalRolls: number;
  totalRollValue: number; // Sum of all roll values
  averageRoll: number;
  highestRoll: number;
  biggestComeback: number; // Biggest loss deficit overcome to win
  fastestWin: number; // Fewest rolls in a winning game
  lastPlayed: number; // Timestamp
}

export interface GlobalStats {
  totalGamesPlayed: number;
  totalPlayersAllTime: number;
  mostCommonRoomCodeLength: number;
  averageGameDuration: number; // In milliseconds
  totalRolls: number;
  lastUpdated: number; // Timestamp
}

export interface RollData {
  playerId: string;
  rollValue: number;
  maxValue: number;
  timestamp: number;
}

export interface GameEndData {
  playerId: string;
  playerName: string;
  won: boolean;
  rollCount: number;
  duration: number; // In milliseconds
  deficitOvercome?: number; // For comeback tracking
  timestamp: number;
}

interface StatisticsData {
  players: Record<string, PlayerStats>;
  global: GlobalStats;
  version: number; // For future migrations
}

// ============ STORAGE FUNCTIONS ============

function getEmptyStats(): StatisticsData {
  return {
    players: {},
    global: {
      totalGamesPlayed: 0,
      totalPlayersAllTime: 0,
      mostCommonRoomCodeLength: 4,
      averageGameDuration: 0,
      totalRolls: 0,
      lastUpdated: Date.now(),
    },
    version: 1,
  };
}

function loadStats(): StatisticsData {
  try {
    const json = localStorage.getItem(STATISTICS_KEY);
    if (!json) return getEmptyStats();

    const data = JSON.parse(json) as StatisticsData;
    // Ensure all required fields exist
    return {
      ...getEmptyStats(),
      ...data,
      global: { ...getEmptyStats().global, ...data.global },
    };
  } catch (error) {
    logger.error("Failed to load statistics:", error);
    return getEmptyStats();
  }
}

function saveStats(stats: StatisticsData): void {
  try {
    stats.global.lastUpdated = Date.now();
    localStorage.setItem(STATISTICS_KEY, JSON.stringify(stats));
  } catch (error) {
    logger.error("Failed to save statistics:", error);
  }
}

// ============ PLAYER STATS FUNCTIONS ============

function getOrCreatePlayerStats(
  stats: StatisticsData,
  playerId: string,
  playerName: string
): PlayerStats {
  if (stats.players[playerId]) {
    // Update name if it changed
    if (stats.players[playerId].playerName !== playerName) {
      stats.players[playerId].playerName = playerName;
    }
    return stats.players[playerId];
  }

  // Create new player stats
  const newStats: PlayerStats = {
    playerId,
    playerName,
    totalGamesPlayed: 0,
    totalWins: 0,
    totalLosses: 0,
    winRate: 0,
    longestWinStreak: 0,
    currentStreak: 0,
    totalRolls: 0,
    totalRollValue: 0,
    averageRoll: 0,
    highestRoll: 0,
    biggestComeback: 0,
    fastestWin: Infinity,
    lastPlayed: Date.now(),
  };

  stats.players[playerId] = newStats;
  stats.global.totalPlayersAllTime++;

  return newStats;
}

// ============ PUBLIC API FUNCTIONS ============

/**
 * Track a roll by a player
 */
export function trackRoll(playerId: string, rollValue: number, maxValue: number): void {
  const stats = loadStats();
  const playerStats = stats.players[playerId];

  if (!playerStats) {
    // Player hasn't been initialized yet, skip roll tracking
    return;
  }

  // Update player roll stats
  playerStats.totalRolls++;
  playerStats.totalRollValue += rollValue;
  playerStats.averageRoll = playerStats.totalRollValue / playerStats.totalRolls;
  playerStats.highestRoll = Math.max(playerStats.highestRoll, rollValue);
  playerStats.lastPlayed = Date.now();

  // Update global stats
  stats.global.totalRolls++;

  saveStats(stats);
}

/**
 * Track the end of a game for a player
 */
export function trackGameEnd(data: GameEndData): void {
  const stats = loadStats();
  const playerStats = getOrCreatePlayerStats(stats, data.playerId, data.playerName);

  // Update game counts
  playerStats.totalGamesPlayed++;

  if (data.won) {
    playerStats.totalWins++;

    // Update streak
    if (playerStats.currentStreak >= 0) {
      playerStats.currentStreak++;
    } else {
      playerStats.currentStreak = 1;
    }

    // Update longest win streak
    playerStats.longestWinStreak = Math.max(
      playerStats.longestWinStreak,
      playerStats.currentStreak
    );

    // Update fastest win
    if (data.rollCount < playerStats.fastestWin) {
      playerStats.fastestWin = data.rollCount;
    }

    // Update biggest comeback
    if (data.deficitOvercome && data.deficitOvercome > playerStats.biggestComeback) {
      playerStats.biggestComeback = data.deficitOvercome;
    }
  } else {
    playerStats.totalLosses++;

    // Update streak
    if (playerStats.currentStreak <= 0) {
      playerStats.currentStreak--;
    } else {
      playerStats.currentStreak = -1;
    }
  }

  // Update win rate
  playerStats.winRate = (playerStats.totalWins / playerStats.totalGamesPlayed) * 100;
  playerStats.lastPlayed = data.timestamp;

  // Update global stats
  stats.global.totalGamesPlayed++;

  // Update average game duration
  const totalDuration = stats.global.averageGameDuration * (stats.global.totalGamesPlayed - 1);
  stats.global.averageGameDuration = (totalDuration + data.duration) / stats.global.totalGamesPlayed;

  saveStats(stats);
}

/**
 * Get statistics for a specific player
 */
export function getPlayerStats(playerId: string): PlayerStats | null {
  const stats = loadStats();
  return stats.players[playerId] ?? null;
}

/**
 * Get all player statistics
 */
export function getAllPlayerStats(): PlayerStats[] {
  const stats = loadStats();
  return Object.values(stats.players).sort((a, b) => b.lastPlayed - a.lastPlayed);
}

/**
 * Get global statistics
 */
export function getGlobalStats(): GlobalStats {
  const stats = loadStats();
  return stats.global;
}

/**
 * Get leaderboard sorted by wins
 */
export function getLeaderboard(limit?: number): PlayerStats[] {
  const allStats = getAllPlayerStats();
  const sorted = allStats.sort((a, b) => {
    // Primary sort: total wins
    if (b.totalWins !== a.totalWins) {
      return b.totalWins - a.totalWins;
    }
    // Secondary sort: win rate
    if (b.winRate !== a.winRate) {
      return b.winRate - a.winRate;
    }
    // Tertiary sort: games played
    return b.totalGamesPlayed - a.totalGamesPlayed;
  });

  return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Clear all statistics
 */
export function clearStats(): void {
  try {
    localStorage.removeItem(STATISTICS_KEY);
    logger.info("Statistics cleared");
  } catch (error) {
    logger.error("Failed to clear statistics:", error);
  }
}

/**
 * Export statistics as JSON
 */
export function exportStats(): string {
  const stats = loadStats();
  return JSON.stringify(stats, null, 2);
}

/**
 * Import statistics from JSON
 */
export function importStats(json: string): boolean {
  try {
    const data = JSON.parse(json) as StatisticsData;
    // Validate basic structure
    if (!data.players || !data.global) {
      throw new Error("Invalid statistics data");
    }
    saveStats(data);
    logger.info("Statistics imported successfully");
    return true;
  } catch (error) {
    logger.error("Failed to import statistics:", error);
    return false;
  }
}

/**
 * Get statistics for sharing (formatted text)
 */
export function getShareableStats(playerId: string): string {
  const playerStats = getPlayerStats(playerId);
  if (!playerStats) {
    return "No statistics available";
  }

  const lines = [
    `DeathRoll Stats - ${playerStats.playerName}`,
    ``,
    `Games: ${playerStats.totalGamesPlayed}`,
    `Wins: ${playerStats.totalWins} | Losses: ${playerStats.totalLosses}`,
    `Win Rate: ${playerStats.winRate.toFixed(1)}%`,
    `Current Streak: ${Math.abs(playerStats.currentStreak)} ${playerStats.currentStreak >= 0 ? 'wins' : 'losses'}`,
    `Best Streak: ${playerStats.longestWinStreak} wins`,
    ``,
    `Total Rolls: ${playerStats.totalRolls}`,
    `Average Roll: ${playerStats.averageRoll.toFixed(1)}`,
    `Highest Roll: ${playerStats.highestRoll}`,
  ];

  if (playerStats.fastestWin !== Infinity) {
    lines.push(`Fastest Win: ${playerStats.fastestWin} rolls`);
  }

  if (playerStats.biggestComeback > 0) {
    lines.push(`Biggest Comeback: ${playerStats.biggestComeback} losses`);
  }

  return lines.join('\n');
}

/**
 * Calculate deficit overcome for comeback tracking
 * Call this at the end of a round to check if a player came back from behind
 */
export function calculateDeficitOvercome(
  playerLosses: number,
  otherPlayersMinLosses: number
): number {
  // If player had more losses than the best opponent, they came back
  return Math.max(0, playerLosses - otherPlayersMinLosses);
}
