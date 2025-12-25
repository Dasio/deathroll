import Peer, { DataConnection } from "peerjs";
import { peerConfig, getRoomPeerId } from "./config";
import { PlayerMessage, HostMessage } from "@/types/messages";
import { GameState } from "@/types/game";
import { safeParsePlayerMessage } from "../validation";
import { logger } from "../logger";

export type ConnectionStatus = "connecting" | "open" | "error" | "closed";

export interface RemotePlayer {
  peerId: string;
  connection: DataConnection;
  name: string;
}

export interface HostPeerCallbacks {
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

export class HostPeer {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private callbacks: HostPeerCallbacks;
  private roomCode: string;
  private lastHeartbeatTimes: Map<string, number> = new Map();
  private heartbeatCheckInterval: ReturnType<typeof setInterval> | null = null;
  private readonly HEARTBEAT_TIMEOUT_MS = 60000; // 60 seconds without heartbeat = disconnected

  constructor(roomCode: string, callbacks: HostPeerCallbacks) {
    this.roomCode = roomCode;
    this.callbacks = callbacks;
    this.startHeartbeatMonitoring();
  }

  private startHeartbeatMonitoring() {
    // Check for stale connections every 5 seconds
    this.heartbeatCheckInterval = setInterval(() => {
      const now = Date.now();
      this.lastHeartbeatTimes.forEach((lastTime, peerId) => {
        if (now - lastTime > this.HEARTBEAT_TIMEOUT_MS) {
          logger.debug("[Host] Player heartbeat timeout:", peerId);
          // Remove from tracking and trigger disconnect
          this.lastHeartbeatTimes.delete(peerId);
          this.connections.delete(peerId);
          this.callbacks.onPlayerDisconnect(peerId);
        }
      });
    }, 5000);
  }

  private stopHeartbeatMonitoring() {
    if (this.heartbeatCheckInterval) {
      clearInterval(this.heartbeatCheckInterval);
      this.heartbeatCheckInterval = null;
    }
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const peerId = getRoomPeerId(this.roomCode);

      this.peer = new Peer(peerId, peerConfig);

      this.peer.on("open", () => {
        this.callbacks.onStatusChange("open");
        resolve();
      });

      this.peer.on("connection", (conn) => {
        this.handleNewConnection(conn);
      });

      this.peer.on("error", (err) => {
        this.callbacks.onError(err);
        if (err.type === "unavailable-id") {
          this.callbacks.onStatusChange("error");
          reject(new Error("Room code already in use"));
        } else if (err.type === "peer-unavailable") {
          // This shouldn't happen for host, but handle it
          this.callbacks.onStatusChange("error");
          reject(err);
        } else {
          this.callbacks.onStatusChange("error");
          reject(err);
        }
      });

      this.peer.on("disconnected", () => {
        this.callbacks.onStatusChange("closed");
      });

      this.peer.on("close", () => {
        this.callbacks.onStatusChange("closed");
      });
    });
  }

  private handleNewConnection(conn: DataConnection) {
    logger.debug("[Host] New connection from:", conn.peer);

    conn.on("open", () => {
      logger.debug("[Host] Connection opened:", conn.peer);
      // Start tracking heartbeat for this connection
      this.lastHeartbeatTimes.set(conn.peer, Date.now());
    });

    conn.on("data", (data) => {
      logger.debug("[Host] Received data from:", conn.peer, data);

      // Validate incoming message
      const result = safeParsePlayerMessage(data);
      if (!result.success) {
        logger.error("[Host] Invalid message from player:", conn.peer, result.error);
        this.callbacks.onError(new Error(`Invalid message from player: ${JSON.stringify(result.error.issues)}`));
        return;
      }

      this.handlePlayerMessage(conn, result.data);
    });

    conn.on("close", () => {
      logger.debug("[Host] Connection closed:", conn.peer);
      const peerId = conn.peer;
      this.connections.delete(peerId);
      this.lastHeartbeatTimes.delete(peerId);
      this.callbacks.onPlayerDisconnect(peerId);
    });

    conn.on("error", (err) => {
      logger.error("[Host] Connection error:", conn.peer, err);
      this.callbacks.onError(err);
    });
  }

  private handlePlayerMessage(conn: DataConnection, message: PlayerMessage) {
    const peerId = conn.peer;

    switch (message.type) {
      case "JOIN_REQUEST":
        // Check if this might be a reconnection attempt (if playerId is provided)
        if (message.playerId) {
          this.callbacks.onPlayerReconnect(
            peerId,
            message.name,
            message.playerId,
            (existingPlayerId) => {
              // This is a reconnection - accept with existing player ID
              this.connections.set(peerId, conn);
              // Callback will be handled by useHostGame
            },
            () => {
              // Not a reconnection - treat as new join
              this.callbacks.onPlayerJoinRequest(
                peerId,
                message.name,
                message.spectator ?? false,
                () => {
                  this.connections.set(peerId, conn);
                },
                (reason) => {
                  this.sendTo(conn, { type: "JOIN_REJECTED", reason });
                  conn.close();
                }
              );
            }
          );
        } else {
          // No playerId provided - new join
          this.callbacks.onPlayerJoinRequest(
            peerId,
            message.name,
            message.spectator ?? false,
            () => {
              this.connections.set(peerId, conn);
            },
            (reason) => {
              this.sendTo(conn, { type: "JOIN_REJECTED", reason });
              conn.close();
            }
          );
        }
        break;

      case "HEARTBEAT":
        // Update last heartbeat time
        this.lastHeartbeatTimes.set(peerId, Date.now());
        this.sendTo(conn, { type: "HEARTBEAT_ACK" });
        break;

      case "STATE_SYNC_REQUEST":
        // Player requesting state sync after reconnection
        // This will be handled by the game logic to send current state
        this.callbacks.onPlayerMessage(peerId, message);
        break;

      default:
        this.callbacks.onPlayerMessage(peerId, message);
    }
  }

  sendTo(target: DataConnection | string, message: HostMessage) {
    const conn =
      typeof target === "string" ? this.connections.get(target) : target;
    if (conn?.open) {
      conn.send(message);
    }
  }

  broadcast(message: HostMessage) {
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(message);
      }
    });
  }

  broadcastState(state: GameState) {
    this.broadcast({ type: "STATE_UPDATE", state });
  }

  acceptPlayer(peerId: string, playerId: string, state: GameState) {
    const conn = this.connections.get(peerId);
    if (conn) {
      this.sendTo(conn, { type: "JOIN_ACCEPTED", playerId, state });
    }
  }

  reconnectPlayer(peerId: string, playerId: string, state: GameState) {
    const conn = this.connections.get(peerId);
    if (conn) {
      this.sendTo(conn, { type: "RECONNECT_ACCEPTED", playerId, state });
    }
  }

  kickPlayer(peerId: string, reason: string) {
    const conn = this.connections.get(peerId);
    if (conn) {
      this.sendTo(conn, { type: "KICK", reason });
      conn.close();
      this.connections.delete(peerId);
    }
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  isConnected(peerId: string): boolean {
    const conn = this.connections.get(peerId);
    return conn?.open ?? false;
  }

  disconnect() {
    this.stopHeartbeatMonitoring();
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.lastHeartbeatTimes.clear();
    this.peer?.destroy();
    this.peer = null;
  }
}
