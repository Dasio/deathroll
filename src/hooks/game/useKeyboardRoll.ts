import { useEffect, useState } from "react";
import { GameState } from "@/types/game";
import { initializeSounds } from "@/lib/sounds";

export interface KeyboardRollParams {
  gameState: GameState;
  isMyTurn: boolean;
  animationComplete: boolean;
  canSetRange: boolean;
  customRange: number | null;
  sessionMaxRoll: number | null;
  onRoll: (rangeOverride?: number) => void;
  coinAbilityState: {
    localRollTwice: boolean;
    localNextPlayerOverride: string | null;
  };
  onCoinStateReset: () => void;
  onSetSessionMaxRoll: (value: number) => void;
  onClearCustomRange: () => void;
}

export function useKeyboardRoll(params: KeyboardRollParams): void {
  const {
    gameState,
    isMyTurn,
    animationComplete,
    canSetRange,
    customRange,
    sessionMaxRoll,
    onRoll,
    coinAbilityState,
    onCoinStateReset,
    onSetSessionMaxRoll,
    onClearCustomRange,
  } = params;

  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    if (gameState.phase !== "playing") return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle space or enter when it's my turn and animation is complete
      if ((e.key === " " || e.key === "Enter") && isMyTurn && !isRolling && animationComplete) {
        e.preventDefault();
        setIsRolling(true);
        initializeSounds();

        const rangeToUse =
          canSetRange && customRange && customRange !== gameState.currentMaxRoll
            ? customRange
            : undefined;

        // Save the chosen range for the session
        if (rangeToUse) {
          onSetSessionMaxRoll(rangeToUse);
        }

        onRoll(rangeToUse);
        onClearCustomRange();
        onCoinStateReset();
        setTimeout(() => setIsRolling(false), 500);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [
    gameState.phase,
    gameState.currentMaxRoll,
    isMyTurn,
    isRolling,
    animationComplete,
    canSetRange,
    customRange,
    sessionMaxRoll,
    onRoll,
    coinAbilityState.localRollTwice,
    coinAbilityState.localNextPlayerOverride,
    onCoinStateReset,
    onSetSessionMaxRoll,
    onClearCustomRange,
  ]);
}
