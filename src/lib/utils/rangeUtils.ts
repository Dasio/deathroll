/**
 * Utility functions for determining roll range
 */

/**
 * Determines the range to use for a roll, considering custom range and session memory
 * @param canSetRange - Whether the player can set a custom range (at start of round)
 * @param customRange - The currently selected custom range (from input field)
 * @param sessionMaxRoll - The remembered range from previous rounds in this session
 * @param currentMaxRoll - The current max roll from game state
 * @returns The range to use for the roll, or undefined to use default
 */
export function determineRollRange(
  canSetRange: boolean,
  customRange: number | null,
  sessionMaxRoll: number | null,
  currentMaxRoll: number
): number | undefined {
  // Priority 1: Use custom range if explicitly set and different from current
  if (canSetRange && customRange && customRange !== currentMaxRoll) {
    return customRange;
  }

  // Priority 2: Use session remembered range if available and different from current
  if (canSetRange && sessionMaxRoll && sessionMaxRoll !== currentMaxRoll) {
    return sessionMaxRoll;
  }

  // Priority 3: Use default (no override)
  return undefined;
}
