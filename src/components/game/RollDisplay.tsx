"use client";

import { useEffect, useState, useRef, memo } from "react";
import {
  playDiceRollSound,
  playDeathSound,
  playMaxRollSound,
  playDramaticDropSound,
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
  const [showDramaticDrop, setShowDramaticDrop] = useState(false);
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
      setShowDramaticDrop(false);

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

      // Check for dramatic drop (90%+ drop in range)
      // Roll must be ≤10% of previous max (and not a death roll)
      if (lastRoll > 1 && rollMax > 10) {
        const dropPercentage = lastRoll / rollMax;
        if (dropPercentage <= 0.1) {
          // 90%+ drop detected!
          setShowDramaticDrop(true);
          playDramaticDropSound();

          // Clear the effect after animation completes
          setTimeout(() => {
            setShowDramaticDrop(false);
          }, 1500);
        }
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
    <div className={`text-center py-8 ${showDramaticDrop ? "dramatic-shake" : ""}`}>
      {/* Final 10 indicator - only show when in Final 10 mode */}
      {inFinal10 && (
        <div className="text-xl text-[var(--danger)] font-bold mb-2 animate-pulse">
          🔥 FINAL {effectiveMax}! 🔥
        </div>
      )}
      <div className="text-[var(--muted)] mb-2">Rolling 1-{displayMax.toLocaleString()}</div>

      {/* Container with red pulsing border in Final 10 mode OR dramatic drop glow */}
      <div
        className={`inline-block rounded-lg transition-all duration-300 ${
          inFinal10 || showDramaticDrop ? "p-4" : ""
        } ${showDramaticDrop ? "relative" : ""}`}
        style={{
          border: showDramaticDrop
            ? "4px solid rgb(251, 146, 60)"
            : inFinal10
            ? `${borderWidth}px solid rgb(239, 68, 68)`
            : "none",
          boxShadow: showDramaticDrop
            ? "0 0 40px rgba(251, 146, 60, 0.9), 0 0 80px rgba(251, 146, 60, 0.5)"
            : inFinal10
            ? `0 0 ${shadowBlur}px rgba(239, 68, 68, ${shadowOpacity})`
            : "none",
          animation: showDramaticDrop
            ? "dramaticPulse 0.6s ease-out"
            : inFinal10
            ? `borderPulse ${pulseSpeed}s ease-in-out infinite`
            : "none",
        }}
      >
        {/* Particle burst effect */}
        {showDramaticDrop && (
          <>
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="particle"
                style={{
                  "--angle": `${i * 30}deg`,
                  animationDelay: `${i * 0.03}s`,
                } as React.CSSProperties}
              />
            ))}
          </>
        )}

        <div
          className={`text-8xl font-bold transition-all duration-200 ${
            isRolling ? "scale-110 text-[var(--accent)]" : ""
          } ${showDeathRoll ? "text-[var(--danger)]" : ""} ${
            showMaxRoll ? "text-[var(--success)]" : ""
          } ${showDramaticDrop ? "text-orange-500" : ""}`}
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

      {/* CSS for animations */}
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

        @keyframes dramaticPulse {
          0% {
            transform: scale(1);
            filter: brightness(1);
          }
          15% {
            transform: scale(1.15);
            filter: brightness(1.5) drop-shadow(0 0 30px rgba(251, 146, 60, 1));
          }
          30% {
            transform: scale(0.95);
          }
          45% {
            transform: scale(1.05);
            filter: brightness(1.3);
          }
          100% {
            transform: scale(1);
            filter: brightness(1);
          }
        }

        @keyframes dramaticShake {
          0%, 100% {
            transform: translateX(0);
          }
          10% {
            transform: translateX(-8px) translateY(2px);
          }
          20% {
            transform: translateX(8px) translateY(-2px);
          }
          30% {
            transform: translateX(-6px) translateY(1px);
          }
          40% {
            transform: translateX(6px) translateY(-1px);
          }
          50% {
            transform: translateX(-4px) translateY(2px);
          }
          60% {
            transform: translateX(4px) translateY(-2px);
          }
          70% {
            transform: translateX(-2px) translateY(1px);
          }
          80% {
            transform: translateX(2px) translateY(-1px);
          }
          90% {
            transform: translateX(-1px);
          }
        }

        @keyframes particleBurst {
          0% {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(0);
            opacity: 1;
            scale: 1;
          }
          100% {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(120px);
            opacity: 0;
            scale: 0.3;
          }
        }

        .dramatic-shake {
          animation: dramaticShake 0.5s ease-in-out;
        }

        .particle {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 12px;
          height: 12px;
          background: linear-gradient(135deg, rgb(251, 146, 60), rgb(251, 191, 36));
          border-radius: 50%;
          animation: particleBurst 0.8s ease-out forwards;
          box-shadow: 0 0 8px rgba(251, 146, 60, 0.8);
        }

        /* Respect user's reduced motion preference */
        @media (prefers-reduced-motion: reduce) {
          div {
            animation: none !important;
          }
          .particle {
            display: none;
          }
        }
      `}</style>
    </div>
  );
});
