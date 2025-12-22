/**
 * Generate a cryptographically secure random number between 1 and maxRange (inclusive)
 * Uses rejection sampling to avoid modulo bias
 */
export function generateRoll(maxRange: number): number {
  if (maxRange < 1) {
    throw new Error("maxRange must be at least 1");
  }

  if (maxRange === 1) {
    return 1;
  }

  const array = new Uint32Array(1);
  const maxValid = Math.floor(0xffffffff / maxRange) * maxRange;

  let random: number;
  do {
    crypto.getRandomValues(array);
    random = array[0];
  } while (random >= maxValid);

  return (random % maxRange) + 1;
}
