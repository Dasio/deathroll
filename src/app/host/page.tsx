"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useHostGame } from "@/hooks/useHostGame";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { RoomCode } from "@/components/game/RoomCode";
import { PlayerList } from "@/components/game/PlayerList";
import { RollDisplay } from "@/components/game/RollDisplay";
import { RollHistory } from "@/components/game/RollHistory";
import { TeamList } from "@/components/game/TeamList";
import { getCurrentPlayer } from "@/lib/game/gameLogic";
import { initializeSounds } from "@/lib/sounds";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function HostPage() {
  const {
    roomCode,
    status,
    gameState,
    error,
    savedState,
    createRoom,
    addLocalPlayer,
    removeLocalPlayer,
    kickPlayer,
    startGame,
    localRoll,
    setRange,
    resetGame,
    disconnect,
    endGame,
    restoreSavedState,
    discardSavedState,
    createTeam,
    removeTeam,
    assignPlayerToTeam,
    setTeamMode,
    setFinal10Mode,
    setCoinsEnabled,
    setInitialCoins,
    localChooseRoll,
  } = useHostGame();

  const { isSupported: wakeLockSupported, isActive: wakeLockActive, requestWakeLock, releaseWakeLock } = useWakeLock();
  const isMobile = useIsMobile();

  const [newPlayerName, setNewPlayerName] = useState("");
  const [initialRange, setInitialRange] = useState(100);
  const [customRange, setCustomRange] = useState<number | null>(null);
  const [sessionMaxRoll, setSessionMaxRoll] = useState<number | null>(null);
  const [showLoserNotification, setShowLoserNotification] = useState(false);
  const [notificationLoserId, setNotificationLoserId] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  // Team mode state
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#3b82f6");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Coin system UI state
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [localRollTwice, setLocalRollTwice] = useState(false);
  const [localNextPlayerOverride, setLocalNextPlayerOverride] = useState<string | null>(null);

  const [animationComplete, setAnimationComplete] = useState(true);

  // Track when animation starts (use isRolling flag)
  useEffect(() => {
    if (gameState.isRolling) {
      setAnimationComplete(false);
    }
  }, [gameState.isRolling]);

  // Set animation complete when roll-twice picker is shown
  useEffect(() => {
    if (!gameState.isRolling && gameState.rollTwiceResults) {
      setAnimationComplete(true);
    }
  }, [gameState.isRolling, gameState.rollTwiceResults]);

  // Use ref for latest gameState to avoid callback identity changes during animation
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Handle animation completion - show loser notification after dice animation
  // IMPORTANT: No dependencies to keep callback stable during animation!
  const handleAnimationComplete = useCallback(() => {
    setAnimationComplete(true);
    const currentState = gameStateRef.current;
    if (currentState.lastLoserId) {
      setNotificationLoserId(currentState.lastLoserId);
      setShowLoserNotification(true);
    }
  }, []); // Empty deps = stable callback

  // Reset notification when a new roll starts (lastLoserId becomes null)
  useEffect(() => {
    if (!gameState.lastLoserId) {
      setShowLoserNotification(false);
      setNotificationLoserId(null);
    }
  }, [gameState.lastLoserId]);

  // Compute derived state
  const currentPlayer = getCurrentPlayer(gameState);
  const lastLoser = gameState.players.find((p) => p.id === notificationLoserId);
  const canSetRange = gameState.currentMaxRoll === gameState.initialMaxRoll;

  // Keyboard shortcuts for rolling
  useEffect(() => {
    if (gameState.phase !== "playing") return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle space or enter when it's a local player's turn and animation is complete
      if ((e.key === " " || e.key === "Enter") && currentPlayer?.isLocal && !isRolling && animationComplete) {
        e.preventDefault();
        setIsRolling(true);
        initializeSounds();
        const rangeToUse = canSetRange && customRange && customRange !== gameState.currentMaxRoll
          ? customRange
          : undefined;
        // Save the chosen range for the session
        if (rangeToUse) {
          setSessionMaxRoll(rangeToUse);
        }
        localRoll(currentPlayer.id, rangeToUse, localRollTwice, localNextPlayerOverride);
        setCustomRange(null);
        // Clear local coin ability state after rolling
        setLocalRollTwice(false);
        setLocalNextPlayerOverride(null);
        setShowPlayerSelector(false);
        setTimeout(() => setIsRolling(false), 500);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [gameState.phase, currentPlayer, isRolling, animationComplete, canSetRange, customRange, gameState.currentMaxRoll, localRoll, localRollTwice, localNextPlayerOverride]);

  useEffect(() => {
    let mounted = true;
    if (mounted) {
      createRoom();
    }
    return () => {
      mounted = false;
      disconnect();
      releaseWakeLock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Request wake lock when game starts playing
  useEffect(() => {
    if (gameState.phase === "playing" && wakeLockSupported) {
      requestWakeLock();
    }
  }, [gameState.phase, wakeLockSupported, requestWakeLock]);

  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      addLocalPlayer(newPlayerName.trim());
      setNewPlayerName("");
    }
  };

  // Show resume prompt if saved state exists
  if (savedState && !roomCode) {
    const timeAgo = Math.floor((Date.now() - savedState.timestamp) / 1000 / 60);
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">Resume Game?</h2>
            <p className="text-[var(--muted)]">
              Found a saved game from {timeAgo} minute{timeAgo !== 1 ? 's' : ''} ago
            </p>
            <p className="text-[var(--muted)] mt-2">
              Room: {savedState.roomCode} • {savedState.gameState.players.length} player{savedState.gameState.players.length !== 1 ? 's' : ''}
            </p>
            {savedState.gameState.phase === "playing" && (
              <p className="text-[var(--muted)]">
                Round {savedState.gameState.roundNumber}
              </p>
            )}
          </div>
          <div className="space-y-3">
            <Button size="lg" className="w-full" onClick={restoreSavedState}>
              Resume Game
            </Button>
            <Button size="lg" variant="secondary" className="w-full" onClick={() => {
              discardSavedState();
              createRoom();
            }}>
              Start New Game
            </Button>
          </div>
          <div className="mt-4 text-center">
            <Link href="/" className="text-[var(--accent)] hover:underline text-sm">
              &larr; Back to Home
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  // Connecting state
  if (status === "connecting") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="text-center">
          <LoadingSpinner size="lg" />
          <div className="text-xl mt-4">Creating room...</div>
        </Card>
      </main>
    );
  }

  // Error state
  if (status === "error" || error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="text-center">
          <div className="text-[var(--danger)] mb-4">{error || "Connection error"}</div>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </Card>
      </main>
    );
  }

  // Lobby phase
  if (gameState.phase === "lobby") {
    return (
      <>
        <SoundToggle />
        <main className="min-h-screen p-4 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-[var(--accent)] hover:underline">
            &larr; Back
          </Link>
          <h1 className="text-2xl font-bold">Host Game</h1>
          <Link href="/stats" className="text-[var(--accent)] hover:underline text-sm">
            Stats
          </Link>
        </div>

        {roomCode && (
          <Card className="mb-6">
            <RoomCode code={roomCode} playerCount={gameState.players.length} />
          </Card>
        )}

        <Card className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Add Local Player</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Player name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
            />
            <Button onClick={handleAddPlayer} disabled={!newPlayerName.trim()}>
              Add
            </Button>
          </div>
        </Card>

        <Card className="mb-6">
          <h2 className="text-lg font-semibold mb-4">
            Players ({gameState.players.length})
          </h2>
          <PlayerList
            players={gameState.players}
            showCoins={gameState.coinsEnabled}
            onRemove={(id) => {
              const player = gameState.players.find((p) => p.id === id);
              if (player?.isLocal) removeLocalPlayer(id);
            }}
            onKick={(id) => kickPlayer(id)}
          />
        </Card>

        <Card className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Game Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-[var(--muted)]">Starting Range:</label>
              <Input
                type="number"
                min={2}
                value={initialRange}
                onChange={(e) => setInitialRange(Number(e.target.value))}
                className="w-40 text-center"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="teamMode"
                checked={gameState.teamMode}
                onChange={(e) => setTeamMode(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)] bg-[var(--background)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <label htmlFor="teamMode" className="text-[var(--muted)]">
                Team Mode (allow any team combination: 1v2v3, 2v2, etc.)
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="final10Mode"
                checked={gameState.final10Mode}
                onChange={(e) => setFinal10Mode(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)] bg-[var(--background)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <label htmlFor="final10Mode" className="text-[var(--muted)]">
                Final 10 Mode (visual effects when max roll drops below 10)
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="coinsMode"
                checked={gameState.coinsEnabled}
                onChange={(e) => setCoinsEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)] bg-[var(--background)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <label htmlFor="coinsMode" className="text-[var(--muted)]">
                Strategic Coins (spend coins to reroll or choose next player)
              </label>
            </div>

            {gameState.coinsEnabled && (
              <div className="flex items-center gap-4 ml-7">
                <label className="text-[var(--muted)] text-sm">Starting Coins (0-5):</label>
                <Input
                  type="number"
                  min={0}
                  max={5}
                  value={gameState.initialCoins}
                  onChange={(e) => setInitialCoins(Number(e.target.value))}
                  className="w-20 text-center"
                />
                <span className="text-xs text-[var(--muted)]">
                  1 coin = Reroll or Choose Next Player
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Team Setup */}
        {gameState.teamMode && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Team Setup</h2>

            {/* Create Team */}
            <div className="mb-4 p-3 bg-[var(--background)] rounded border border-[var(--border)]">
              <h3 className="text-sm font-semibold mb-2">Create New Team</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Team name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTeamName.trim()) {
                      createTeam(newTeamName.trim(), newTeamColor);
                      setNewTeamName("");
                      setNewTeamColor("#3b82f6");
                    }
                  }}
                  className="flex-1"
                />
                <input
                  type="color"
                  value={newTeamColor}
                  onChange={(e) => setNewTeamColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <Button
                  onClick={() => {
                    if (newTeamName.trim()) {
                      createTeam(newTeamName.trim(), newTeamColor);
                      setNewTeamName("");
                      setNewTeamColor("#3b82f6");
                    }
                  }}
                  disabled={!newTeamName.trim()}
                  size="sm"
                >
                  Create
                </Button>
              </div>
            </div>

            {/* Assign Players to Teams */}
            {gameState.teams.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">Assign Players</h3>
                <p className="text-xs text-[var(--muted)] mb-2">
                  Click on a player, then click on a team to assign them
                </p>

                {/* Unassigned players */}
                <div className="mb-3">
                  <div className="text-xs font-semibold text-[var(--muted)] mb-1">
                    Unassigned Players:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {gameState.players
                      .filter((p) => !p.teamId && !p.isSpectator)
                      .map((player) => (
                        <button
                          key={player.id}
                          onClick={() => setSelectedPlayerId(player.id)}
                          className={`px-3 py-1 rounded text-sm border-2 transition-colors ${
                            selectedPlayerId === player.id
                              ? "border-[var(--accent)] bg-[var(--accent)]/20"
                              : "border-[var(--border)] hover:border-[var(--accent)]/50"
                          }`}
                          style={{ borderLeftColor: player.color, borderLeftWidth: "4px" }}
                        >
                          {player.emoji} {player.name}
                        </button>
                      ))}
                    {gameState.players.filter((p) => !p.teamId && !p.isSpectator).length === 0 && (
                      <span className="text-xs text-[var(--muted)] italic">
                        All players assigned
                      </span>
                    )}
                  </div>
                </div>

                {/* Teams */}
                <div className="space-y-2">
                  {gameState.teams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => {
                        if (selectedPlayerId) {
                          assignPlayerToTeam(selectedPlayerId, team.id);
                          setSelectedPlayerId(null);
                        }
                      }}
                      disabled={!selectedPlayerId}
                      className={`w-full p-3 rounded border-2 text-left transition-colors ${
                        selectedPlayerId
                          ? "border-[var(--accent)] hover:bg-[var(--accent)]/10 cursor-pointer"
                          : "border-[var(--border)] cursor-default"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: team.color }}
                          />
                          <span className="font-semibold">{team.name}</span>
                          <span className="text-xs text-[var(--muted)]">
                            ({gameState.players.filter((p) => p.teamId === team.id).length}{" "}
                            players)
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTeam(team.id);
                          }}
                          className="text-xs text-[var(--danger)] hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Team Preview */}
            {gameState.teams.length > 0 && (
              <TeamList
                teams={gameState.teams}
                players={gameState.players}
                onRemoveTeam={removeTeam}
                onUnassignPlayer={(playerId) => assignPlayerToTeam(playerId, undefined)}
              />
            )}
          </Card>
        )}

        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            initializeSounds();
            setSessionMaxRoll(initialRange);
            startGame(initialRange);
          }}
          disabled={gameState.players.length < 1}
        >
          Start Game ({gameState.players.length} player
          {gameState.players.length !== 1 ? "s" : ""})
        </Button>
      </main>
      </>
    );
  }

  // Playing phase (infinite game)
  const currentIsLocal = currentPlayer?.isLocal ?? false;

  return (
    <>
      <SoundToggle />
      <main className="min-h-screen p-4 max-w-2xl mx-auto">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">DeathRoll</h1>
        <div className="flex justify-center gap-4 text-sm text-[var(--muted)]">
          {roomCode && <span>Room: {roomCode}</span>}
          <span>Round {gameState.roundNumber}</span>
        </div>
      </div>

      {/* Show who just lost - only after animation completes */}
      {showLoserNotification && lastLoser && (
        <Card className="mb-4 bg-[var(--danger)]/10 border-[var(--danger)]">
          <div className="text-center">
            <span className="text-[var(--danger)] font-bold">
              💀 {lastLoser.name} rolled a 1! (Total losses: {lastLoser.losses})
            </span>
          </div>
        </Card>
      )}

      <Card className="mb-6">
        {!gameState.rollTwiceResults || gameState.isRolling ? (
          <RollDisplay
            currentMax={gameState.currentMaxRoll}
            lastRoll={gameState.lastRoll}
            lastMaxRoll={gameState.lastMaxRoll}
            isRolling={gameState.isRolling}
            final10Mode={gameState.final10Mode}
            onAnimationComplete={handleAnimationComplete}
          />
        ) : (
          <div className="text-center py-8">
            <div className="text-2xl font-bold mb-2">🎲🎲 Pick Your Roll</div>
            <div className="text-[var(--muted)]">Choose which result you want to keep</div>
          </div>
        )}

        {currentPlayer && (
          <div className="text-center mt-4">
            <div className="text-lg text-[var(--muted)] mb-4">
              {currentPlayer.name}&apos;s turn
              {canSetRange && !gameState.rollTwiceResults && " - Choose starting range"}
            </div>

            {/* Range selector at start of round for local players */}
            {currentIsLocal && canSetRange && !gameState.rollTwiceResults && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <Input
                  type="number"
                  min={2}
                  value={customRange ?? sessionMaxRoll ?? gameState.currentMaxRoll}
                  onChange={(e) => setCustomRange(Number(e.target.value))}
                  className="w-40 text-center"
                />
              </div>
            )}

            {/* Roll Picker UI for local players with roll-twice active */}
            {currentIsLocal && !gameState.isRolling && gameState.rollTwiceResults && gameState.rollTwicePlayerId === currentPlayer?.id && (
              <div className="mb-4 p-4 bg-[var(--accent)]/10 rounded border">
                <div className="text-sm font-semibold mb-3 text-center">
                  Pick your roll:
                </div>
                <div className="flex gap-3 justify-center">
                  {gameState.rollTwiceResults.map((roll, index) => (
                    <Button
                      key={index}
                      size="lg"
                      onClick={() => localChooseRoll(currentPlayer.id, roll)}
                      className="px-8 py-6 text-2xl font-bold"
                    >
                      {roll.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Coin ability buttons for local players */}
            {currentIsLocal && gameState.coinsEnabled && currentPlayer && !gameState.rollTwiceResults && (
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex gap-2 justify-center flex-wrap">
                  {/* Choose Next Player Button - only show with 3+ players */}
                  {(() => {
                    const activePlayers = gameState.players.filter((p) => !p.isSpectator && p.isConnected);
                    if (activePlayers.length <= 2) return null; // Hide with 2 or fewer players

                    const myPlayer = gameState.players.find((p) => p.id === currentPlayer.id);
                    const canAfford = myPlayer && myPlayer.coins >= 1;
                    const isActive = localNextPlayerOverride !== null;

                    return (
                      <Button
                        variant={isActive ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => {
                          if (isActive) {
                            // Cancel
                            setLocalNextPlayerOverride(null);
                            setShowPlayerSelector(false);
                          } else {
                            // Show selector
                            setShowPlayerSelector(!showPlayerSelector);
                          }
                        }}
                        disabled={!isActive && !canAfford}
                      >
                        {isActive ? "✓ Next Player Set (click to cancel)" : `🎯 Choose Next (1 🪙)`}
                      </Button>
                    );
                  })()}

                  {/* Roll Twice Button */}
                  {(() => {
                    const myPlayer = gameState.players.find((p) => p.id === currentPlayer.id);
                    const canAfford = myPlayer && myPlayer.coins >= 1;

                    return (
                      <Button
                        variant={localRollTwice ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => setLocalRollTwice(!localRollTwice)}
                        disabled={!localRollTwice && !canAfford}
                      >
                        {localRollTwice ? "✓ Roll Twice (click to cancel)" : `🎲 Roll Twice (1 🪙)`}
                      </Button>
                    );
                  })()}
                </div>

                {/* Player Selector */}
                {showPlayerSelector && (
                  <div className="p-3 bg-[var(--background)] rounded border">
                    <div className="text-sm font-semibold mb-2">Choose who goes next:</div>
                    <div className="grid grid-cols-2 gap-2">
                      {gameState.players
                        .filter((p) => p.id !== currentPlayer.id && !p.isSpectator && p.isConnected)
                        .map((player) => (
                          <Button
                            key={player.id}
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setLocalNextPlayerOverride(player.id);
                              setShowPlayerSelector(false);
                            }}
                          >
                            {player.emoji} {player.name}
                          </Button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentIsLocal && !gameState.rollTwiceResults && (
              <>
                <Button
                  size="lg"
                  onClick={() => {
                    initializeSounds();
                    const rangeToUse = canSetRange && customRange && customRange !== gameState.currentMaxRoll
                      ? customRange
                      : undefined;
                    // Save the chosen range for the session
                    if (rangeToUse) {
                      setSessionMaxRoll(rangeToUse);
                    }
                    localRoll(currentPlayer.id, rangeToUse, localRollTwice, localNextPlayerOverride);
                    setCustomRange(null);
                    // Clear local coin ability state after rolling
                    setLocalRollTwice(false);
                    setLocalNextPlayerOverride(null);
                    setShowPlayerSelector(false);
                  }}
                  disabled={!animationComplete}
                  className="px-12"
                >
                  ROLL (1-{(canSetRange && customRange ? customRange : (animationComplete ? gameState.currentMaxRoll : (gameState.lastMaxRoll ?? gameState.currentMaxRoll))).toLocaleString()})
                </Button>
                {!isMobile && (
                  <div className="text-xs text-[var(--muted)] mt-2">
                    {animationComplete ? 'Press Space to roll' : 'Dice rolling...'}
                  </div>
                )}
              </>
            )}

            {!currentIsLocal && (
              <div className="text-[var(--muted)]">Waiting for remote player...</div>
            )}
          </div>
        )}
      </Card>

      <Card className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Scoreboard</h2>
        {gameState.teamMode && gameState.teams.length > 0 ? (
          <TeamList
            teams={gameState.teams}
            players={gameState.players}
            currentPlayerId={currentPlayer?.id}
            lastLoserTeamId={showLoserNotification ? gameState.lastLoserTeamId ?? undefined : undefined}
            showScores
          />
        ) : (
          <PlayerList
            players={gameState.players}
            currentPlayerId={currentPlayer?.id}
            lastLoserId={showLoserNotification ? notificationLoserId ?? undefined : undefined}
            showScores
            showCoins={gameState.coinsEnabled}
            onKick={(id) => kickPlayer(id)}
          />
        )}
      </Card>

      <Card className="mb-6">
        <RollHistory history={gameState.rollHistory} />
      </Card>

      <div className="flex gap-4">
        <Button onClick={resetGame} variant="secondary" className="flex-1">
          Back to Lobby
        </Button>
        <Link href="/" className="flex-1">
          <Button variant="danger" className="w-full" onClick={endGame}>
            End Game
          </Button>
        </Link>
      </div>
    </main>
    </>
  );
}
