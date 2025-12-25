import { z } from "zod";

/**
 * Player name validation schema
 * - Min 1 character, max 20 characters
 * - Alphanumeric, spaces, underscores, hyphens, and emojis allowed
 */
export const playerNameSchema = z
  .string()
  .min(1, "Name must be at least 1 character")
  .max(20, "Name must be at most 20 characters")
  .trim();

/**
 * Room code validation schema
 * - Exactly 4 characters
 * - Only alphanumeric characters (case-insensitive)
 */
export const roomCodeSchema = z
  .string()
  .length(4, "Room code must be exactly 4 characters")
  .regex(/^[A-Z0-9]{4}$/, "Room code must contain only letters and numbers")
  .transform((val) => val.toUpperCase());

/**
 * Player message validation schemas
 */
const joinRequestSchema = z.object({
  type: z.literal("JOIN_REQUEST"),
  name: playerNameSchema,
  spectator: z.boolean().nullish(),
  playerId: z.string().nullish(), // For reconnection
});

const rollRequestSchema = z.object({
  type: z.literal("ROLL_REQUEST"),
  overrideRange: z.number().int().positive().max(1000000).nullish(),
  rollTwice: z.boolean().optional(),
  nextPlayerOverride: z.string().nullish(),
});

const setRangeSchema = z.object({
  type: z.literal("SET_RANGE"),
  maxRange: z.number().int().positive().min(2).max(1000000),
});

const heartbeatSchema = z.object({
  type: z.literal("HEARTBEAT"),
});

const stateSyncRequestSchema = z.object({
  type: z.literal("STATE_SYNC_REQUEST"),
});

const chooseRollSchema = z.object({
  type: z.literal("CHOOSE_ROLL"),
  chosenRoll: z.number().int().positive().max(1000000),
});

export const playerMessageSchema = z.discriminatedUnion("type", [
  joinRequestSchema,
  rollRequestSchema,
  setRangeSchema,
  heartbeatSchema,
  stateSyncRequestSchema,
  chooseRollSchema,
]);

/**
 * Host message validation schemas
 */
const joinAcceptedSchema = z.object({
  type: z.literal("JOIN_ACCEPTED"),
  playerId: z.string().min(1),
  state: z.any(), // GameState validation would be complex, skip for now
});

const reconnectAcceptedSchema = z.object({
  type: z.literal("RECONNECT_ACCEPTED"),
  playerId: z.string().min(1),
  state: z.any(),
});

const joinRejectedSchema = z.object({
  type: z.literal("JOIN_REJECTED"),
  reason: z.string().min(1),
});

const stateUpdateSchema = z.object({
  type: z.literal("STATE_UPDATE"),
  state: z.any(),
});

const gameOverSchema = z.object({
  type: z.literal("GAME_OVER"),
  loserId: z.string().min(1),
});

const kickSchema = z.object({
  type: z.literal("KICK"),
  reason: z.string().min(1),
});

const heartbeatAckSchema = z.object({
  type: z.literal("HEARTBEAT_ACK"),
});

export const hostMessageSchema = z.discriminatedUnion("type", [
  joinAcceptedSchema,
  reconnectAcceptedSchema,
  joinRejectedSchema,
  stateUpdateSchema,
  gameOverSchema,
  kickSchema,
  heartbeatAckSchema,
]);

/**
 * Type guards for runtime type checking
 */
export function isValidPlayerMessage(data: unknown): boolean {
  return playerMessageSchema.safeParse(data).success;
}

export function isValidHostMessage(data: unknown): boolean {
  return hostMessageSchema.safeParse(data).success;
}

/**
 * Parse and validate player message
 * @throws {Error} if validation fails
 */
export function parsePlayerMessage(data: unknown) {
  return playerMessageSchema.parse(data);
}

/**
 * Parse and validate host message
 * @throws {Error} if validation fails
 */
export function parseHostMessage(data: unknown) {
  return hostMessageSchema.parse(data);
}

/**
 * Safe parse with error details
 */
export function safeParsePlayerMessage(data: unknown) {
  console.log("[Validation] Parsing player message:", JSON.stringify(data, null, 2));
  const result = playerMessageSchema.safeParse(data);
  if (!result.success) {
    console.error("[Validation] Schema validation failed:", result.error);
  }
  return result;
}

export function safeParseHostMessage(data: unknown) {
  return hostMessageSchema.safeParse(data);
}
