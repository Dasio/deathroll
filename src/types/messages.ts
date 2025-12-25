import { GameState } from "./game";

// Player -> Host messages
export type PlayerMessage =
  | { type: "JOIN_REQUEST"; name: string; spectator?: boolean | null; playerId?: string | null }
  | { type: "ROLL_REQUEST"; overrideRange?: number | null; rollTwice?: boolean; nextPlayerOverride?: string | null; skipRoll?: boolean }
  | { type: "SET_RANGE"; maxRange: number }
  | { type: "HEARTBEAT" }
  | { type: "STATE_SYNC_REQUEST" }
  | { type: "CHOOSE_ROLL"; chosenRoll: number };

// Host -> Player messages
export type HostMessage =
  | { type: "JOIN_ACCEPTED"; playerId: string; state: GameState; sequence?: number }
  | { type: "RECONNECT_ACCEPTED"; playerId: string; state: GameState; sequence?: number }
  | { type: "JOIN_REJECTED"; reason: string }
  | { type: "STATE_UPDATE"; state: GameState; sequence?: number }
  | { type: "GAME_OVER"; loserId: string; sequence?: number }
  | { type: "KICK"; reason: string }
  | { type: "HEARTBEAT_ACK"; latency?: number }
  | { type: "PONG"; timestamp: number };

export type Message = PlayerMessage | HostMessage;
