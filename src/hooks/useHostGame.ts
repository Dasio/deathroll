"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { HostPeer, ConnectionStatus } from "@/lib/peer/HostPeer";
import { generateRoomCode } from "@/lib/game/roomCode";
import {
  GameState,
  Player,
  createInitialGameState,
} from "@/types/game";
import {
  addPlayer,
  removePlayer,
  setPlayerConnected,
  reconnectPlayer,
  findDisconnectedPlayerByName,
  startGame,
  processRoll,
  resetGame,
  isPlayerTurn,
  createTeam,
  removeTeam,
  assignPlayerToTeam,
  setTeamMode,
} from "@/lib/game/gameLogic";
import { PlayerMessage } from "@/types/messages";
import {
  saveHostState,
  loadHostState,
  clearHostState,
  SavedHostState,
} from "@/lib/storage";
import { assignAvatar } from "@/lib/avatars";
import { playerNameSchema } from "@/lib/validation";
import { trackRoll, trackGameEnd, calculateDeficitOvercome } from "@/lib/statistics";

export function useHostGame() {
  // Track game start time for duration calculation
  const gameStartTimeRef = useRef<number | null>(null);
  const roundStartTimeRef = useRef<number | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [error, setError] = useState<string | null>(null);
  const [savedState, setSavedState] = useState<SavedHostState | null>(null);

  const hostRef = useRef<HostPeer | null>(null);
  const gameStateRef = useRef<GameState>(gameState);

  // Check for saved state on mount
  useEffect(() => {
    const saved = loadHostState();
    if (saved) {
      setSavedState(saved);
    }
  }, []);

  // Keep ref in sync with state
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Save game state to localStorage whenever it changes (if we have a room)
  useEffect(() => {
    if (roomCode && status === "open") {
      saveHostState(roomCode, gameState);
    }
  }, [gameState, roomCode, status]);

  const broadcastState = useCallback((state: GameState) => {
    hostRef.current?.broadcastState(state);
  }, []);

  const updateState = useCallback(
    (updater: (state: GameState) => GameState) => {
      setGameState((prev) => {
        const newState = updater(prev);
        broadcastState(newState);
        return newState;
      });
    },
    [broadcastState]
  );

  const createRoom = useCallback(async () => {
    const code = generateRoomCode();
    setRoomCode(code);
    setError(null);
    setStatus("connecting");

    const host = new HostPeer(code, {
      onStatusChange: setStatus,
      onPlayerReconnect: (peerId, name, accept, reject) => {
        const currentState = gameStateRef.current;

        // Look for a disconnected player with this name
        const disconnectedPlayer = findDisconnectedPlayerByName(currentState, name);

        if (disconnectedPlayer) {
          // This is a reconnection
          accept(disconnectedPlayer.id);

          setGameState((prev) => {
            const newState = reconnectPlayer(prev, disconnectedPlayer.id, peerId);
            host.reconnectPlayer(peerId, disconnectedPlayer.id, newState);
            host.broadcastState(newState);
            return newState;
          });
        } else {
          // Not a reconnection, proceed as new join
          reject("Not a reconnection");
        }
      },
      onPlayerJoinRequest: (peerId, name, spectator, accept, reject) => {
        // Validate player name
        const nameValidation = playerNameSchema.safeParse(name);
        if (!nameValidation.success) {
          reject(nameValidation.error.issues[0]?.message || "Invalid player name");
          return;
        }

        const playerId = `remote-${peerId}`;

        // Atomic duplicate check and add using functional state update
        setGameState((prev) => {
          // Re-check for duplicates with the most current state
          if (prev.players.some((p) => p.name === name && p.isConnected)) {
            // Duplicate found - reject
            reject("Name already taken");
            return prev; // Don't change state
          }

          // No duplicate - accept and add the player
          accept();

          const avatar = assignAvatar(prev.players);
          const player: Player = {
            id: playerId,
            name,
            isLocal: false,
            isConnected: true,
            connectionId: peerId,
            losses: 0,
            isSpectator: spectator,
            color: avatar.color,
            emoji: avatar.emoji,
          };

          const newState = addPlayer(prev, player);
          host.acceptPlayer(peerId, playerId, newState);
          host.broadcastState(newState);
          return newState;
        });
      },
      onPlayerDisconnect: (peerId) => {
        setGameState((prev) => {
          const player = prev.players.find((p) => p.connectionId === peerId);
          if (!player) return prev;

          const newState = setPlayerConnected(prev, player.id, false);
          host.broadcastState(newState);
          return newState;
        });
      },
      onPlayerMessage: (peerId, message) => {
        handlePlayerMessage(peerId, message);
      },
      onError: (err) => {
        setError(err.message);
      },
    });

    hostRef.current = host;

    try {
      await host.connect();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
      setRoomCode(null);
    }
  }, []);

  const handlePlayerMessage = useCallback((peerId: string, message: PlayerMessage) => {
    const host = hostRef.current;
    if (!host) return;

    switch (message.type) {
      case "ROLL_REQUEST": {
        let currentState = gameStateRef.current;
        const player = currentState.players.find((p) => p.connectionId === peerId);
        if (!player) break;
        if (!isPlayerTurn(currentState, player.id)) break;

        // Apply range override if provided
        if (message.overrideRange != null && currentState.currentMaxRoll === currentState.initialMaxRoll) {
          currentState = { ...currentState, currentMaxRoll: message.overrideRange };
        }

        const newState = processRoll(currentState, player.id);

        // Track roll in statistics
        if (newState.lastRoll !== null && newState.lastMaxRoll !== null) {
          trackRoll(player.id, newState.lastRoll, newState.lastMaxRoll);
        }

        // Track game end if someone lost (rolled a 1)
        if (newState.lastLoserId) {
          const loser = newState.players.find((p) => p.id === newState.lastLoserId);
          const activePlayers = newState.players.filter((p) => !p.isSpectator);

          if (loser && roundStartTimeRef.current) {
            const duration = Date.now() - roundStartTimeRef.current;
            const rollCount = newState.rollHistory.filter(
              (r) => r.timestamp >= roundStartTimeRef.current!
            ).length;

            // Calculate deficit overcome (for comeback tracking)
            const otherPlayersLosses = activePlayers
              .filter((p) => p.id !== loser.id)
              .map((p) => p.losses);
            const minOtherLosses = otherPlayersLosses.length > 0 ? Math.min(...otherPlayersLosses) : 0;
            const deficitOvercome = calculateDeficitOvercome(loser.losses - 1, minOtherLosses);

            // Track loss for this player
            trackGameEnd({
              playerId: loser.id,
              playerName: loser.name,
              won: false,
              rollCount,
              duration,
              timestamp: Date.now(),
            });

            // Track wins for other players
            activePlayers
              .filter((p) => p.id !== loser.id)
              .forEach((p) => {
                trackGameEnd({
                  playerId: p.id,
                  playerName: p.name,
                  won: true,
                  rollCount,
                  duration,
                  deficitOvercome: p.id === player.id ? deficitOvercome : 0,
                  timestamp: Date.now(),
                });
              });

            // Reset round start time for next round
            roundStartTimeRef.current = Date.now();
          }
        }

        setGameState(newState);
        host.broadcastState(newState);
        break;
      }

      case "SET_RANGE": {
        const currentState = gameStateRef.current;
        // Can only set range when at initial value (start of round)
        if (currentState.currentMaxRoll !== currentState.initialMaxRoll) break;
        const player = currentState.players.find((p) => p.connectionId === peerId);
        if (!player) break;
        if (!isPlayerTurn(currentState, player.id)) break;

        const newState = { ...currentState, currentMaxRoll: message.maxRange };
        console.log("[Host] Remote set range:", message.maxRange);
        setGameState(newState);
        host.broadcastState(newState);
        break;
      }
    }
  }, []);

  const addLocalPlayer = useCallback((name: string) => {
    // Validate player name
    const nameValidation = playerNameSchema.safeParse(name);
    if (!nameValidation.success) {
      setError(nameValidation.error.issues[0]?.message || "Invalid player name");
      return;
    }

    // Check for duplicate names
    if (gameStateRef.current.players.some((p) => p.name === name)) {
      setError("Name already taken");
      return;
    }

    // Clear any previous errors
    setError(null);

    const playerId = `local-${Date.now()}`;
    setGameState((prev) => {
      const avatar = assignAvatar(prev.players);
      const player: Player = {
        id: playerId,
        name,
        isLocal: true,
        isConnected: true,
        losses: 0,
        isSpectator: false,
        color: avatar.color,
        emoji: avatar.emoji,
      };
      const newState = addPlayer(prev, player);
      hostRef.current?.broadcastState(newState);
      return newState;
    });
  }, []);

  const removeLocalPlayer = useCallback((playerId: string) => {
    updateState((prev) => removePlayer(prev, playerId));
  }, [updateState]);

  const handleStartGame = useCallback((initialRange: number = 100) => {
    gameStartTimeRef.current = Date.now();
    roundStartTimeRef.current = Date.now();
    updateState((prev) => startGame(prev, initialRange));
  }, [updateState]);

  const handleLocalRoll = useCallback((playerId: string, overrideRange?: number | null) => {
    let currentState = gameStateRef.current;
    if (!isPlayerTurn(currentState, playerId)) return;

    // Apply range override if provided (for combined set-range-and-roll)
    if (overrideRange != null && currentState.currentMaxRoll === currentState.initialMaxRoll) {
      currentState = { ...currentState, currentMaxRoll: overrideRange };
    }

    const newState = processRoll(currentState, playerId);

    // Track roll in statistics
    if (newState.lastRoll !== null && newState.lastMaxRoll !== null) {
      trackRoll(playerId, newState.lastRoll, newState.lastMaxRoll);
    }

    // Track game end if someone lost (rolled a 1)
    if (newState.lastLoserId) {
      const player = newState.players.find((p) => p.id === newState.lastLoserId);
      const activePlayers = newState.players.filter((p) => !p.isSpectator);

      if (player && roundStartTimeRef.current) {
        const duration = Date.now() - roundStartTimeRef.current;
        const rollCount = newState.rollHistory.filter(
          (r) => r.timestamp >= roundStartTimeRef.current!
        ).length;

        // Calculate deficit overcome (for comeback tracking)
        const otherPlayersLosses = activePlayers
          .filter((p) => p.id !== player.id)
          .map((p) => p.losses);
        const minOtherLosses = otherPlayersLosses.length > 0 ? Math.min(...otherPlayersLosses) : 0;
        const deficitOvercome = calculateDeficitOvercome(player.losses - 1, minOtherLosses);

        // Track loss for this player
        trackGameEnd({
          playerId: player.id,
          playerName: player.name,
          won: false,
          rollCount,
          duration,
          timestamp: Date.now(),
        });

        // Track wins for other players
        activePlayers
          .filter((p) => p.id !== player.id)
          .forEach((p) => {
            trackGameEnd({
              playerId: p.id,
              playerName: p.name,
              won: true,
              rollCount,
              duration,
              deficitOvercome: p.id === playerId ? deficitOvercome : 0,
              timestamp: Date.now(),
            });
          });

        // Reset round start time for next round
        roundStartTimeRef.current = Date.now();
      }
    }

    setGameState(newState);
    hostRef.current?.broadcastState(newState);
  }, []);

  const handleSetRange = useCallback((range: number) => {
    updateState((prev) => {
      // Can only set range when at initial value (start of round)
      if (prev.currentMaxRoll !== prev.initialMaxRoll) return prev;
      return { ...prev, currentMaxRoll: range };
    });
  }, [updateState]);

  const handleResetGame = useCallback(() => {
    updateState((prev) => resetGame(prev));
  }, [updateState]);

  const kickPlayer = useCallback((playerId: string, reason: string = "Kicked by host") => {
    const host = hostRef.current;
    if (!host) return;

    setGameState((prev) => {
      const player = prev.players.find((p) => p.id === playerId);
      if (!player || player.isLocal) return prev; // Can't kick local players this way

      // Send kick message to the player
      if (player.connectionId) {
        host.kickPlayer(player.connectionId, reason);
      }

      // Remove from game state
      const newState = removePlayer(prev, playerId);
      host.broadcastState(newState);
      return newState;
    });
  }, []);

  const disconnect = useCallback(() => {
    hostRef.current?.disconnect();
    hostRef.current = null;
    setRoomCode(null);
    setStatus("closed");
    setGameState(createInitialGameState());
  }, []);

  const endGame = useCallback(() => {
    disconnect();
    clearHostState();
  }, [disconnect]);

  const restoreSavedState = useCallback(async () => {
    if (!savedState) return;

    setRoomCode(savedState.roomCode);
    setGameState(savedState.gameState);
    setError(null);
    setStatus("connecting");

    const host = new HostPeer(savedState.roomCode, {
      onStatusChange: setStatus,
      onPlayerReconnect: (peerId, name, accept, reject) => {
        const currentState = gameStateRef.current;

        // Look for a disconnected player with this name
        const disconnectedPlayer = findDisconnectedPlayerByName(currentState, name);

        if (disconnectedPlayer) {
          // This is a reconnection
          accept(disconnectedPlayer.id);

          setGameState((prev) => {
            const newState = reconnectPlayer(prev, disconnectedPlayer.id, peerId);
            host.reconnectPlayer(peerId, disconnectedPlayer.id, newState);
            host.broadcastState(newState);
            return newState;
          });
        } else {
          // Not a reconnection, proceed as new join
          reject("Not a reconnection");
        }
      },
      onPlayerJoinRequest: (peerId, name, spectator, accept, reject) => {
        // Validate player name
        const nameValidation = playerNameSchema.safeParse(name);
        if (!nameValidation.success) {
          reject(nameValidation.error.issues[0]?.message || "Invalid player name");
          return;
        }

        const playerId = `remote-${peerId}`;

        // Atomic duplicate check and add using functional state update
        setGameState((prev) => {
          // Re-check for duplicates with the most current state
          if (prev.players.some((p) => p.name === name && p.isConnected)) {
            // Duplicate found - reject
            reject("Name already taken");
            return prev; // Don't change state
          }

          // No duplicate - accept and add the player
          accept();

          const avatar = assignAvatar(prev.players);
          const player: Player = {
            id: playerId,
            name,
            isLocal: false,
            isConnected: true,
            connectionId: peerId,
            losses: 0,
            isSpectator: spectator,
            color: avatar.color,
            emoji: avatar.emoji,
          };

          const newState = addPlayer(prev, player);
          host.acceptPlayer(peerId, playerId, newState);
          host.broadcastState(newState);
          return newState;
        });
      },
      onPlayerDisconnect: (peerId) => {
        setGameState((prev) => {
          const player = prev.players.find((p) => p.connectionId === peerId);
          if (!player) return prev;

          const newState = setPlayerConnected(prev, player.id, false);
          host.broadcastState(newState);
          return newState;
        });
      },
      onPlayerMessage: (peerId, message) => {
        handlePlayerMessage(peerId, message);
      },
      onError: (err) => {
        setError(err.message);
      },
    });

    hostRef.current = host;

    try {
      await host.connect();
      setSavedState(null); // Clear prompt after successful restore
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore room");
      setRoomCode(null);
    }
  }, [savedState, handlePlayerMessage]);

  const discardSavedState = useCallback(() => {
    clearHostState();
    setSavedState(null);
  }, []);

  const handleCreateTeam = useCallback((name: string, color: string) => {
    updateState((prev) => createTeam(prev, name, color));
  }, [updateState]);

  const handleRemoveTeam = useCallback((teamId: string) => {
    updateState((prev) => removeTeam(prev, teamId));
  }, [updateState]);

  const handleAssignPlayerToTeam = useCallback((playerId: string, teamId: string | undefined) => {
    updateState((prev) => assignPlayerToTeam(prev, playerId, teamId));
  }, [updateState]);

  const handleSetTeamMode = useCallback((enabled: boolean) => {
    updateState((prev) => setTeamMode(prev, enabled));
  }, [updateState]);

  return {
    roomCode,
    status,
    gameState,
    error,
    savedState,
    createRoom,
    addLocalPlayer,
    removeLocalPlayer,
    kickPlayer,
    startGame: handleStartGame,
    localRoll: handleLocalRoll,
    setRange: handleSetRange,
    resetGame: handleResetGame,
    disconnect,
    endGame,
    restoreSavedState,
    discardSavedState,
    createTeam: handleCreateTeam,
    removeTeam: handleRemoveTeam,
    assignPlayerToTeam: handleAssignPlayerToTeam,
    setTeamMode: handleSetTeamMode,
  };
}
