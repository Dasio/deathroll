import Peer, { DataConnection } from "peerjs";
import { peerConfig, getRoomPeerId } from "./config";
import { PlayerMessage, HostMessage } from "@/types/messages";
import { GameState } from "@/types/game";

export type ConnectionStatus = "connecting" | "open" | "error" | "closed";

export interface PlayerPeerCallbacks {
  onStatusChange: (status: ConnectionStatus) => void;
  onJoinAccepted: (playerId: string, state: GameState) => void;
  onJoinRejected: (reason: string) => void;
  onStateUpdate: (state: GameState) => void;
  onGameOver: (loserId: string) => void;
  onKicked: (reason: string) => void;
  onError: (error: Error) => void;
}

export class PlayerPeer {
  private peer: Peer | null = null;
  private hostConnection: DataConnection | null = null;
  private callbacks: PlayerPeerCallbacks;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private roomCode: string | null = null;
  private playerName: string | null = null;
  private spectator: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isManualDisconnect: boolean = false;

  constructor(callbacks: PlayerPeerCallbacks) {
    this.callbacks = callbacks;
  }

  async connect(roomCode: string, playerName: string, spectator: boolean = false): Promise<void> {
    // Store connection details for reconnection
    this.roomCode = roomCode;
    this.playerName = playerName;
    this.spectator = spectator;
    this.isManualDisconnect = false;

    return new Promise((resolve, reject) => {
      this.peer = new Peer(peerConfig);

      this.peer.on("open", (id) => {
        console.log("[Player] Peer opened with ID:", id);
        const hostPeerId = getRoomPeerId(roomCode);
        console.log("[Player] Connecting to host:", hostPeerId);
        const conn = this.peer!.connect(hostPeerId, { reliable: true });

        conn.on("open", () => {
          console.log("[Player] Connection to host opened");
          this.hostConnection = conn;
          this.callbacks.onStatusChange("open");
          this.sendToHost({ type: "JOIN_REQUEST", name: playerName, spectator });
          this.startHeartbeat();
          this.reconnectAttempts = 0; // Reset on successful connection
          resolve();
        });

        conn.on("data", (data) => {
          console.log("[Player] Received from host:", data);
          this.handleHostMessage(data as HostMessage);
        });

        conn.on("close", () => {
          console.log("[Player] Connection to host closed");
          this.stopHeartbeat();
          this.callbacks.onStatusChange("closed");

          // Attempt reconnection if not a manual disconnect
          if (!this.isManualDisconnect) {
            this.attemptReconnect();
          }
        });

        conn.on("error", (err) => {
          console.error("[Player] Connection error:", err);
          this.callbacks.onError(err);
          reject(err);
        });
      });

      this.peer.on("error", (err) => {
        this.callbacks.onError(err);
        if (err.type === "peer-unavailable") {
          reject(new Error("Room not found"));
        } else {
          reject(err);
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
    switch (message.type) {
      case "JOIN_ACCEPTED":
        this.callbacks.onJoinAccepted(message.playerId, message.state);
        break;

      case "RECONNECT_ACCEPTED":
        this.callbacks.onJoinAccepted(message.playerId, message.state);
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful reconnection
        break;

      case "JOIN_REJECTED":
        this.callbacks.onJoinRejected(message.reason);
        // Don't call full disconnect - just clean up without triggering "closed" status
        this.isManualDisconnect = true;
        this.stopHeartbeat();
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
        // Connection is alive
        break;
    }
  }

  sendToHost(message: PlayerMessage) {
    if (this.hostConnection?.open) {
      this.hostConnection.send(message);
    }
  }

  requestRoll(overrideRange?: number) {
    this.sendToHost({ type: "ROLL_REQUEST", overrideRange });
  }

  setRange(maxRange: number) {
    this.sendToHost({ type: "SET_RANGE", maxRange });
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.sendToHost({ type: "HEARTBEAT" });
    }, 5000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
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
      return;
    }

    this.reconnectAttempts++;

    // Calculate exponential backoff delay (1s, 2s, 4s, 8s, 16s)
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 16000);

    console.log(
      `Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`
    );

    this.reconnectTimeout = setTimeout(async () => {
      try {
        // Clean up old connection
        this.stopHeartbeat();
        this.hostConnection?.close();
        this.hostConnection = null;
        this.peer?.destroy();
        this.peer = null;

        // Attempt to reconnect
        this.callbacks.onStatusChange("connecting");
        await this.connect(this.roomCode!, this.playerName!, this.spectator);
      } catch (err) {
        console.error("Reconnection failed:", err);
        // The connect method will trigger another attemptReconnect if needed
      }
    }, delay);
  }

  disconnect() {
    this.isManualDisconnect = true;
    this.stopHeartbeat();

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
    this.reconnectAttempts = 0;
  }
}
