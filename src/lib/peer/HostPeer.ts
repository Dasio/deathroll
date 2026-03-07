import Peer, { DataConnection } from "peerjs";
import { peerConfig, getRoomPeerId } from "./config";
import { PlayerMessage, HostMessage } from "@/types/messages";
import { GameState } from "@/types/game";
import { safeParsePlayerMessage } from "../validation";
import { logger } from "../logger";
import { ICommunicationProvider } from "./ICommunicationProvider";

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

export class HostPeer implements ICommunicationProvider {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private callbacks: HostPeerCallbacks;
  private roomCode: string;
  private lastHeartbeatTimes: Map<string, number> = new Map();
  private heartbeatCheckInterval: ReturnType<typeof setInterval> | null = null;
  private readonly HEARTBEAT_TIMEOUT_MS = 30000; // 30 seconds without heartbeat = disconnected
  private signalingReconnectAttempts: number = 0;
  private readonly MAX_SIGNALING_RECONNECT_ATTEMPTS = 5;
  private signalingReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private onlineListener: (() => void) | null = null;
  private visibilityListener: (() => void) | null = null;
  private beforeUnloadListener: (() => void) | null = null;
  private isPageHidden: boolean = false;
  private isInitialConnection: boolean = true;

  constructor(roomCode: string, callbacks: HostPeerCallbacks) {
    this.roomCode = roomCode;
    this.callbacks = callbacks;
    this.startHeartbeatMonitoring();
    this.setupNetworkListeners();
  }

  private setupNetworkListeners() {
    this.onlineListener = () => {
      logger.debug("[Host] Browser went online, checking signaling connection");
      if (this.peer && this.peer.disconnected && !this.peer.destroyed) {
        this.peer.reconnect();
      }
    };

    this.visibilityListener = () => {
      if (document.visibilityState === "hidden") {
        logger.debug("[Host] Page hidden, pausing heartbeat monitoring");
        this.isPageHidden = true;
        this.stopHeartbeatMonitoring();
        // Cancel any pending signaling reconnect — don't waste attempts while backgrounded
        if (this.signalingReconnectTimeout) {
          clearTimeout(this.signalingReconnectTimeout);
          this.signalingReconnectTimeout = null;
        }
      } else if (document.visibilityState === "visible") {
        logger.debug("[Host] Page visible, resuming heartbeat monitoring");
        this.isPageHidden = false;
        // Reset all heartbeat timestamps so we don't false-timeout players
        // who were alive while we were backgrounded
        const now = Date.now();
        this.lastHeartbeatTimes.forEach((_lastTime, peerId) => {
          this.lastHeartbeatTimes.set(peerId, now);
        });
        this.startHeartbeatMonitoring();

        // Reset signaling reconnect counter and restore connection if needed
        this.signalingReconnectAttempts = 0;
        if (this.peer && this.peer.disconnected && !this.peer.destroyed) {
          this.peer.reconnect();
        }
      }
    };

    this.beforeUnloadListener = () => {
      // Notify all players immediately so they don't wait for heartbeat timeout
      this.broadcast({ type: "HOST_DISCONNECTING" });
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", this.onlineListener);
      document.addEventListener("visibilitychange", this.visibilityListener);
      window.addEventListener("beforeunload", this.beforeUnloadListener);
    }
  }

  private cleanupNetworkListeners() {
    if (typeof window !== "undefined") {
      if (this.onlineListener) {
        window.removeEventListener("online", this.onlineListener);
      }
      if (this.visibilityListener) {
        document.removeEventListener("visibilitychange", this.visibilityListener);
      }
      if (this.beforeUnloadListener) {
        window.removeEventListener("beforeunload", this.beforeUnloadListener);
      }
    }
  }

  private startHeartbeatMonitoring() {
    this.stopHeartbeatMonitoring(); // Prevent double-start
    // Check for stale connections every 5 seconds
    this.heartbeatCheckInterval = setInterval(() => {
      const now = Date.now();
      this.lastHeartbeatTimes.forEach((lastTime, peerId) => {
        if (now - lastTime > this.HEARTBEAT_TIMEOUT_MS) {
          logger.debug("[Host] Player heartbeat timeout:", peerId);
          const conn = this.connections.get(peerId);
          // Remove from maps before closing so conn.on("close") won't fire duplicate disconnect
          this.lastHeartbeatTimes.delete(peerId);
          this.connections.delete(peerId);
          if (conn) conn.close();
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

  private attemptSignalingReconnect() {
    // Don't waste reconnect attempts while page is backgrounded —
    // the visibility handler will reconnect when the user returns
    if (this.isPageHidden) {
      logger.debug("[Host] Page hidden, deferring signaling reconnect to visibility restore");
      return;
    }

    if (this.signalingReconnectAttempts >= this.MAX_SIGNALING_RECONNECT_ATTEMPTS) {
      logger.error("[Host] Max signaling reconnect attempts reached");
      this.callbacks.onStatusChange("closed");
      return;
    }

    this.signalingReconnectAttempts++;
    // Exponential backoff: 1s, 2s, 4s, 8s, 15s
    const delay = Math.min(1000 * Math.pow(2, this.signalingReconnectAttempts - 1), 15000);

    logger.debug(
      `[Host] Signaling reconnect attempt ${this.signalingReconnectAttempts}/${this.MAX_SIGNALING_RECONNECT_ATTEMPTS} in ${delay}ms`
    );

    this.signalingReconnectTimeout = setTimeout(() => {
      if (this.peer && !this.peer.destroyed) {
        this.peer.reconnect();
      }
    }, delay);
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const peerId = getRoomPeerId(this.roomCode);

      this.peer = new Peer(peerId, peerConfig);

      this.peer.on("open", () => {
        this.signalingReconnectAttempts = 0; // Reset on successful connection
        this.isInitialConnection = false;
        this.callbacks.onStatusChange("open");
        resolve();
      });

      this.peer.on("connection", (conn) => {
        this.handleNewConnection(conn);
      });

      this.peer.on("error", (err) => {
        if (err.type === "unavailable-id") {
          this.callbacks.onError(err);
          this.callbacks.onStatusChange("error");
          reject(new Error("Room code already in use"));
        } else if (this.isInitialConnection) {
          // Fatal error during initial connection
          this.callbacks.onError(err);
          this.callbacks.onStatusChange("error");
          reject(err);
        } else {
          // Runtime error (e.g. signaling WebSocket drop on tab switch) —
          // don't set status to "error", the "disconnected" handler will
          // manage reconnection to the signaling server
          logger.debug("[Host] Non-fatal runtime error:", err.type, err.message);
        }
      });

      this.peer.on("disconnected", () => {
        logger.debug("[Host] Signaling server disconnected, attempting reconnect");
        this.attemptSignalingReconnect();
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
      // Guard against double-disconnect (e.g. heartbeat timeout already handled this)
      const wasTracked = this.connections.has(peerId);
      this.connections.delete(peerId);
      this.lastHeartbeatTimes.delete(peerId);
      if (wasTracked) {
        this.callbacks.onPlayerDisconnect(peerId);
      }
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
            (_existingPlayerId) => {
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
    this.cleanupNetworkListeners();
    if (this.signalingReconnectTimeout) {
      clearTimeout(this.signalingReconnectTimeout);
      this.signalingReconnectTimeout = null;
    }
    // Notify players before closing connections
    this.broadcast({ type: "HOST_DISCONNECTING" });
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.lastHeartbeatTimes.clear();
    this.peer?.destroy();
    this.peer = null;
  }
}
