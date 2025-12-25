"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  PlayerPeer,
  ConnectionStatus,
  NetworkQuality,
  ReconnectionState,
} from "@/lib/peer/PlayerPeer";
import { GameState, createInitialGameState } from "@/types/game";
import {
  savePlayerSession,
  loadPlayerSession,
  clearPlayerSession,
  SavedPlayerSession,
  saveActiveGameSession,
  loadActiveGameSession,
  clearActiveGameSession,
} from "@/lib/storage";
import { roomCodeSchema, playerNameSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";
import { getPlayerStats } from "@/lib/statistics";

export function usePlayerGame() {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [error, setError] = useState<string | null>(null);
  const [kicked, setKicked] = useState<string | null>(null);
  const [savedSession, setSavedSession] = useState<SavedPlayerSession | null>(null);
  const [isSpectator, setIsSpectator] = useState(false);

  // New reconnection states
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>("excellent");
  const [latency, setLatency] = useState<number>(0);
  const [reconnectionState, setReconnectionState] = useState<ReconnectionState>({
    isReconnecting: false,
    attempt: 0,
    maxAttempts: 10,
  });

  const playerRef = useRef<PlayerPeer | null>(null);

  // Check for saved session on mount
  useEffect(() => {
    const saved = loadPlayerSession();
    if (saved) {
      setSavedSession(saved);
    }

    // Check for active game session (for page refresh scenarios)
    const activeSession = loadActiveGameSession();
    if (activeSession) {
      logger.debug("[Player] Found active session, restoring state", activeSession);
      setGameState(activeSession.lastKnownGameState);
      setPlayerId(activeSession.playerId);
      setIsSpectator(activeSession.isSpectator);
    }

    // Clean up active session on unmount
    return () => {
      // Only clear if we're actually disconnecting
      if (status === "closed") {
        clearActiveGameSession();
      }
    };
  }, [status]);

  const joinRoom = useCallback(async (roomCode: string, playerName: string, spectator: boolean = false, existingPlayerId?: string) => {
    // Validate room code
    const roomCodeValidation = roomCodeSchema.safeParse(roomCode);
    if (!roomCodeValidation.success) {
      setError(roomCodeValidation.error.issues[0]?.message || "Invalid room code");
      setStatus("error");
      return;
    }

    // Validate player name
    const playerNameValidation = playerNameSchema.safeParse(playerName);
    if (!playerNameValidation.success) {
      setError(playerNameValidation.error.issues[0]?.message || "Invalid player name");
      setStatus("error");
      return;
    }

    setError(null);
    setKicked(null);
    setStatus("connecting");
    setIsSpectator(spectator);

    // Use validated values
    const validatedRoomCode = roomCodeValidation.data;
    const validatedPlayerName = playerNameValidation.data;

    // If existingPlayerId provided, we're reconnecting
    if (existingPlayerId) {
      logger.debug("[Player] Reconnecting with existing playerId:", existingPlayerId);
    }

    const player = new PlayerPeer({
      onStatusChange: setStatus,
      onJoinAccepted: (id, state) => {
        setPlayerId(id);
        setGameState(state);
        // Save session info after successful join
        savePlayerSession(validatedRoomCode, validatedPlayerName, id);
        saveActiveGameSession(validatedRoomCode, id, validatedPlayerName, state, spectator);
        setSavedSession(null); // Clear the saved session prompt
      },
      onJoinRejected: (reason) => {
        setError(reason);
        setStatus("error");
      },
      onStateUpdate: (state) => {
        logger.debug("[Player] Received state update, lastRoll:", state.lastRoll, "currentMax:", state.currentMaxRoll);
        setGameState(state);
        // Update active session with latest state
        if (playerId) {
          saveActiveGameSession(validatedRoomCode, playerId, validatedPlayerName, state, spectator);
        }
      },
      onGameOver: () => {
        // Game is now infinite, this is just a round end notification
        // State update will handle everything
      },
      onKicked: (reason) => {
        setKicked(reason);
        setStatus("closed");
        clearPlayerSession(); // Clear session when kicked
        clearActiveGameSession();
      },
      onError: (err) => {
        setError(err.message);
      },
      onReconnectionStateChange: (state) => {
        setReconnectionState(state);
      },
      onNetworkQualityChange: (quality) => {
        setNetworkQuality(quality);
      },
      onLatencyUpdate: (latencyMs) => {
        setLatency(latencyMs);
      },
    });

    playerRef.current = player;

    try {
      await player.connect(validatedRoomCode, validatedPlayerName, spectator, existingPlayerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
      setStatus("error");
    }
  }, [playerId]);

  const requestRoll = useCallback((overrideRange?: number | null, rollTwice?: boolean, nextPlayerOverride?: string | null, skipRoll?: boolean) => {
    playerRef.current?.requestRoll(overrideRange, rollTwice, nextPlayerOverride, skipRoll);
  }, []);

  const setRange = useCallback((maxRange: number) => {
    playerRef.current?.setRange(maxRange);
  }, []);

  const chooseRoll = useCallback((roll: number) => {
    playerRef.current?.chooseRoll(roll);
  }, []);

  const disconnect = useCallback(() => {
    playerRef.current?.disconnect();
    playerRef.current = null;
    setStatus("closed");
    setPlayerId(null);
    setGameState(createInitialGameState());
    clearPlayerSession(); // Clear session on disconnect
    clearActiveGameSession(); // Clear active session
  }, []);

  const manualReconnect = useCallback(() => {
    playerRef.current?.manualReconnect();
  }, []);

  const discardSavedSession = useCallback(() => {
    clearPlayerSession();
    setSavedSession(null);
  }, []);

  const reconnectWithSaved = useCallback(async () => {
    if (!savedSession) return;
    await joinRoom(savedSession.roomCode, savedSession.playerName, false, savedSession.playerId);
  }, [savedSession, joinRoom]);

  const isMyTurn = useCallback(() => {
    if (!playerId || gameState.phase !== "playing") return false;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    return currentPlayer?.id === playerId;
  }, [playerId, gameState]);

  const getMyPlayer = useCallback(() => {
    if (!playerId) return null;
    return gameState.players.find((p) => p.id === playerId) ?? null;
  }, [playerId, gameState]);

  const didIJustLose = useCallback(() => {
    return gameState.lastLoserId === playerId;
  }, [gameState.lastLoserId, playerId]);

  return {
    status,
    playerId,
    gameState,
    error,
    kicked,
    savedSession,
    isSpectator,
    networkQuality,
    latency,
    reconnectionState,
    joinRoom,
    requestRoll,
    setRange,
    chooseRoll,
    disconnect,
    manualReconnect,
    reconnectWithSaved,
    discardSavedSession,
    isMyTurn,
    getMyPlayer,
    didIJustLose,
  };
}
