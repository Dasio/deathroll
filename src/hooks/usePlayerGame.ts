"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { PlayerPeer, ConnectionStatus } from "@/lib/peer/PlayerPeer";
import { GameState, createInitialGameState } from "@/types/game";
import {
  savePlayerSession,
  loadPlayerSession,
  clearPlayerSession,
  SavedPlayerSession,
} from "@/lib/storage";

export function usePlayerGame() {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [error, setError] = useState<string | null>(null);
  const [kicked, setKicked] = useState<string | null>(null);
  const [savedSession, setSavedSession] = useState<SavedPlayerSession | null>(null);
  const [isSpectator, setIsSpectator] = useState(false);

  const playerRef = useRef<PlayerPeer | null>(null);

  // Check for saved session on mount
  useEffect(() => {
    const saved = loadPlayerSession();
    if (saved) {
      setSavedSession(saved);
    }
  }, []);

  const joinRoom = useCallback(async (roomCode: string, playerName: string, spectator: boolean = false) => {
    setError(null);
    setKicked(null);
    setStatus("connecting");
    setIsSpectator(spectator);

    const player = new PlayerPeer({
      onStatusChange: setStatus,
      onJoinAccepted: (id, state) => {
        setPlayerId(id);
        setGameState(state);
        // Save session info after successful join
        savePlayerSession(roomCode, playerName, id);
        setSavedSession(null); // Clear the saved session prompt
      },
      onJoinRejected: (reason) => {
        setError(reason);
        setStatus("error");
      },
      onStateUpdate: (state) => {
        console.log("[Player] Received state update, lastRoll:", state.lastRoll, "currentMax:", state.currentMaxRoll);
        setGameState(state);
      },
      onGameOver: () => {
        // Game is now infinite, this is just a round end notification
        // State update will handle everything
      },
      onKicked: (reason) => {
        setKicked(reason);
        setStatus("closed");
        clearPlayerSession(); // Clear session when kicked
      },
      onError: (err) => {
        setError(err.message);
      },
    });

    playerRef.current = player;

    try {
      await player.connect(roomCode, playerName, spectator);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
      setStatus("error");
    }
  }, []);

  const requestRoll = useCallback((overrideRange?: number) => {
    playerRef.current?.requestRoll(overrideRange);
  }, []);

  const setRange = useCallback((maxRange: number) => {
    playerRef.current?.setRange(maxRange);
  }, []);

  const disconnect = useCallback(() => {
    playerRef.current?.disconnect();
    playerRef.current = null;
    setStatus("closed");
    setPlayerId(null);
    setGameState(createInitialGameState());
    clearPlayerSession(); // Clear session on disconnect
  }, []);

  const discardSavedSession = useCallback(() => {
    clearPlayerSession();
    setSavedSession(null);
  }, []);

  const reconnectWithSaved = useCallback(async () => {
    if (!savedSession) return;
    await joinRoom(savedSession.roomCode, savedSession.playerName);
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
    joinRoom,
    requestRoll,
    setRange,
    disconnect,
    reconnectWithSaved,
    discardSavedSession,
    isMyTurn,
    getMyPlayer,
    didIJustLose,
  };
}
