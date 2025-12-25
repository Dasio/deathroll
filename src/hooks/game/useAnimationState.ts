import { useState, useEffect, useCallback, useRef } from "react";
import { GameState } from "@/types/game";

export interface AnimationState {
  animationComplete: boolean;
  handleAnimationComplete: () => void;
}

export function useAnimationState(
  gameState: GameState,
  onAnimationComplete?: (state: GameState) => void
): AnimationState {
  const [animationComplete, setAnimationComplete] = useState(true);

  // Track when animation starts (use isRolling flag)
  useEffect(() => {
    if (gameState.isRolling) {
      setAnimationComplete(false);
    }
  }, [gameState.isRolling]);

  // Set animation complete when roll-twice picker is shown
  useEffect(() => {
    if (!gameState.isRolling && gameState.rollTwiceResults) {
      setAnimationComplete(true);
    }
  }, [gameState.isRolling, gameState.rollTwiceResults]);

  // Use ref for latest gameState AND callback to avoid identity changes during animation
  const gameStateRef = useRef(gameState);
  const onAnimationCompleteRef = useRef(onAnimationComplete);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    onAnimationCompleteRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  // Handle animation completion - show loser notification after dice animation
  // IMPORTANT: Empty dependencies to keep callback stable during animation!
  const handleAnimationComplete = useCallback(() => {
    setAnimationComplete(true);
    const currentState = gameStateRef.current;
    const callback = onAnimationCompleteRef.current;
    if (callback) {
      callback(currentState);
    }
  }, []); // Empty deps = stable callback

  return {
    animationComplete,
    handleAnimationComplete,
  };
}
