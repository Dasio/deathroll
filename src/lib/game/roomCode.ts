// Characters that are easy to read and not easily confused
// Excludes: I, O, 0, 1, L (too similar)
const ROOM_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 4;

export function generateRoomCode(): string {
  const array = new Uint32Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(array);

  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[array[i] % ROOM_CODE_CHARS.length];
  }
  return code;
}

export function isValidRoomCode(code: string): boolean {
  if (code.length !== ROOM_CODE_LENGTH) return false;
  const upperCode = code.toUpperCase();
  for (const char of upperCode) {
    if (!ROOM_CODE_CHARS.includes(char)) return false;
  }
  return true;
}

export function normalizeRoomCode(code: string): string {
  return code.toUpperCase().trim();
}
