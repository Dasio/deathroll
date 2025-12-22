/**
 * Avatar system for player colors and emojis
 */

// Distinct colors optimized for visibility on dark theme
export const AVATAR_COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#FFD93D", // Yellow
  "#6BCF7F", // Green
  "#95E1D3", // Mint
  "#F38181", // Pink
  "#AA96DA", // Purple
  "#FCBAD3", // Light Pink
  "#A8E6CF", // Light Green
  "#FFD3B6", // Peach
  "#FFAAA5", // Salmon
  "#FF8B94", // Coral
];

// Fun emojis for avatars
export const AVATAR_EMOJIS = [
  "🎲",
  "🎯",
  "🎮",
  "🃏",
  "🎪",
  "🎨",
  "🎭",
  "🦊",
  "🐸",
  "🦁",
  "🐼",
  "🦄",
  "🐲",
  "🐙",
  "🦋",
  "🐝",
  "🦜",
  "🦩",
  "🐢",
  "🦎",
];

/**
 * Get a random color that hasn't been used by existing players
 */
export function getRandomColor(usedColors: string[]): string {
  const availableColors = AVATAR_COLORS.filter(
    (color) => !usedColors.includes(color)
  );

  if (availableColors.length === 0) {
    // All colors used, return a random one
    return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  }

  return availableColors[Math.floor(Math.random() * availableColors.length)];
}

/**
 * Get a random emoji that hasn't been used by existing players
 */
export function getRandomEmoji(usedEmojis: string[]): string {
  const availableEmojis = AVATAR_EMOJIS.filter(
    (emoji) => !usedEmojis.includes(emoji)
  );

  if (availableEmojis.length === 0) {
    // All emojis used, return a random one
    return AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
  }

  return availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
}

/**
 * Assign a random avatar (color + emoji) to a new player
 */
export function assignAvatar(existingPlayers: Array<{ color: string; emoji: string }>) {
  const usedColors = existingPlayers.map((p) => p.color);
  const usedEmojis = existingPlayers.map((p) => p.emoji);

  return {
    color: getRandomColor(usedColors),
    emoji: getRandomEmoji(usedEmojis),
  };
}
