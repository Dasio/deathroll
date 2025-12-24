"use client";

import { useEffect, useState, useRef, memo } from "react";
import {
  playDiceRollSound,
  playDeathSound,
  playMaxRollSound,
} from "@/lib/sounds";
import { vibrateDeathRoll, vibrateRoundEnded, vibrateMaxRoll } from "@/lib/vibration";

interface RollDisplayProps {
  currentMax: number;
  lastRoll: number | null;
  lastMaxRoll?: number | null;
  isMyLoss?: boolean; // True if this player lost, false if someone else lost
  onAnimationComplete?: () => void;
}

export const RollDisplay = memo(function RollDisplay({
  currentMax,
  lastRoll,
  lastMaxRoll,
  isMyLoss = false,
  onAnimationComplete,
}: RollDisplayProps) {
  const [displayValue, setDisplayValue] = useState<number | null>(lastRoll);
  const [animating, setAnimating] = useState(false);
  const [showDeathRoll, setShowDeathRoll] = useState(false);
  const [showMaxRoll, setShowMaxRoll] = useState(false);
  const animationMaxRef = useRef(currentMax);
  const lastRollRef = useRef<number | null>(null);
  const lastMaxRollRef = useRef<number | null>(null);

  useEffect(() => {
    // Trigger animation if either lastRoll OR lastMaxRoll changed (handles same roll value from different ranges)
    if (
      lastRoll !== null &&
      (lastRoll !== lastRollRef.current || lastMaxRoll !== lastMaxRollRef.current) &&
      !animating
    ) {
      lastRollRef.current = lastRoll;
      lastMaxRollRef.current = lastMaxRoll;
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
            // Different vibration depending on who lost
            if (isMyLoss) {
              vibrateDeathRoll(); // Strong vibration when YOU lose
            } else {
              vibrateRoundEnded(); // Gentler vibration when someone else loses
            }
            playDeathSound();
          }
          // Show MAX ROLL if rolled the maximum value
          // Use lastMaxRoll (the actual max before this roll) if available
          const rollMax = lastMaxRoll !== null && lastMaxRoll !== undefined ? lastMaxRoll : animationMaxRef.current;
          if (lastRoll === rollMax && rollMax > 1) {
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
          🎯 MAX ROLL!
        </div>
      )}
    </div>
  );
});
