"use client";

import { QRCodeSVG } from "qrcode.react";

interface RoomCodeProps {
  code: string;
  showQR?: boolean;
}

export function RoomCode({ code, showQR = true }: RoomCodeProps) {
  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/play?room=${code}`
    : "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="text-center">
      <div className="text-sm text-[var(--muted)] mb-2">Room Code</div>
      <button
        onClick={copyToClipboard}
        className="text-5xl font-mono font-bold tracking-widest text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
        title="Click to copy"
      >
        {code}
      </button>
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
