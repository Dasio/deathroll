import { GameState } from "@/types/game";
import { PlayerMessage } from "@/types/messages";

export type ConnectionStatus = "connecting" | "open" | "error" | "closed";

export interface CommunicationProviderCallbacks {
  onStatusChange: (status: ConnectionStatus) => void;
  onPlayerJoinRequest: (
    peerId: string,
    name: string,
    spectator: boolean,
    accept: () => void,
    reject: (reason: string) => void
  ) => void;
  onPlayerReconnect: (
    peerId: string,
    name: string,
    playerId: string | null | undefined,
    accept: (playerId: string) => void,
    reject: (reason: string) => void
  ) => void;
  onPlayerDisconnect: (peerId: string) => void;
  onPlayerMessage: (peerId: string, message: PlayerMessage) => void;
  onError: (error: Error) => void;
}

/**
 * Abstract interface for communication providers
 * Allows swapping between PeerJS (online) and local mode (offline)
 */
export interface ICommunicationProvider {
  /**
   * Initialize and connect to the network (or no-op for local mode)
   */
  connect(): Promise<void>;

  /**
   * Broadcast game state to all connected players
   */
  broadcastState(state: GameState): void;

  /**
   * Reconnect a player with a new peer ID
   */
  reconnectPlayer(peerId: string, playerId: string, state: GameState): void;

  /**
   * Accept a new player and send them initial state
   */
  acceptPlayer(peerId: string, playerId: string, state: GameState): void;

  /**
   * Kick a player from the game
   */
  kickPlayer(peerId: string, reason: string): void;

  /**
   * Disconnect and cleanup
   */
  disconnect(): void;
}
