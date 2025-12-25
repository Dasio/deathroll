"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePlayerGame } from "@/hooks/usePlayerGame";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { PlayerList } from "@/components/game/PlayerList";
import { TeamList } from "@/components/game/TeamList";
import { RollDisplay } from "@/components/game/RollDisplay";
import { RollHistory } from "@/components/game/RollHistory";
import { getCurrentPlayer } from "@/lib/game/gameLogic";
import { vibrateYourTurn } from "@/lib/vibration";
import { playTurnNotificationSound, initializeSounds } from "@/lib/sounds";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

function PlayContent() {
  const searchParams = useSearchParams();
  const roomCodeParam = searchParams.get("room");

  const {
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
    disconnect,
    manualReconnect,
    reconnectWithSaved,
    discardSavedSession,
    isMyTurn,
    didIJustLose,
  } = usePlayerGame();

  const { isSupported: wakeLockSupported, isActive: wakeLockActive, requestWakeLock, releaseWakeLock } = useWakeLock();
  const isMobile = useIsMobile();

  const [roomCode, setRoomCode] = useState(roomCodeParam || savedSession?.roomCode || "");
  const [playerName, setPlayerName] = useState(savedSession?.playerName || "");
  const [hasJoined, setHasJoined] = useState(false);
  const [joinAsSpectator, setJoinAsSpectator] = useState(false);
  const [customRange, setCustomRange] = useState<number | null>(null);
  const [sessionMaxRoll, setSessionMaxRoll] = useState<number | null>(null);
  const [showLoserNotification, setShowLoserNotification] = useState(false);
  const [notificationLoserId, setNotificationLoserId] = useState<string | null>(null);
  const previousMyTurnRef = useRef(false);
  const [isRolling, setIsRolling] = useState(false);

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
    return () => {
      disconnect();
      releaseWakeLock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Request wake lock when game starts playing
  useEffect(() => {
    if (gameState.phase === "playing" && wakeLockSupported && !isSpectator) {
      requestWakeLock();
    }
  }, [gameState.phase, wakeLockSupported, isSpectator, requestWakeLock]);

  // Compute derived state
  const currentPlayer = getCurrentPlayer(gameState);
  const lastLoser = gameState.players.find((p) => p.id === notificationLoserId);
  const myPlayer = gameState.players.find((p) => p.id === playerId);
  const canSetRange = gameState.currentMaxRoll === gameState.initialMaxRoll;
  const iJustLostAfterAnimation = showLoserNotification && notificationLoserId === playerId;
  const [animationComplete, setAnimationComplete] = useState(true);

  // Track when animation starts (use isRolling flag)
  useEffect(() => {
    if (gameState.isRolling) {
      setAnimationComplete(false);
    }
  }, [gameState.isRolling]);

  // Use ref for latest gameState to avoid callback identity changes during animation
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Stable animation complete handler
  const handleAnimationCompleteStable = useCallback(() => {
    setAnimationComplete(true);
    const currentState = gameStateRef.current;
    if (currentState.lastLoserId) {
      setNotificationLoserId(currentState.lastLoserId);
      setShowLoserNotification(true);
    }
  }, []);

  // Mark animation complete callback (kept for compatibility)
  const handleAnimationCompleteWithFlag = useCallback(() => {
    handleAnimationCompleteStable();
  }, [handleAnimationCompleteStable]);

  // Vibrate and play sound when it becomes my turn (after animation completes)
  const myTurn = isMyTurn();
  useEffect(() => {
    if (myTurn && !previousMyTurnRef.current && gameState.phase === "playing" && animationComplete) {
      vibrateYourTurn();
      playTurnNotificationSound();
    }
    previousMyTurnRef.current = myTurn;
  }, [myTurn, gameState.phase, animationComplete]);

  // Keyboard shortcuts for rolling
  useEffect(() => {
    if (gameState.phase !== "playing" || isSpectator) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle space or enter when it's my turn and animation is complete
      if ((e.key === " " || e.key === "Enter") && myTurn && !isRolling && animationComplete) {
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
        requestRoll(rangeToUse);
        setCustomRange(null);
        setTimeout(() => setIsRolling(false), 500);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [gameState.phase, myTurn, isRolling, animationComplete, canSetRange, customRange, gameState.currentMaxRoll, requestRoll, isSpectator]);

  const handleJoin = async () => {
    if (roomCode.trim() && playerName.trim()) {
      // Initialize sounds on first user interaction
      initializeSounds();
      setHasJoined(true);
      await joinRoom(roomCode.trim().toUpperCase(), playerName.trim(), joinAsSpectator);
    }
  };

  // Kicked
  if (kicked) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="text-center">
          <div className="text-[var(--danger)] mb-4">You were kicked: {kicked}</div>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </Card>
      </main>
    );
  }

  // Join form (not yet connected)
  if (!hasJoined || (status === "error" && error)) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Join Game</h1>
        </div>

        <Card className="w-full max-w-md">
          {/* Show reconnect prompt if saved session exists */}
          {savedSession && !error && (
            <div className="mb-6 p-4 bg-[var(--accent)]/10 border border-[var(--accent)] rounded-lg">
              <div className="text-center mb-3">
                <p className="font-semibold mb-1">Resume Previous Session?</p>
                <p className="text-sm text-[var(--muted)]">
                  {savedSession.playerName} in room {savedSession.roomCode}
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  {Math.floor((Date.now() - savedSession.timestamp) / 1000 / 60)} minute{Math.floor((Date.now() - savedSession.timestamp) / 1000 / 60) !== 1 ? 's' : ''} ago
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    initializeSounds();
                    setHasJoined(true);
                    reconnectWithSaved();
                  }}
                >
                  Reconnect
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={discardSavedSession}
                >
                  New Session
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-[var(--danger)]/20 text-[var(--danger)] p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Room Code"
              placeholder="XXXX"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={4}
              className="text-center text-2xl font-mono tracking-widest"
            />

            <Input
              label="Your Name"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="spectator"
                checked={joinAsSpectator}
                onChange={(e) => setJoinAsSpectator(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)] bg-[var(--background)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <label htmlFor="spectator" className="text-sm text-[var(--muted)]">
                Join as Spectator (watch only)
              </label>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={handleJoin}
              disabled={!roomCode.trim() || !playerName.trim()}
            >
              {joinAsSpectator ? "Join as Spectator" : "Join Game"}
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

  // Connecting
  if (status === "connecting") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="text-center">
          <LoadingSpinner size="lg" />
          <div className="text-xl mt-4">Connecting to room...</div>
        </Card>
      </main>
    );
  }

  // Reconnecting
  if (status === "reconnecting") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="text-center max-w-md">
          <LoadingSpinner size="lg" />
          <div className="text-xl mt-4 mb-2">Reconnecting...</div>
          <p className="text-sm text-[var(--muted)] mb-4">
            Attempt {reconnectionState.attempt} of {reconnectionState.maxAttempts}
          </p>
          {networkQuality === "offline" && (
            <p className="text-sm text-[var(--danger)] mb-4">
              ⚠️ No internet connection detected
            </p>
          )}
          <div className="space-y-3">
            <Button onClick={manualReconnect} variant="secondary" className="w-full">
              Retry Now
            </Button>
            <Link href="/">
              <Button variant="secondary" className="w-full">
                Back to Home
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  // Connection closed
  if (status === "closed") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="text-center max-w-md">
          <div className="text-[var(--muted)] mb-4">Connection closed</div>
          <p className="text-sm text-[var(--muted)] mb-4">
            The connection to the game was lost.
          </p>
          <div className="space-y-3">
            <Button onClick={manualReconnect} className="w-full">
              Try to Reconnect
            </Button>
            <Link href="/">
              <Button variant="secondary" className="w-full">
                Back to Home
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  // Lobby phase
  if (gameState.phase === "lobby") {
    return (
      <main className="min-h-screen p-4 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-[var(--accent)] hover:underline text-sm">
            &larr; Back
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Waiting for game to start...</h1>
            <p className="text-[var(--muted)]">Room: {roomCode}</p>
            {isSpectator && (
              <p className="text-sm text-[var(--accent)] mt-2">
                👁️ Spectator Mode - Watch Only
              </p>
            )}
          </div>
          <Link href="/stats" className="text-[var(--accent)] hover:underline text-sm">
            Stats
          </Link>
        </div>

        <Card className="mb-6">
          <h2 className="text-lg font-semibold mb-4">
            Players ({gameState.players.length})
          </h2>
          <PlayerList players={gameState.players} myPlayerId={playerId ?? undefined} />
        </Card>

        <div className="text-center text-[var(--muted)]">
          The host will start the game when ready
        </div>
      </main>
    );
  }

  // Playing phase (infinite game)
  return (
    <>
      <SoundToggle />
      <main className="min-h-screen p-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-start mb-4">
        <Link href="/" className="text-[var(--accent)] hover:underline text-sm mt-2">
          &larr; Back
        </Link>
        <div className="text-center flex-1">
          <h1 className="text-2xl font-bold">DeathRoll</h1>
          <div className="flex justify-center gap-4 text-sm text-[var(--muted)]">
            <span>Round {gameState.roundNumber}</span>
            {myPlayer && !isSpectator && <span>Your losses: {myPlayer.losses}</span>}
            {isSpectator && <span className="text-[var(--accent)]">👁️ Spectating</span>}
          </div>
        </div>
        <Link href="/stats" className="text-[var(--accent)] hover:underline text-sm mt-2">
          Stats
        </Link>
      </div>

      {/* Show who just lost - only after animation completes */}
      {showLoserNotification && lastLoser && (
        <Card className={`mb-4 ${iJustLostAfterAnimation ? "bg-[var(--danger)]/20" : "bg-[var(--danger)]/10"} border-[var(--danger)]`}>
          <div className="text-center">
            {iJustLostAfterAnimation ? (
              <span className="text-[var(--danger)] font-bold">
                💀 YOU rolled a 1! Pick the next starting range.
              </span>
            ) : (
              <span className="text-[var(--danger)] font-bold">
                💀 {lastLoser.name} rolled a 1!
              </span>
            )}
          </div>
        </Card>
      )}

      <Card className="mb-6">
        <RollDisplay
          currentMax={gameState.currentMaxRoll}
          lastRoll={gameState.lastRoll}
          lastMaxRoll={gameState.lastMaxRoll}
          isRolling={gameState.isRolling}
          isMyLoss={gameState.lastLoserId === playerId}
          final10Mode={gameState.final10Mode}
          onAnimationComplete={handleAnimationCompleteWithFlag}
        />

        <div className="text-center mt-4">
          {isSpectator ? (
            <div className="text-lg text-[var(--muted)]">
              👁️ Spectating - {currentPlayer?.name}&apos;s turn
            </div>
          ) : myTurn && animationComplete ? (
            <>
              <div className="text-lg text-[var(--success)] font-bold mb-4">
                YOUR TURN!
                {canSetRange && " - Choose starting range"}
              </div>

              {/* Range selector at start of round */}
              {canSetRange && (
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

              <>
                <Button
                  size="lg"
                  onClick={() => {
                    initializeSounds(); // Ensure sounds are initialized on interaction
                    const rangeToUse = canSetRange && customRange && customRange !== gameState.currentMaxRoll
                      ? customRange
                      : undefined;
                    // Save the chosen range for the session
                    if (rangeToUse) {
                      setSessionMaxRoll(rangeToUse);
                    }
                    requestRoll(rangeToUse);
                    setCustomRange(null);
                  }}
                  disabled={!animationComplete}
                  className="px-12 py-4 text-xl"
                >
                  ROLL (1-{(canSetRange && customRange ? customRange : (animationComplete ? gameState.currentMaxRoll : (gameState.lastMaxRoll ?? gameState.currentMaxRoll))).toLocaleString()})
                </Button>
                {!isMobile && (
                  <div className="text-xs text-[var(--muted)] mt-2">
                    {animationComplete ? 'Press Space to roll' : 'Dice rolling...'}
                  </div>
                )}
              </>
            </>
          ) : (
            <div className="text-lg text-[var(--muted)]">
              {currentPlayer?.name}&apos;s turn
            </div>
          )}
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Scoreboard</h2>
        {gameState.teamMode && gameState.teams.length > 0 ? (
          <TeamList
            teams={gameState.teams}
            players={gameState.players}
            currentPlayerId={currentPlayer?.id}
            myPlayerId={playerId ?? undefined}
            lastLoserTeamId={showLoserNotification ? gameState.lastLoserTeamId ?? undefined : undefined}
            showScores
          />
        ) : (
          <PlayerList
            players={gameState.players}
            currentPlayerId={currentPlayer?.id}
            myPlayerId={playerId ?? undefined}
            lastLoserId={showLoserNotification ? notificationLoserId ?? undefined : undefined}
            showScores
          />
        )}
      </Card>

      <Card>
        <RollHistory history={gameState.rollHistory} />
      </Card>
    </main>
    </>
  );
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center p-4">
          <Card className="text-center">
            <LoadingSpinner size="lg" />
            <div className="text-xl mt-4">Loading...</div>
          </Card>
        </main>
      }
    >
      <PlayContent />
    </Suspense>
  );
}
