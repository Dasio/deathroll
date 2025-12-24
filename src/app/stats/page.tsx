"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  getAllPlayerStats,
  getGlobalStats,
  getLeaderboard,
  clearStats,
  exportStats,
  getShareableStats,
  PlayerStats,
  GlobalStats,
} from "@/lib/statistics";

export default function StatsPage() {
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = () => {
    setPlayerStats(getAllPlayerStats());
    setGlobalStats(getGlobalStats());
    if (selectedPlayer) {
      // Refresh selected player data
      const updated = getAllPlayerStats().find(
        (p) => p.playerId === selectedPlayer.playerId
      );
      setSelectedPlayer(updated || null);
    }
  };

  const handleClearStats = () => {
    clearStats();
    loadStats();
    setShowClearConfirm(false);
    setSelectedPlayer(null);
  };

  const handleExportStats = () => {
    const json = exportStats();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deathroll-stats-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareStats = (playerId: string) => {
    const shareText = getShareableStats(playerId);
    navigator.clipboard.writeText(shareText).then(() => {
      setShareMessage("Stats copied to clipboard!");
      setTimeout(() => setShareMessage(null), 2000);
    });
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return minutes === 0 ? "Just now" : `${minutes}m ago`;
    }

    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }

    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}d ago`;
    }

    // Format as date
    return date.toLocaleDateString();
  };

  const getStreakDisplay = (streak: number) => {
    if (streak === 0) return { text: "No streak", color: "text-[var(--muted)]" };
    if (streak > 0)
      return { text: `${streak} wins`, color: "text-green-500" };
    return { text: `${Math.abs(streak)} losses`, color: "text-red-500" };
  };

  const leaderboard = getLeaderboard(10);
  const hasStats = playerStats.length > 0;

  return (
    <main className="min-h-screen p-4 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/" className="text-[var(--accent)] hover:underline mb-2 block">
              ← Back to Home
            </Link>
            <h1 className="text-4xl font-bold">Statistics</h1>
          </div>
          <div className="flex gap-2">
            {hasStats && (
              <>
                <Button variant="secondary" size="sm" onClick={handleExportStats}>
                  Export JSON
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowClearConfirm(true)}
                >
                  Clear Stats
                </Button>
              </>
            )}
          </div>
        </div>

        {shareMessage && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500 rounded-lg text-center">
            {shareMessage}
          </div>
        )}

        {!hasStats ? (
          <Card className="text-center py-12">
            <p className="text-[var(--muted)] text-lg mb-4">
              No statistics yet. Play some games to start tracking your progress!
            </p>
            <Link href="/">
              <Button>Start Playing</Button>
            </Link>
          </Card>
        ) : (
          <>
            {/* Global Stats */}
            {globalStats && (
              <Card className="mb-6">
                <h2 className="text-2xl font-bold mb-4">Global Statistics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-[var(--muted)] text-sm">Total Games</div>
                    <div className="text-2xl font-bold">
                      {globalStats.totalGamesPlayed}
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--muted)] text-sm">Total Players</div>
                    <div className="text-2xl font-bold">
                      {globalStats.totalPlayersAllTime}
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--muted)] text-sm">Total Rolls</div>
                    <div className="text-2xl font-bold">{globalStats.totalRolls}</div>
                  </div>
                  <div>
                    <div className="text-[var(--muted)] text-sm">Avg Game Duration</div>
                    <div className="text-2xl font-bold">
                      {formatDuration(globalStats.averageGameDuration)}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Leaderboard */}
            <Card className="mb-6">
              <h2 className="text-2xl font-bold mb-4">Leaderboard</h2>
              <div className="space-y-2">
                {leaderboard.map((player, index) => (
                  <div
                    key={player.playerId}
                    className={`p-3 rounded-lg border border-[var(--card-border)] cursor-pointer hover:bg-[var(--card-hover)] transition-colors ${
                      selectedPlayer?.playerId === player.playerId
                        ? "bg-[var(--card-hover)] border-[var(--accent)]"
                        : ""
                    }`}
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`text-xl font-bold ${
                            index === 0
                              ? "text-yellow-400"
                              : index === 1
                              ? "text-gray-300"
                              : index === 2
                              ? "text-orange-400"
                              : "text-[var(--muted)]"
                          }`}
                        >
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-semibold">{player.playerName}</div>
                          <div className="text-sm text-[var(--muted)]">
                            {player.totalWins}W / {player.totalLosses}L
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[var(--accent)]">
                          {player.winRate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-[var(--muted)]">
                          {player.totalGamesPlayed} games
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Selected Player Details */}
            {selectedPlayer && (
              <Card className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">{selectedPlayer.playerName}</h2>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleShareStats(selectedPlayer.playerId)}
                    >
                      Share Stats
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedPlayer(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>

                {/* Win/Loss Stats */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[var(--muted)]">Win/Loss Record</span>
                    <span className="font-semibold">
                      {selectedPlayer.totalWins}W - {selectedPlayer.totalLosses}L
                    </span>
                  </div>
                  <div className="h-8 bg-[var(--card-border)] rounded-full overflow-hidden flex">
                    <div
                      className="bg-green-500 flex items-center justify-center text-white text-sm font-semibold"
                      style={{
                        width: `${selectedPlayer.winRate}%`,
                        minWidth: selectedPlayer.totalWins > 0 ? "40px" : "0",
                      }}
                    >
                      {selectedPlayer.totalWins > 0 && `${selectedPlayer.winRate.toFixed(0)}%`}
                    </div>
                    <div className="bg-red-500 flex-1 flex items-center justify-center text-white text-sm font-semibold">
                      {selectedPlayer.totalLosses > 0 &&
                        `${(100 - selectedPlayer.winRate).toFixed(0)}%`}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-[var(--card-border)] rounded-lg">
                    <div className="text-[var(--muted)] text-sm">Games Played</div>
                    <div className="text-2xl font-bold">
                      {selectedPlayer.totalGamesPlayed}
                    </div>
                  </div>
                  <div className="p-4 bg-[var(--card-border)] rounded-lg">
                    <div className="text-[var(--muted)] text-sm">Current Streak</div>
                    <div className={`text-2xl font-bold ${getStreakDisplay(selectedPlayer.currentStreak).color}`}>
                      {getStreakDisplay(selectedPlayer.currentStreak).text}
                    </div>
                  </div>
                  <div className="p-4 bg-[var(--card-border)] rounded-lg">
                    <div className="text-[var(--muted)] text-sm">Best Streak</div>
                    <div className="text-2xl font-bold text-green-500">
                      {selectedPlayer.longestWinStreak} wins
                    </div>
                  </div>
                  <div className="p-4 bg-[var(--card-border)] rounded-lg">
                    <div className="text-[var(--muted)] text-sm">Total Rolls</div>
                    <div className="text-2xl font-bold">
                      {selectedPlayer.totalRolls}
                    </div>
                  </div>
                  <div className="p-4 bg-[var(--card-border)] rounded-lg">
                    <div className="text-[var(--muted)] text-sm">Average Roll</div>
                    <div className="text-2xl font-bold">
                      {selectedPlayer.averageRoll.toFixed(1)}
                    </div>
                  </div>
                  <div className="p-4 bg-[var(--card-border)] rounded-lg">
                    <div className="text-[var(--muted)] text-sm">Highest Roll</div>
                    <div className="text-2xl font-bold text-[var(--accent)]">
                      {selectedPlayer.highestRoll}
                    </div>
                  </div>
                </div>

                {/* Achievements */}
                <div>
                  <h3 className="text-xl font-bold mb-3">Achievements</h3>
                  <div className="space-y-2">
                    {selectedPlayer.fastestWin !== Infinity && (
                      <div className="p-3 bg-[var(--card-border)] rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-semibold">Fastest Win</div>
                          <div className="text-sm text-[var(--muted)]">
                            Won in fewest rolls
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-[var(--accent)]">
                          {selectedPlayer.fastestWin} rolls
                        </div>
                      </div>
                    )}
                    {selectedPlayer.biggestComeback > 0 && (
                      <div className="p-3 bg-[var(--card-border)] rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-semibold">Biggest Comeback</div>
                          <div className="text-sm text-[var(--muted)]">
                            Overcame deficit to win
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-green-500">
                          -{selectedPlayer.biggestComeback}
                        </div>
                      </div>
                    )}
                    {selectedPlayer.longestWinStreak >= 5 && (
                      <div className="p-3 bg-[var(--card-border)] rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-semibold">Hot Streak</div>
                          <div className="text-sm text-[var(--muted)]">
                            5+ consecutive wins
                          </div>
                        </div>
                        <div className="text-2xl">🔥</div>
                      </div>
                    )}
                    {selectedPlayer.totalGamesPlayed >= 100 && (
                      <div className="p-3 bg-[var(--card-border)] rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-semibold">Veteran</div>
                          <div className="text-sm text-[var(--muted)]">
                            Played 100+ games
                          </div>
                        </div>
                        <div className="text-2xl">🎖️</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 text-sm text-[var(--muted)] text-right">
                  Last played: {formatDate(selectedPlayer.lastPlayed)}
                </div>
              </Card>
            )}

            {/* All Players List */}
            {!selectedPlayer && playerStats.length > 10 && (
              <Card>
                <h2 className="text-2xl font-bold mb-4">All Players</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {playerStats.map((player) => (
                    <div
                      key={player.playerId}
                      className="p-3 rounded-lg border border-[var(--card-border)] cursor-pointer hover:bg-[var(--card-hover)] transition-colors"
                      onClick={() => setSelectedPlayer(player)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{player.playerName}</div>
                          <div className="text-sm text-[var(--muted)]">
                            {player.totalWins}W / {player.totalLosses}L ({player.winRate.toFixed(1)}%)
                          </div>
                        </div>
                        <div className="text-sm text-[var(--muted)]">
                          {formatDate(player.lastPlayed)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {/* Clear Confirmation Modal */}
        {showClearConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Clear All Statistics?</h3>
              <p className="text-[var(--muted)] mb-6">
                This will permanently delete all player statistics and cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setShowClearConfirm(false)}
                >
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleClearStats}>
                  Clear All Stats
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
