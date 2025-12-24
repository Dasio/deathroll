/**
 * Sound Effects Manager using Web Audio API
 * All sounds are generated programmatically - no external files needed
 */

// Global audio context (lazy initialized)
let audioContext: AudioContext | null = null;
let isEnabled = true;
let isInitialized = false;

// Storage key for sound preferences
const SOUND_ENABLED_KEY = "deathroll_sounds_enabled";

/**
 * Get or create the audio context
 * Note: Some browsers require user interaction before creating AudioContext
 */
function getAudioContext(): AudioContext | null {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API not supported", e);
      return null;
    }
  }
  return audioContext;
}

/**
 * Initialize audio context on user interaction
 * Call this on first user click/tap to enable sounds on mobile
 */
export function initializeSounds(): void {
  if (isInitialized) return;

  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume();
  }

  // Load sound preference from localStorage
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  if (stored !== null) {
    isEnabled = stored === "true";
  }

  isInitialized = true;
}

/**
 * Check if sounds are enabled
 */
export function isSoundEnabled(): boolean {
  return isEnabled;
}

/**
 * Toggle sound on/off
 */
export function toggleSound(): boolean {
  isEnabled = !isEnabled;
  localStorage.setItem(SOUND_ENABLED_KEY, String(isEnabled));
  return isEnabled;
}

/**
 * Set sound enabled state
 */
export function setSoundEnabled(enabled: boolean): void {
  isEnabled = enabled;
  localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
}

/**
 * Play a dice roll sound (subtle tap)
 * Very subtle, pleasant single tap sound
 */
export function playDiceRollSound(): void {
  if (!isEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Single gentle tone - very subtle
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Use sine wave for soft, pleasant tone
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(600, now); // Higher frequency = less annoying

  // Very quiet and quick envelope
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.03, now + 0.01); // Very quiet (0.03 instead of 0.05)
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  oscillator.start(now);
  oscillator.stop(now + 0.05);
}

/**
 * Play a death sound (low dramatic tone)
 * Deep, ominous sound when someone rolls a 1
 */
export function playDeathSound(): void {
  if (!isEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.8;

  // Low frequency oscillator for dramatic effect
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = "sine";

  // Descending tone from 200Hz to 80Hz
  oscillator.frequency.setValueAtTime(200, now);
  oscillator.frequency.exponentialRampToValueAtTime(80, now + duration);

  // Fade in and out
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.15, now + 0.1);
  gainNode.gain.linearRampToValueAtTime(0.15, now + duration - 0.2);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

  oscillator.start(now);
  oscillator.stop(now + duration);
}

/**
 * Play a max roll sound (triumphant/high tone)
 * Bright, ascending sound when rolling the maximum value
 */
export function playMaxRollSound(): void {
  if (!isEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.5;

  // Create two oscillators for a richer sound
  [0, 0.1].forEach((offset, index) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = "sine";

    // Ascending tone from 400Hz to 800Hz, second one slightly detuned
    const baseFreq = index === 0 ? 400 : 405;
    const targetFreq = index === 0 ? 800 : 810;

    oscillator.frequency.setValueAtTime(baseFreq, now + offset);
    oscillator.frequency.exponentialRampToValueAtTime(targetFreq, now + offset + duration);

    // Quick fade in and gradual fade out
    gainNode.gain.setValueAtTime(0, now + offset);
    gainNode.gain.linearRampToValueAtTime(0.12, now + offset + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + offset + duration);

    oscillator.start(now + offset);
    oscillator.stop(now + offset + duration);
  });
}

/**
 * Play a turn notification sound (short beep)
 * Simple, attention-grabbing sound to indicate it's your turn
 */
export function playTurnNotificationSound(): void {
  if (!isEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.15;

  // Two quick beeps
  [0, 0.2].forEach((offset) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(600, now + offset);

    // Short beep with quick fade
    gainNode.gain.setValueAtTime(0, now + offset);
    gainNode.gain.linearRampToValueAtTime(0.1, now + offset + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + offset + duration);

    oscillator.start(now + offset);
    oscillator.stop(now + offset + duration);
  });
}
