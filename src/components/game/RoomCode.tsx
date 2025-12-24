"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface RoomCodeProps {
  code: string;
  showQR?: boolean;
  playerCount?: number;
}

export function RoomCode({ code, showQR = true, playerCount }: RoomCodeProps) {
  const [copied, setCopied] = useState(false);
  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/play?room=${code}`
    : "";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="text-center">
      <div className="text-sm text-[var(--muted)] mb-2">
        Room Code
        {playerCount !== undefined && (
          <span className="ml-2">({playerCount} player{playerCount !== 1 ? "s" : ""})</span>
        )}
      </div>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={copyToClipboard}
          className="text-5xl font-mono font-bold tracking-widest text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          title="Click to copy"
        >
          {code}
        </button>
        <button
          onClick={copyToClipboard}
          className="p-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--card-border)] transition-colors"
          title="Copy room code"
        >
          {copied ? (
            <span className="text-[var(--success)] text-sm font-semibold">Copied!</span>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
          )}
        </button>
      </div>
      <div className="text-xs text-[var(--muted)] mt-1">Click to copy</div>

      {showQR && joinUrl && (
        <div className="mt-6 flex justify-center">
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG value={joinUrl} size={150} />
          </div>
        </div>
      )}
    </div>
  );
}
