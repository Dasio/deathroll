"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useHostGame } from "@/hooks/useHostGame";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { RoomCode } from "@/components/game/RoomCode";
import { PlayerList } from "@/components/game/PlayerList";
import { RollDisplay } from "@/components/game/RollDisplay";
import { RollHistory } from "@/components/game/RollHistory";
import { getCurrentPlayer } from "@/lib/game/gameLogic";
import { initializeSounds } from "@/lib/sounds";
import { SoundToggle } from "@/components/ui/SoundToggle";

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
  } = useHostGame();

  const [newPlayerName, setNewPlayerName] = useState("");
  const [initialRange, setInitialRange] = useState(100);
  const [customRange, setCustomRange] = useState<number | null>(null);
  const [showLoserNotification, setShowLoserNotification] = useState(false);
  const [notificationLoserId, setNotificationLoserId] = useState<string | null>(null);

  // Handle animation completion - show loser notification after dice animation
  const handleAnimationComplete = useCallback(() => {
    if (gameState.lastLoserId) {
      setNotificationLoserId(gameState.lastLoserId);
      setShowLoserNotification(true);
    }
  }, [gameState.lastLoserId]);

  // Reset notification when a new roll starts (lastLoserId becomes null)
  useEffect(() => {
    if (!gameState.lastLoserId) {
      setShowLoserNotification(false);
      setNotificationLoserId(null);
    }
  }, [gameState.lastLoserId]);

  useEffect(() => {
    let mounted = true;
    if (mounted) {
      createRoom();
    }
    return () => {
      mounted = false;
      disconnect();
    };
  }, []);

  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      addLocalPlayer(newPlayerName.trim());
      setNewPlayerName("");
    }
  };

  const currentPlayer = getCurrentPlayer(gameState);
  const lastLoser = gameState.players.find((p) => p.id === notificationLoserId);
  const canSetRange = gameState.currentMaxRoll === gameState.initialMaxRoll;

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
          <div className="animate-pulse text-xl">Creating room...</div>
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
          <div />
        </div>

        {roomCode && (
          <Card className="mb-6">
            <RoomCode code={roomCode} />
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
            onRemove={(id) => {
              const player = gameState.players.find((p) => p.id === id);
              if (player?.isLocal) removeLocalPlayer(id);
            }}
            onKick={(id) => kickPlayer(id)}
          />
        </Card>

        <Card className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Game Settings</h2>
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
        </Card>

        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            initializeSounds();
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
        <RollDisplay
          currentMax={gameState.currentMaxRoll}
          lastRoll={gameState.lastRoll}
          lastMaxRoll={gameState.lastMaxRoll}
          onAnimationComplete={handleAnimationComplete}
        />

        {currentPlayer && (
          <div className="text-center mt-4">
            <div className="text-lg text-[var(--muted)] mb-4">
              {currentPlayer.name}&apos;s turn
              {canSetRange && " - Choose starting range"}
            </div>

            {/* Range selector at start of round for local players */}
            {currentIsLocal && canSetRange && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <Input
                  type="number"
                  min={2}
                  value={customRange ?? gameState.currentMaxRoll}
                  onChange={(e) => setCustomRange(Number(e.target.value))}
                  className="w-40 text-center"
                />
              </div>
            )}

            {currentIsLocal && (
              <Button
                size="lg"
                onClick={() => {
                  initializeSounds();
                  const rangeToUse = canSetRange && customRange && customRange !== gameState.currentMaxRoll
                    ? customRange
                    : undefined;
                  localRoll(currentPlayer.id, rangeToUse);
                  setCustomRange(null);
                }}
                className="px-12"
              >
                ROLL (1-{(canSetRange && customRange ? customRange : gameState.currentMaxRoll).toLocaleString()})
              </Button>
            )}

            {!currentIsLocal && (
              <div className="text-[var(--muted)]">Waiting for remote player...</div>
            )}
          </div>
        )}
      </Card>

      <Card className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Scoreboard</h2>
        <PlayerList
          players={gameState.players}
          currentPlayerId={currentPlayer?.id}
          lastLoserId={showLoserNotification ? notificationLoserId ?? undefined : undefined}
          showScores
          onKick={(id) => kickPlayer(id)}
        />
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
