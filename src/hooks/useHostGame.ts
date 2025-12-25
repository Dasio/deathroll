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
  initiateRoll,
  completeRoll,
  calculateAnimationDuration,
  resetGame,
  isPlayerTurn,
  createTeam,
  removeTeam,
  assignPlayerToTeam,
  setTeamMode,
  setExtraVisualEffects,
  setCoinsEnabled,
  setInitialCoins,
  skipDisconnectedPlayer,
  activateRollTwice,
  setNextPlayerOverride,
  activateSkipRoll,
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
import { logger } from "@/lib/logger";
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
      onPlayerReconnect: (peerId, name, playerId, accept, reject) => {
        const currentState = gameStateRef.current;

        // Look for existing player by ID (even if still marked connected - could be stale)
        let existingPlayer = playerId
          ? currentState.players.find((p) => p.id === playerId && !p.isLocal)
          : null;

        // If not found by ID, look for disconnected player by name
        if (!existingPlayer) {
          existingPlayer = findDisconnectedPlayerByName(currentState, name);
        }

        // Also check for connected player with same name (might be stale connection)
        if (!existingPlayer) {
          existingPlayer = currentState.players.find(
            (p) => p.name === name && !p.isLocal && p.isConnected
          );
          if (existingPlayer) {
            logger.debug("[Host] Found stale connection for player:", name, "- will reconnect");
          }
        }

        if (existingPlayer) {
          logger.debug("[Host] Reconnecting player:", existingPlayer.name, existingPlayer.id);
          // This is a reconnection
          accept(existingPlayer.id);

          setGameState((prev) => {
            // Force disconnect old connection and reconnect with new peerId
            let newState = setPlayerConnected(prev, existingPlayer!.id, false);
            newState = reconnectPlayer(newState, existingPlayer!.id, peerId);
            host.reconnectPlayer(peerId, existingPlayer!.id, newState);
            host.broadcastState(newState);
            return newState;
          });
        } else {
          logger.debug("[Host] No existing player found for reconnection:", name, playerId);
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
            coins: prev.initialCoins,
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

          // Mark player as disconnected
          let newState = setPlayerConnected(prev, player.id, false);

          // Skip to next player if the disconnected player was current
          newState = skipDisconnectedPlayer(newState);

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

        // Prevent rolling while previous roll is still animating
        if (currentState.isRolling) {
          break;
        }

        // Handle skip roll (takes priority over normal roll)
        if (message.skipRoll) {
          const newState = activateSkipRoll(currentState, player.id);
          if (newState) {
            console.log("[Host] Player skipped roll:", player.name);
            setGameState(newState);
            host.broadcastState(newState);
          }
          break;
        }

        // Apply coin abilities if requested (spend coins atomically with roll)
        if (message.rollTwice) {
          const newState = activateRollTwice(currentState, player.id);
          if (newState) {
            currentState = newState;
          }
        }

        if (message.nextPlayerOverride) {
          const newState = setNextPlayerOverride(currentState, player.id, message.nextPlayerOverride);
          if (newState) {
            currentState = newState;
            console.log("[Host] Player set next player override with roll:", player.name, "->", message.nextPlayerOverride);
          }
        }

        // Apply range override if provided
        if (message.overrideRange != null && currentState.currentMaxRoll === currentState.initialMaxRoll) {
          currentState = { ...currentState, currentMaxRoll: message.overrideRange };
        }

        // Phase 1: Initiate roll (starts animation)
        const { state: stateWithRoll, rollResult, rollTwiceResults } = initiateRoll(currentState, player.id);
        setGameState(stateWithRoll);
        host.broadcastState(stateWithRoll);

        // Track roll in statistics (using rollResult, not stateWithRoll.lastRoll which is null in Phase 1)
        if (rollResult !== null && stateWithRoll.lastMaxRoll !== null) {
          trackRoll(player.id, rollResult, stateWithRoll.lastMaxRoll);
        }

        // Calculate animation duration and delay Phase 2
        const animationDuration = calculateAnimationDuration(
          stateWithRoll.lastMaxRoll ?? stateWithRoll.currentMaxRoll,
          stateWithRoll.extraVisualEffects
        );

        setTimeout(() => {
          try {
            // If roll-twice is active, DON'T auto-complete - wait for player to choose
            if (rollTwiceResults) {
              // Just end the animation, but don't complete the roll yet
              const stateAfterAnimation = {
                ...gameStateRef.current,
                isRolling: false, // Animation complete, show the picker
                rollTwiceResults: rollTwiceResults, // Explicitly preserve the roll options
              };
              setGameState(stateAfterAnimation);
              host.broadcastState(stateAfterAnimation);
              return;
            }

            // Phase 2: Complete roll (applies consequences)
            const finalState = completeRoll(gameStateRef.current, player.id, rollResult!);

            // Track game end if someone lost (rolled a 1)
            if (finalState.lastLoserId) {
            const loser = finalState.players.find((p) => p.id === finalState.lastLoserId);
            const activePlayers = finalState.players.filter((p) => !p.isSpectator);

            if (loser && roundStartTimeRef.current) {
              const duration = Date.now() - roundStartTimeRef.current;
              const rollCount = finalState.rollHistory.filter(
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

            setGameState(finalState);
            host.broadcastState(finalState);

            // Failsafe: After a small delay, broadcast again to ensure sync
            // This helps if any client's animation got stuck
            setTimeout(() => {
              host.broadcastState(gameStateRef.current);
            }, 200);
          } catch (error) {
            console.error('[Host] Phase 2 failed:', error);
            // On error, try to recover by broadcasting current state
            host.broadcastState(gameStateRef.current);
          }
        }, animationDuration);

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


      case "CHOOSE_ROLL": {
        const currentState = gameStateRef.current;
        const player = currentState.players.find((p) => p.connectionId === peerId);
        if (!player) break;
        if (!isPlayerTurn(currentState, player.id)) break;
        if (currentState.rollTwicePlayerId !== player.id) break;
        if (!currentState.rollTwiceResults) break;

        // Validate chosen roll is one of the available options
        if (!currentState.rollTwiceResults.includes(message.chosenRoll)) break;

        console.log("[Host] Player chose roll:", player.name, message.chosenRoll);

        // Complete the roll with the chosen result
        const newState = completeRoll(currentState, player.id, message.chosenRoll);
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
        coins: prev.initialCoins,
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

  const handleLocalRoll = useCallback((playerId: string, overrideRange?: number | null, rollTwice?: boolean, nextPlayerOverride?: string | null, skipRoll?: boolean) => {
    const host = hostRef.current;
    if (!host) return;

    let currentState = gameStateRef.current;
    if (!isPlayerTurn(currentState, playerId)) return;

    // Prevent rolling while previous roll is still animating
    if (currentState.isRolling) {
      return;
    }

    // Handle skip roll (takes priority over normal roll)
    if (skipRoll) {
      const newState = activateSkipRoll(currentState, playerId);
      if (newState) {
        console.log("[Host] Local player skipped roll");
        setGameState(newState);
        host.broadcastState(newState);
      }
      return;
    }

    // Apply coin abilities if requested (spend coins atomically with roll)
    if (rollTwice) {
      const newState = activateRollTwice(currentState, playerId);
      if (newState) {
        currentState = newState;
        console.log("[Host] Local player activated roll-twice with roll");
      }
    }

    if (nextPlayerOverride) {
      const newState = setNextPlayerOverride(currentState, playerId, nextPlayerOverride);
      if (newState) {
        currentState = newState;
        console.log("[Host] Local player set next player override with roll:", nextPlayerOverride);
      }
    }

    // Apply range override if provided (for combined set-range-and-roll)
    if (overrideRange != null && currentState.currentMaxRoll === currentState.initialMaxRoll) {
      currentState = { ...currentState, currentMaxRoll: overrideRange };
    }

    // Phase 1: Initiate roll (starts animation)
    const { state: stateWithRoll, rollResult, rollTwiceResults } = initiateRoll(currentState, playerId);
    setGameState(stateWithRoll);
    host.broadcastState(stateWithRoll);

    // Track roll in statistics (using rollResult, not stateWithRoll.lastRoll which is null in Phase 1)
    if (rollResult !== null && stateWithRoll.lastMaxRoll !== null) {
      trackRoll(playerId, rollResult, stateWithRoll.lastMaxRoll);
    }

    // Calculate animation duration and delay Phase 2
    const animationDuration = calculateAnimationDuration(
      stateWithRoll.lastMaxRoll ?? stateWithRoll.currentMaxRoll,
      stateWithRoll.extraVisualEffects
    );

    setTimeout(() => {
      try {
        // If roll-twice is active, DON'T auto-complete - wait for player to choose
        if (rollTwiceResults) {
          // Just end the animation, but don't complete the roll yet
          const stateAfterAnimation = {
            ...gameStateRef.current,
            isRolling: false, // Animation complete, show the picker
            rollTwiceResults: rollTwiceResults, // Explicitly preserve the roll options
          };
          setGameState(stateAfterAnimation);
          host.broadcastState(stateAfterAnimation);
          return;
        }

        // Phase 2: Complete roll (applies consequences)
        const finalState = completeRoll(gameStateRef.current, playerId, rollResult!);

        // Track game end if someone lost (rolled a 1)
        if (finalState.lastLoserId) {
        const player = finalState.players.find((p) => p.id === finalState.lastLoserId);
        const activePlayers = finalState.players.filter((p) => !p.isSpectator);

        if (player && roundStartTimeRef.current) {
          const duration = Date.now() - roundStartTimeRef.current;
          const rollCount = finalState.rollHistory.filter(
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

        setGameState(finalState);
        host.broadcastState(finalState);

        // Failsafe: After a small delay, broadcast again to ensure sync
        setTimeout(() => {
          host.broadcastState(gameStateRef.current);
        }, 200);
      } catch (error) {
        console.error('[Host] Phase 2 failed:', error);
        // On error, try to recover by broadcasting current state
        host.broadcastState(gameStateRef.current);
      }
    }, animationDuration);
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
      onPlayerReconnect: (peerId, name, playerId, accept, reject) => {
        const currentState = gameStateRef.current;

        // Look for existing player by ID (even if still marked connected - could be stale)
        let existingPlayer = playerId
          ? currentState.players.find((p) => p.id === playerId && !p.isLocal)
          : null;

        // If not found by ID, look for disconnected player by name
        if (!existingPlayer) {
          existingPlayer = findDisconnectedPlayerByName(currentState, name);
        }

        // Also check for connected player with same name (might be stale connection)
        if (!existingPlayer) {
          existingPlayer = currentState.players.find(
            (p) => p.name === name && !p.isLocal && p.isConnected
          );
          if (existingPlayer) {
            logger.debug("[Host] Found stale connection for player:", name, "- will reconnect");
          }
        }

        if (existingPlayer) {
          logger.debug("[Host] Reconnecting player:", existingPlayer.name, existingPlayer.id);
          // This is a reconnection
          accept(existingPlayer.id);

          setGameState((prev) => {
            // Force disconnect old connection and reconnect with new peerId
            let newState = setPlayerConnected(prev, existingPlayer!.id, false);
            newState = reconnectPlayer(newState, existingPlayer!.id, peerId);
            host.reconnectPlayer(peerId, existingPlayer!.id, newState);
            host.broadcastState(newState);
            return newState;
          });
        } else {
          logger.debug("[Host] No existing player found for reconnection:", name, playerId);
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
            coins: prev.initialCoins,
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

          // Mark player as disconnected
          let newState = setPlayerConnected(prev, player.id, false);

          // Skip to next player if the disconnected player was current
          newState = skipDisconnectedPlayer(newState);

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

  const handleSetExtraVisualEffects = useCallback((enabled: boolean) => {
    updateState((prev) => setExtraVisualEffects(prev, enabled));
  }, [updateState]);

  const handleSetCoinsEnabled = useCallback((enabled: boolean) => {
    updateState((prev) => setCoinsEnabled(prev, enabled));
  }, [updateState]);

  const handleSetInitialCoins = useCallback((coins: number) => {
    updateState((prev) => setInitialCoins(prev, coins));
  }, [updateState]);


  const handleLocalChooseRoll = useCallback((playerId: string, chosenRoll: number) => {
    const host = hostRef.current;
    if (!host) return;

    const currentState = gameStateRef.current;

    // Validate chosen roll is one of the available options
    if (!currentState.rollTwiceResults?.includes(chosenRoll)) return;

    const newState = completeRoll(currentState, playerId, chosenRoll);
    setGameState(newState);
    host.broadcastState(newState);
  }, []);

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
    setExtraVisualEffects: handleSetExtraVisualEffects,
    setCoinsEnabled: handleSetCoinsEnabled,
    setInitialCoins: handleSetInitialCoins,
    localChooseRoll: handleLocalChooseRoll,
  };
}
