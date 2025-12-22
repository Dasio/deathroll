"use client";

import { useEffect, useState } from "react";
import { isSoundEnabled, toggleSound } from "@/lib/sounds";

export function SoundToggle() {
  const [enabled, setEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Load initial state after mount (client-side only)
  useEffect(() => {
    setMounted(true);
    setEnabled(isSoundEnabled());
  }, []);

  const handleToggle = () => {
    const newState = toggleSound();
    setEnabled(newState);
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <button
      onClick={handleToggle}
      className="fixed bottom-4 right-4 p-3 rounded-full bg-[var(--card-bg)] border border-[var(--border)] shadow-lg hover:scale-110 transition-transform"
      aria-label={enabled ? "Disable sound" : "Enable sound"}
      title={enabled ? "Sound: ON" : "Sound: OFF"}
    >
      <span className="text-2xl" role="img" aria-label={enabled ? "Sound on" : "Sound off"}>
        {enabled ? "🔊" : "🔇"}
      </span>
    </button>
  );
}
