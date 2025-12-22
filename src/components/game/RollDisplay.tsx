"use client";

import { useEffect, useState, useRef } from "react";
import {
  playDiceRollSound,
  playDeathSound,
  playMaxRollSound,
} from "@/lib/sounds";
import { vibrateDeathRoll, vibrateMaxRoll } from "@/lib/vibration";

interface RollDisplayProps {
  currentMax: number;
  lastRoll: number | null;
  lastMaxRoll?: number | null;
  onAnimationComplete?: () => void;
}

export function RollDisplay({
  currentMax,
  lastRoll,
  lastMaxRoll,
  onAnimationComplete,
}: RollDisplayProps) {
  const [displayValue, setDisplayValue] = useState<number | null>(lastRoll);
  const [animating, setAnimating] = useState(false);
  const [showDeathRoll, setShowDeathRoll] = useState(false);
  const [showMaxRoll, setShowMaxRoll] = useState(false);
  const animationMaxRef = useRef(currentMax);
  const lastRollRef = useRef<number | null>(null);

  useEffect(() => {
    if (lastRoll !== null && lastRoll !== lastRollRef.current && !animating) {
      lastRollRef.current = lastRoll;
      // Store the max at the start of animation (use lastMaxRoll if available)
      animationMaxRef.current = lastMaxRoll ?? currentMax;
      setAnimating(true);
      setShowDeathRoll(false);
      setShowMaxRoll(false);

      let count = 0;
      const interval = setInterval(() => {
        // Play dice roll sound during animation
        playDiceRollSound();

        // Use stored max for animation, exclude 1 from random display
        const max = animationMaxRef.current;
        const randomValue = Math.floor(Math.random() * (max - 1)) + 2;
        setDisplayValue(Math.min(randomValue, max));
        count++;
        if (count > 10) {
          clearInterval(interval);
          setDisplayValue(lastRoll);
          setAnimating(false);
          // Only show DEATH ROLL after animation completes and result is 1
          if (lastRoll === 1) {
            setShowDeathRoll(true);
            vibrateDeathRoll();
            playDeathSound();
          }
          // Show MAX ROLL if rolled the maximum value
          if (lastRoll === animationMaxRef.current) {
            setShowMaxRoll(true);
            vibrateMaxRoll();
            playMaxRollSound();
          }
          // Notify parent animation is complete
          onAnimationComplete?.();
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [lastRoll, lastMaxRoll, onAnimationComplete]);

  // Determine what range to show - during animation use stored max
  const displayMax = animating ? animationMaxRef.current : currentMax;

  return (
    <div className="text-center py-8">
      <div className="text-[var(--muted)] mb-2">Rolling 1-{displayMax.toLocaleString()}</div>
      <div
        className={`text-8xl font-bold transition-all duration-200 ${
          animating ? "scale-110 text-[var(--accent)]" : ""
        } ${showDeathRoll ? "text-[var(--danger)]" : ""} ${showMaxRoll ? "text-[var(--success)]" : ""}`}
      >
        {displayValue?.toLocaleString() ?? "?"}
      </div>
      {showDeathRoll && (
        <div className="text-2xl text-[var(--danger)] font-bold mt-4 animate-pulse">
          💀 DEATH ROLL! 💀
        </div>
      )}
      {showMaxRoll && (
        <div className="text-2xl text-[var(--success)] font-bold mt-4 animate-pulse">
          🎯 MAX ROLL! Previous player drinks! 🍺
        </div>
      )}
    </div>
  );
}
