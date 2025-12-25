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
  isRolling?: boolean; // True during Phase 1 (animation), false in Phase 2 (result revealed)
  isMyLoss?: boolean; // True if this player lost, false if someone else lost
  final10Mode?: boolean; // Whether Final 10 mode is enabled
  onAnimationComplete?: () => void;
}

export const RollDisplay = memo(function RollDisplay({
  currentMax,
  lastRoll,
  lastMaxRoll,
  isRolling = false,
  isMyLoss = false,
  final10Mode = false,
  onAnimationComplete,
}: RollDisplayProps) {
  const [displayValue, setDisplayValue] = useState<number | null>(lastRoll);
  const [showDeathRoll, setShowDeathRoll] = useState(false);
  const [showMaxRoll, setShowMaxRoll] = useState(false);
  const animationMaxRef = useRef(currentMax);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Determine what range to use for Final 10 detection
  // During animation (isRolling=true), use the stored max to prevent spoiling the result
  const effectiveMax = isRolling ? animationMaxRef.current : currentMax;

  // Check if we're in Final 10 mode (enabled AND max roll < 10)
  const inFinal10 = final10Mode && effectiveMax < 10;

  // Calculate intensity based on how close we are to 1
  // Uses exponential scale: closer to 1 = more intense
  // Range: currentMax 9 → ~0.15, currentMax 2 → ~0.95
  const calculateIntensity = (max: number): number => {
    if (max >= 10 || !final10Mode) return 0;
    // Exponential curve for dramatic increase as we approach 1-2
    return Math.pow((10 - max) / 9, 0.6);
  };

  const intensity = calculateIntensity(effectiveMax);

  // Track previous isRolling to detect transitions
  // Initialize to false to ensure we detect first transition to true
  const prevIsRollingRef = useRef<boolean>(false);

  // Handle animation start/stop based on isRolling transitions
  useEffect(() => {
    const wasRolling = prevIsRollingRef.current;
    const isNowRolling = isRolling;

    // Transition: false → true (start animation)
    if (!wasRolling && isNowRolling) {
      // Store the current max at the start of animation
      animationMaxRef.current = currentMax;
      setShowDeathRoll(false);
      setShowMaxRoll(false);

      // Calculate animation speed based on intensity
      // Use the NEW animationMaxRef value to determine if we're in Final 10
      const animationIntensity = calculateIntensity(animationMaxRef.current);
      const isAnimationFinal10 = final10Mode && animationMaxRef.current < 10;
      const animationSpeed = isAnimationFinal10 ? 50 + (animationIntensity * 30) : 50;

      intervalRef.current = setInterval(() => {
        playDiceRollSound();
        const max = animationMaxRef.current;
        const randomValue = Math.floor(Math.random() * max) + 1;
        setDisplayValue(randomValue);
      }, animationSpeed);
    }

    // Transition: true → false (stop animation and show result)
    if (wasRolling && !isNowRolling && lastRoll !== null) {
      // Clear the interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      setDisplayValue(lastRoll);

      // Only show DEATH ROLL after animation completes and result is 1
      if (lastRoll === 1) {
        setShowDeathRoll(true);
        if (isMyLoss) {
          vibrateDeathRoll();
        } else {
          vibrateRoundEnded();
        }
        playDeathSound();
      }

      // Show MAX ROLL if rolled the maximum value
      const rollMax = lastMaxRoll !== null && lastMaxRoll !== undefined ? lastMaxRoll : animationMaxRef.current;
      if (lastRoll === rollMax && rollMax > 1) {
        setShowMaxRoll(true);
        vibrateMaxRoll();
        playMaxRollSound();
      }

      // Notify parent animation is complete
      onAnimationComplete?.();
    }

    // Update the ref for next render
    prevIsRollingRef.current = isRolling;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRolling, lastRoll, currentMax, final10Mode, onAnimationComplete]);

  // Determine what range to show - during animation use stored max
  const displayMax = isRolling ? animationMaxRef.current : currentMax;

  // Dynamic styling based on intensity
  const borderWidth = inFinal10 ? 3 + (intensity * 3) : 0; // 3px → 6px
  const shadowBlur = inFinal10 ? 20 + (intensity * 30) : 0; // 20px → 50px
  const shadowOpacity = inFinal10 ? 0.5 + (intensity * 0.4) : 0; // 0.5 → 0.9
  const pulseSpeed = inFinal10 ? 1 - (intensity * 0.4) : 1; // 1s → 0.6s (faster pulse)

  return (
    <div className="text-center py-8">
      {/* Final 10 indicator - only show when in Final 10 mode */}
      {inFinal10 && (
        <div className="text-xl text-[var(--danger)] font-bold mb-2 animate-pulse">
          🔥 FINAL {effectiveMax}! 🔥
        </div>
      )}
      <div className="text-[var(--muted)] mb-2">Rolling 1-{displayMax.toLocaleString()}</div>

      {/* Container with red pulsing border in Final 10 mode */}
      <div
        className={`inline-block rounded-lg transition-all duration-300 ${
          inFinal10 ? "p-4" : ""
        }`}
        style={{
          border: inFinal10 ? `${borderWidth}px solid rgb(239, 68, 68)` : "none",
          boxShadow: inFinal10 ? `0 0 ${shadowBlur}px rgba(239, 68, 68, ${shadowOpacity})` : "none",
          animation: inFinal10 ? `borderPulse ${pulseSpeed}s ease-in-out infinite` : "none",
        }}
      >
        <div
          className={`text-8xl font-bold transition-all duration-200 ${
            isRolling ? "scale-110 text-[var(--accent)]" : ""
          } ${showDeathRoll ? "text-[var(--danger)]" : ""} ${showMaxRoll ? "text-[var(--success)]" : ""}`}
        >
          {displayValue?.toLocaleString() ?? "?"}
        </div>
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

      {/* CSS for Final 10 mode animations */}
      <style jsx>{`
        @keyframes borderPulse {
          0%, 100% {
            border-color: rgb(239, 68, 68);
            filter: brightness(1);
          }
          50% {
            border-color: rgb(239, 68, 68);
            filter: brightness(1.3) drop-shadow(0 0 10px rgba(239, 68, 68, 0.8));
          }
        }

        /* Respect user's reduced motion preference */
        @media (prefers-reduced-motion: reduce) {
          div {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
});
