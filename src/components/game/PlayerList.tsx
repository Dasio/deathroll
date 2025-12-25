"use client";

import { memo } from "react";
import { Player } from "@/types/game";

interface PlayerListProps {
  players: Player[];
  currentPlayerId?: string;
  myPlayerId?: string;
  lastLoserId?: string;
  showScores?: boolean;
  onRemove?: (playerId: string) => void;
  onKick?: (playerId: string) => void;
}

export const PlayerList = memo(function PlayerList({
  players,
  currentPlayerId,
  myPlayerId,
  lastLoserId,
  showScores = false,
  onRemove,
  onKick,
}: PlayerListProps) {
  if (players.length === 0) {
    return (
      <div className="text-[var(--muted)] text-center py-4">
        No players yet
      </div>
    );
  }

  // Separate players and spectators
  const activePlayers = players.filter((p) => !p.isSpectator);
  const spectators = players.filter((p) => p.isSpectator);

  // Only show local/remote indicator if there are multiple local players (for host perspective)
  const localPlayerCount = players.filter((p) => p.isLocal).length;
  const shouldShowLocalRemote = localPlayerCount > 1;

  // Sort by losses (ascending) for display (only for active players)
  const sortedPlayers = showScores
    ? [...activePlayers].sort((a, b) => a.losses - b.losses)
    : activePlayers;

  return (
    <div className="space-y-4">
      {sortedPlayers.length > 0 && (
        <ul className="space-y-2">
          {sortedPlayers.map((player, index) => (
        <li
          key={player.id}
          className={`flex items-center justify-between p-3 rounded-lg transition-all border-l-4 ${
            currentPlayerId === player.id
              ? "bg-[var(--accent)]/20 border-2 border-[var(--accent)]"
              : lastLoserId === player.id
              ? "bg-[var(--danger)]/20 border border-[var(--danger)]"
              : "bg-[var(--background)]"
          } ${!player.isConnected ? "opacity-50" : ""}`}
          style={{
            borderLeftColor: player.color,
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl" role="img" aria-label="player avatar">
              {player.emoji}
            </span>
            <div>
              <span className="font-medium">
                {player.name}
                {player.id === myPlayerId && (
                  <span className="ml-2 text-sm text-[var(--accent)]">(You)</span>
                )}
                {player.isSpectator && (
                  <span className="ml-2 text-sm text-[var(--muted)]">👁️ Spectator</span>
                )}
                {lastLoserId === player.id && (
                  <span className="ml-2 text-sm text-[var(--danger)]">💀</span>
                )}
              </span>
              <div className="flex gap-2 text-xs">
                {shouldShowLocalRemote && player.isLocal && (
                  <span className="text-purple-400">Local</span>
                )}
                {!player.isConnected && (
                  <span className="text-[var(--danger)] animate-pulse">
                    Disconnected (reconnecting...)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {showScores && (
              <span className="text-[var(--danger)] font-mono">
                {player.losses} 💀
              </span>
            )}
            {onRemove && player.isLocal && (
              <button
                onClick={() => onRemove(player.id)}
                className="text-[var(--danger)] hover:opacity-80 text-sm"
              >
                Remove
              </button>
            )}
            {onKick && !player.isLocal && (
              <button
                onClick={() => onKick(player.id)}
                className="text-[var(--danger)] hover:opacity-80 text-sm"
              >
                Kick
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
      )}

      {spectators.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--muted)] mb-2">
            Spectators ({spectators.length})
          </h3>
          <ul className="space-y-2">
            {spectators.map((player) => (
              <li
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-all border-l-4 bg-[var(--background)] ${
                  !player.isConnected ? "opacity-50" : ""
                }`}
                style={{
                  borderLeftColor: player.color,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" role="img" aria-label="player avatar">
                    {player.emoji}
                  </span>
                  <div>
                    <span className="font-medium">
                      {player.name}
                      {player.id === myPlayerId && (
                        <span className="ml-2 text-sm text-[var(--accent)]">(You)</span>
                      )}
                      <span className="ml-2 text-sm text-[var(--muted)]">👁️</span>
                    </span>
                    <div className="flex gap-2 text-xs">
                      {shouldShowLocalRemote && player.isLocal && (
                        <span className="text-purple-400">Local</span>
                      )}
                      {!player.isConnected && (
                        <span className="text-[var(--danger)] animate-pulse">
                          Disconnected (reconnecting...)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {onRemove && player.isLocal && (
                    <button
                      onClick={() => onRemove(player.id)}
                      className="text-[var(--danger)] hover:opacity-80 text-sm"
                    >
                      Remove
                    </button>
                  )}
                  {onKick && !player.isLocal && (
                    <button
                      onClick={() => onKick(player.id)}
                      className="text-[var(--danger)] hover:opacity-80 text-sm"
                    >
                      Kick
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});
