import { GameState } from "./game";

// Player -> Host messages
export type PlayerMessage =
  | { type: "JOIN_REQUEST"; name: string; spectator?: boolean }
  | { type: "ROLL_REQUEST"; overrideRange?: number }
  | { type: "SET_RANGE"; maxRange: number }
  | { type: "HEARTBEAT" };

// Host -> Player messages
export type HostMessage =
  | { type: "JOIN_ACCEPTED"; playerId: string; state: GameState }
  | { type: "RECONNECT_ACCEPTED"; playerId: string; state: GameState }
  | { type: "JOIN_REJECTED"; reason: string }
  | { type: "STATE_UPDATE"; state: GameState }
  | { type: "GAME_OVER"; loserId: string }
  | { type: "KICK"; reason: string }
  | { type: "HEARTBEAT_ACK" };

export type Message = PlayerMessage | HostMessage;
