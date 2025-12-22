"use client";

import { RollEntry } from "@/types/game";

interface RollHistoryProps {
  history: RollEntry[];
  maxItems?: number;
}

export function RollHistory({ history, maxItems = 10 }: RollHistoryProps) {
  const displayHistory = history.slice(-maxItems).reverse();

  if (displayHistory.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-[var(--muted)] mb-2">Roll History</h3>
      <ul className="space-y-1 text-sm">
        {displayHistory.map((entry, index) => (
          <li
            key={entry.timestamp}
            className={`flex justify-between items-center py-1 px-2 rounded border-l-2 ${
              index === 0 ? "bg-[var(--accent)]/10" : ""
            } ${entry.result === 1 ? "bg-[var(--danger)]/20 text-[var(--danger)]" : ""}`}
            style={{
              borderLeftColor: entry.playerColor,
            }}
          >
            <span className="font-medium flex items-center gap-2">
              <span className="text-base" role="img" aria-label="player avatar">
                {entry.playerEmoji}
              </span>
              {entry.playerName}
            </span>
            <span>
              <span className="text-[var(--muted)]">1-{entry.maxRange}</span>
              <span className="mx-2">→</span>
              <span className={`font-bold ${entry.result === 1 ? "text-[var(--danger)]" : ""}`}>
                {entry.result}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
