"use client";

import { memo } from "react";
import { Player, Team } from "@/types/game";

interface TeamListProps {
  teams: Team[];
  players: Player[];
  currentPlayerId?: string;
  myPlayerId?: string;
  lastLoserTeamId?: string;
  showScores?: boolean;
  onRemoveTeam?: (teamId: string) => void;
  onUnassignPlayer?: (playerId: string) => void;
}

export const TeamList = memo(function TeamList({
  teams,
  players,
  currentPlayerId,
  myPlayerId,
  lastLoserTeamId,
  showScores = false,
  onRemoveTeam,
  onUnassignPlayer,
}: TeamListProps) {
  if (teams.length === 0) {
    return (
      <div className="text-[var(--muted)] text-center py-4">
        No teams created yet
      </div>
    );
  }

  // Get players for a team
  const getTeamPlayers = (teamId: string) => {
    return players.filter((p) => p.teamId === teamId && !p.isSpectator);
  };

  // Get unassigned active players
  const unassignedPlayers = players.filter((p) => !p.teamId && !p.isSpectator);

  return (
    <div className="space-y-4">
      {teams.map((team) => {
        const teamPlayers = getTeamPlayers(team.id);
        const isLoserTeam = lastLoserTeamId === team.id;
        const hasCurrentPlayer = teamPlayers.some((p) => p.id === currentPlayerId);

        return (
          <div
            key={team.id}
            className={`border-2 rounded-lg p-4 transition-all ${
              hasCurrentPlayer
                ? "border-[var(--accent)] bg-[var(--accent)]/10"
                : isLoserTeam
                ? "border-[var(--danger)] bg-[var(--danger)]/10"
                : "border-[var(--border)]"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                <h3 className="text-lg font-semibold">{team.name}</h3>
                {isLoserTeam && <span className="text-[var(--danger)]">💀</span>}
              </div>
              <div className="flex items-center gap-3">
                {showScores && (
                  <span className="text-[var(--danger)] font-mono">
                    {team.losses} 💀
                  </span>
                )}
                {onRemoveTeam && (
                  <button
                    onClick={() => onRemoveTeam(team.id)}
                    className="text-[var(--danger)] hover:opacity-80 text-sm"
                  >
                    Remove Team
                  </button>
                )}
              </div>
            </div>

            {teamPlayers.length === 0 ? (
              <div className="text-[var(--muted)] text-sm italic">No players assigned</div>
            ) : (
              <ul className="space-y-2">
                {teamPlayers.map((player) => (
                  <li
                    key={player.id}
                    className={`flex items-center justify-between p-2 rounded border-l-4 ${
                      currentPlayerId === player.id
                        ? "bg-[var(--accent)]/20"
                        : "bg-[var(--background)]"
                    } ${!player.isConnected ? "opacity-50" : ""}`}
                    style={{
                      borderLeftColor: player.color,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl" role="img" aria-label="player avatar">
                        {player.emoji}
                      </span>
                      <div>
                        <span className="font-medium">
                          {player.name}
                          {player.id === myPlayerId && (
                            <span className="ml-2 text-sm text-[var(--accent)]">(You)</span>
                          )}
                          {currentPlayerId === player.id && (
                            <span className="ml-2 text-sm text-[var(--accent)]">▶</span>
                          )}
                        </span>
                        <div className="flex gap-2 text-xs">
                          {player.isLocal ? (
                            <span className="text-purple-400">Local</span>
                          ) : (
                            <span className="text-[var(--success)]">Remote</span>
                          )}
                          {!player.isConnected && (
                            <span className="text-[var(--danger)] animate-pulse">
                              Disconnected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {showScores && (
                        <span className="text-[var(--muted)] font-mono text-sm">
                          {player.losses}
                        </span>
                      )}
                      {onUnassignPlayer && (
                        <button
                          onClick={() => onUnassignPlayer(player.id)}
                          className="text-[var(--muted)] hover:text-[var(--danger)] text-xs"
                        >
                          Unassign
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {unassignedPlayers.length > 0 && (
        <div className="border-2 border-dashed border-[var(--border)] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[var(--muted)] mb-2">
            Unassigned Players ({unassignedPlayers.length})
          </h3>
          <ul className="space-y-2">
            {unassignedPlayers.map((player) => (
              <li
                key={player.id}
                className={`flex items-center justify-between p-2 rounded border-l-4 bg-[var(--background)] ${
                  !player.isConnected ? "opacity-50" : ""
                }`}
                style={{
                  borderLeftColor: player.color,
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl" role="img" aria-label="player avatar">
                    {player.emoji}
                  </span>
                  <span className="font-medium">{player.name}</span>
                </div>
                {showScores && (
                  <span className="text-[var(--muted)] font-mono text-sm">
                    {player.losses}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});
