/**
 * Vibration utility for mobile devices
 * Provides different vibration patterns for game events
 */

const STORAGE_KEY = "deathroll_vibration_enabled";

// Vibration patterns (in milliseconds)
export const VibrationPatterns = {
  // Short pulse when it's your turn
  YOUR_TURN: [100],

  // Longer pattern when YOU lose (death roll)
  DEATH_ROLL: [200, 100, 200, 100, 300],

  // Simple pattern when someone else loses (round ended)
  ROUND_ENDED: [150, 100, 150],

  // Small celebratory buzz for max roll
  MAX_ROLL: [50, 50, 100],
} as const;

/**
 * Check if the Vibration API is available in the current browser
 */
export function isVibrationSupported(): boolean {
  return typeof window !== "undefined" && "vibrate" in navigator;
}

/**
 * Get the current vibration enabled state from localStorage
 */
export function isVibrationEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  // Default to true if not set
  return stored === null ? true : stored === "true";
}

/**
 * Set the vibration enabled state in localStorage
 */
export function setVibrationEnabled(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, enabled.toString());
}

/**
 * Toggle vibration enabled state
 * @returns The new enabled state
 */
export function toggleVibration(): boolean {
  const newState = !isVibrationEnabled();
  setVibrationEnabled(newState);
  return newState;
}

/**
 * Trigger a vibration pattern if supported and enabled
 * @param pattern Vibration pattern (array of milliseconds)
 */
export function vibrate(pattern: number | readonly number[] | number[]): void {
  if (!isVibrationSupported() || !isVibrationEnabled()) {
    return;
  }

  try {
    navigator.vibrate(pattern as number | number[]);
  } catch (error) {
    console.warn("Vibration failed:", error);
  }
}

/**
 * Stop any ongoing vibration
 */
export function stopVibration(): void {
  if (!isVibrationSupported()) {
    return;
  }

  try {
    navigator.vibrate(0);
  } catch (error) {
    console.warn("Stop vibration failed:", error);
  }
}

// Convenience functions for specific game events
export function vibrateYourTurn(): void {
  vibrate(VibrationPatterns.YOUR_TURN);
}

export function vibrateDeathRoll(): void {
  vibrate(VibrationPatterns.DEATH_ROLL);
}

export function vibrateRoundEnded(): void {
  vibrate(VibrationPatterns.ROUND_ENDED);
}

export function vibrateMaxRoll(): void {
  vibrate(VibrationPatterns.MAX_ROLL);
}
