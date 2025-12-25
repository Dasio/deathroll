import { GameState } from "@/types/game";
import {
  ICommunicationProvider,
  CommunicationProviderCallbacks,
} from "./ICommunicationProvider";
import { logger } from "../logger";

/**
 * Local-only communication provider (no network)
 * Used for offline/same-device pass-and-play mode
 * All operations are no-ops since there are no remote players
 */
export class LocalCommunicationProvider implements ICommunicationProvider {
  private callbacks: CommunicationProviderCallbacks;

  constructor(roomCode: string, callbacks: CommunicationProviderCallbacks) {
    this.callbacks = callbacks;
    logger.debug("[LocalProvider] Initialized for offline mode");
  }

  async connect(): Promise<void> {
    // No network connection needed in local mode
    logger.debug("[LocalProvider] Connected (local mode - no network)");
    this.callbacks.onStatusChange("open");
  }

  broadcastState(state: GameState): void {
    // No-op: no remote players to broadcast to
    // All players are local and share the same state
  }

  reconnectPlayer(peerId: string, playerId: string, state: GameState): void {
    // No-op: no remote players to reconnect
  }

  acceptPlayer(peerId: string, playerId: string, state: GameState): void {
    // No-op: no remote players to accept
  }

  kickPlayer(peerId: string, reason: string): void {
    // No-op: can only have local players in local mode
  }

  disconnect(): void {
    // No cleanup needed in local mode
    logger.debug("[LocalProvider] Disconnected");
    this.callbacks.onStatusChange("closed");
  }
}
