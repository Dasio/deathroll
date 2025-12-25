import Peer, { DataConnection } from "peerjs";
import { peerConfig, getRoomPeerId } from "./config";
import { PlayerMessage, HostMessage } from "@/types/messages";
import { GameState } from "@/types/game";
import { safeParseHostMessage } from "../validation";
import { logger } from "../logger";

export type ConnectionStatus = "connecting" | "open" | "error" | "closed" | "reconnecting";

export type NetworkQuality = "excellent" | "good" | "poor" | "offline";

export interface ReconnectionState {
  isReconnecting: boolean;
  attempt: number;
  maxAttempts: number;
  nextAttemptDelay?: number;
}

export interface PlayerPeerCallbacks {
  onStatusChange: (status: ConnectionStatus) => void;
  onJoinAccepted: (playerId: string, state: GameState) => void;
  onJoinRejected: (reason: string) => void;
  onStateUpdate: (state: GameState) => void;
  onGameOver: (loserId: string) => void;
  onKicked: (reason: string) => void;
  onError: (error: Error) => void;
  onReconnectionStateChange?: (state: ReconnectionState) => void;
  onNetworkQualityChange?: (quality: NetworkQuality) => void;
  onLatencyUpdate?: (latency: number) => void;
}

export class PlayerPeer {
  private peer: Peer | null = null;
  private hostConnection: DataConnection | null = null;
  private callbacks: PlayerPeerCallbacks;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private roomCode: string | null = null;
  private playerName: string | null = null;
  private playerId: string | null = null;
  private spectator: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isManualDisconnect: boolean = false;
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly CONNECTION_TIMEOUT_MS = 30000; // 30 second timeout

  // Network monitoring
  private lastHeartbeatTime: number = 0;
  private latencyHistory: number[] = [];
  private readonly MAX_LATENCY_SAMPLES = 10;
  private networkQuality: NetworkQuality = "excellent";
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private onlineListener: (() => void) | null = null;
  private offlineListener: (() => void) | null = null;
  private messageSequence: number = 0;
  private lastReceivedSequence: number = 0;

  constructor(callbacks: PlayerPeerCallbacks) {
    this.callbacks = callbacks;
    this.setupNetworkListeners();
  }

  private setupNetworkListeners() {
    // Listen for browser online/offline events
    this.onlineListener = () => {
      logger.debug("[Player] Browser went online");
      if (!this.isManualDisconnect && !this.hostConnection?.open) {
        this.attemptReconnect();
      }
    };

    this.offlineListener = () => {
      logger.debug("[Player] Browser went offline");
      this.updateNetworkQuality("offline");
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", this.onlineListener);
      window.addEventListener("offline", this.offlineListener);
    }
  }

  private cleanupNetworkListeners() {
    if (typeof window !== "undefined" && this.onlineListener && this.offlineListener) {
      window.removeEventListener("online", this.onlineListener);
      window.removeEventListener("offline", this.offlineListener);
    }
  }

  async connect(roomCode: string, playerName: string, spectator: boolean = false, existingPlayerId?: string): Promise<void> {
    // Store connection details for reconnection
    this.roomCode = roomCode;
    this.playerName = playerName;
    this.spectator = spectator;
    this.isManualDisconnect = false;

    if (existingPlayerId) {
      this.playerId = existingPlayerId;
    }

    return new Promise((resolve, reject) => {
      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        this.clearConnectionTimeout();
        const err = new Error("Connection timeout: Could not connect to room within 30 seconds");
        this.callbacks.onError(err);
        reject(err);
        this.peer?.destroy();
      }, this.CONNECTION_TIMEOUT_MS);

      this.peer = new Peer(peerConfig);

      this.peer.on("open", (id) => {
        logger.debug("[Player] Peer opened with ID:", id);
        const hostPeerId = getRoomPeerId(roomCode);
        logger.debug("[Player] Connecting to host:", hostPeerId);
        const conn = this.peer!.connect(hostPeerId, { reliable: true });

        conn.on("open", () => {
          logger.debug("[Player] Connection to host opened");
          this.clearConnectionTimeout(); // Clear timeout on successful connection
          this.hostConnection = conn;
          this.callbacks.onStatusChange("open");

          // Send JOIN_REQUEST with existing playerId if reconnecting
          const joinMessage: PlayerMessage = {
            type: "JOIN_REQUEST",
            name: playerName,
            spectator,
            playerId: this.playerId || undefined,
          };
          this.sendToHost(joinMessage);

          // Don't start heartbeat immediately - wait for JOIN_ACCEPTED/RECONNECT_ACCEPTED
          // This prevents premature disconnection during reconnection
          this.reconnectAttempts = 0; // Reset on successful connection
          this.updateReconnectionState();
          resolve();
        });

        conn.on("data", (data) => {
          logger.debug("[Player] Received from host:", data);

          // Validate incoming message
          const result = safeParseHostMessage(data);
          if (!result.success) {
            logger.error("[Player] Invalid message from host:", result.error);
            this.callbacks.onError(new Error(`Invalid message from host: ${result.error.message}`));
            return;
          }

          this.handleHostMessage(result.data);
        });

        conn.on("close", () => {
          logger.debug("[Player] Connection to host closed");
          this.stopHeartbeat();
          this.callbacks.onStatusChange("closed");

          // Attempt reconnection if not a manual disconnect
          if (!this.isManualDisconnect) {
            this.attemptReconnect();
          }
        });

        conn.on("error", (err) => {
          logger.error("[Player] Connection error:", err);
          this.callbacks.onError(err);
          reject(err);
        });
      });

      this.peer.on("error", (err) => {
        this.clearConnectionTimeout();
        this.callbacks.onError(err);
        if (err.type === "peer-unavailable") {
          reject(new Error("Room not found. Please check the room code and try again."));
        } else if (err.type === "network") {
          reject(new Error("Network error. Please check your internet connection."));
        } else if (err.type === "server-error") {
          reject(new Error("Server error. Please try again later."));
        } else {
          reject(new Error(`Connection error: ${err.message || "Unknown error"}`));
        }
      });

      this.peer.on("disconnected", () => {
        this.stopHeartbeat();
        this.callbacks.onStatusChange("closed");

        // Attempt reconnection if not a manual disconnect
        if (!this.isManualDisconnect) {
          this.attemptReconnect();
        }
      });
    });
  }

  private handleHostMessage(message: HostMessage) {
    // Track sequence numbers if present
    if ("sequence" in message && typeof message.sequence === "number") {
      if (message.sequence > this.lastReceivedSequence) {
        this.lastReceivedSequence = message.sequence;
      }
    }

    switch (message.type) {
      case "JOIN_ACCEPTED":
        this.playerId = message.playerId;
        this.callbacks.onJoinAccepted(message.playerId, message.state);
        // Start heartbeat after successful join
        this.startHeartbeat();
        this.startPingMonitoring();
        break;

      case "RECONNECT_ACCEPTED":
        this.playerId = message.playerId;
        this.callbacks.onJoinAccepted(message.playerId, message.state);
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful reconnection
        this.updateReconnectionState();
        // Start heartbeat after successful reconnection
        this.startHeartbeat();
        this.startPingMonitoring();
        break;

      case "JOIN_REJECTED":
        this.callbacks.onJoinRejected(message.reason);
        // Don't call full disconnect - just clean up without triggering "closed" status
        this.isManualDisconnect = true;
        this.stopHeartbeat();
        this.stopPingMonitoring();
        this.hostConnection?.close();
        this.hostConnection = null;
        this.peer?.destroy();
        this.peer = null;
        break;

      case "STATE_UPDATE":
        this.callbacks.onStateUpdate(message.state);
        break;

      case "GAME_OVER":
        this.callbacks.onGameOver(message.loserId);
        break;

      case "KICK":
        this.callbacks.onKicked(message.reason);
        this.disconnect();
        break;

      case "HEARTBEAT_ACK":
        // Calculate latency
        if (this.lastHeartbeatTime > 0) {
          const latency = Date.now() - this.lastHeartbeatTime;
          this.updateLatency(latency);
        }
        break;

      case "PONG":
        // Alternative ping mechanism
        const latency = Date.now() - message.timestamp;
        this.updateLatency(latency);
        break;
    }
  }

  sendToHost(message: PlayerMessage) {
    if (this.hostConnection?.open) {
      this.hostConnection.send(message);
    }
  }

  requestRoll(overrideRange?: number | null, rollTwice?: boolean, nextPlayerOverride?: string | null) {
    this.sendToHost({ type: "ROLL_REQUEST", overrideRange, rollTwice, nextPlayerOverride });
  }

  setRange(maxRange: number) {
    this.sendToHost({ type: "SET_RANGE", maxRange });
  }

  chooseRoll(chosenRoll: number) {
    this.sendToHost({ type: "CHOOSE_ROLL", chosenRoll });
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.lastHeartbeatTime = Date.now();
      this.sendToHost({ type: "HEARTBEAT" });
    }, 5000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private startPingMonitoring() {
    // Additional ping monitoring every 10 seconds
    this.pingInterval = setInterval(() => {
      if (this.hostConnection?.open) {
        this.lastHeartbeatTime = Date.now();
        this.sendToHost({ type: "HEARTBEAT" });
      }
    }, 10000);
  }

  private stopPingMonitoring() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private updateLatency(latency: number) {
    this.latencyHistory.push(latency);
    if (this.latencyHistory.length > this.MAX_LATENCY_SAMPLES) {
      this.latencyHistory.shift();
    }

    // Calculate average latency
    const avgLatency = this.latencyHistory.reduce((sum, l) => sum + l, 0) / this.latencyHistory.length;

    // Update network quality based on latency
    let quality: NetworkQuality;
    if (avgLatency < 100) {
      quality = "excellent";
    } else if (avgLatency < 300) {
      quality = "good";
    } else {
      quality = "poor";
    }

    this.updateNetworkQuality(quality);

    // Notify callback of latency update
    if (this.callbacks.onLatencyUpdate) {
      this.callbacks.onLatencyUpdate(Math.round(avgLatency));
    }
  }

  private updateNetworkQuality(quality: NetworkQuality) {
    if (this.networkQuality !== quality) {
      this.networkQuality = quality;
      if (this.callbacks.onNetworkQualityChange) {
        this.callbacks.onNetworkQualityChange(quality);
      }
    }
  }

  private updateReconnectionState() {
    if (this.callbacks.onReconnectionStateChange) {
      this.callbacks.onReconnectionStateChange({
        isReconnecting: this.reconnectAttempts > 0,
        attempt: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts,
      });
    }
  }

  public getNetworkQuality(): NetworkQuality {
    return this.networkQuality;
  }

  public getLatency(): number {
    if (this.latencyHistory.length === 0) return 0;
    return Math.round(
      this.latencyHistory.reduce((sum, l) => sum + l, 0) / this.latencyHistory.length
    );
  }

  public requestStateSync() {
    this.sendToHost({ type: "STATE_SYNC_REQUEST" });
  }

  private clearConnectionTimeout() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  private attemptReconnect() {
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Check if we should attempt reconnection
    if (
      !this.roomCode ||
      !this.playerName ||
      this.isManualDisconnect ||
      this.reconnectAttempts >= this.maxReconnectAttempts
    ) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger.error("Max reconnection attempts reached");
        this.callbacks.onError(
          new Error("Could not reconnect to game. Maximum attempts reached.")
        );
      }
      return;
    }

    this.reconnectAttempts++;

    // Improved exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s, 30s...
    const baseDelay = 1000 * Math.pow(2, Math.min(this.reconnectAttempts - 1, 4));
    const delay = Math.min(baseDelay, 30000);

    logger.debug(
      `Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`
    );

    // Update reconnection state
    this.callbacks.onStatusChange("reconnecting");
    this.updateReconnectionState();

    this.reconnectTimeout = setTimeout(async () => {
      try {
        // Clean up old connection
        this.stopHeartbeat();
        this.stopPingMonitoring();
        this.hostConnection?.close();
        this.hostConnection = null;
        this.peer?.destroy();
        this.peer = null;

        // Attempt to reconnect with existing player ID
        logger.debug(`Reconnecting with playerId: ${this.playerId}`);
        await this.connect(this.roomCode!, this.playerName!, this.spectator, this.playerId || undefined);
      } catch (err) {
        logger.error("Reconnection failed:", err);
        // The connect method will trigger another attemptReconnect if needed
        this.updateReconnectionState();
      }
    }, delay);
  }

  public manualReconnect(): void {
    // Allow user to manually trigger reconnection - attempt immediately without delay
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.reconnectAttempts = 0; // Reset attempts
    }

    // Clear any pending reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Attempt reconnection immediately (without delay)
    this.reconnectAttempts++;
    this.callbacks.onStatusChange("reconnecting");
    this.updateReconnectionState();

    // Clean up old connection
    this.stopHeartbeat();
    this.stopPingMonitoring();
    this.hostConnection?.close();
    this.hostConnection = null;
    this.peer?.destroy();
    this.peer = null;

    // Attempt to reconnect immediately
    logger.debug(`Manual reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    this.connect(this.roomCode!, this.playerName!, this.spectator, this.playerId || undefined)
      .catch((err) => {
        logger.error("Manual reconnection failed:", err);
        this.updateReconnectionState();
      });
  }

  disconnect() {
    this.isManualDisconnect = true;
    this.stopHeartbeat();
    this.stopPingMonitoring();
    this.clearConnectionTimeout();
    this.cleanupNetworkListeners();

    // Clear reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.hostConnection?.close();
    this.hostConnection = null;
    this.peer?.destroy();
    this.peer = null;

    // Clear stored connection details
    this.roomCode = null;
    this.playerName = null;
    this.playerId = null;
    this.reconnectAttempts = 0;
    this.latencyHistory = [];
    this.updateReconnectionState();
  }
}
