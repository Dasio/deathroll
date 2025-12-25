import { useState, useEffect } from "react";
import { GameState, Player } from "@/types/game";

export interface LoserNotificationState {
  showLoserNotification: boolean;
  notificationLoserId: string | null;
  lastLoser: Player | undefined;
  setNotificationLoserId: (id: string | null) => void;
  setShowLoserNotification: (show: boolean) => void;
}

export function useLoserNotification(gameState: GameState): LoserNotificationState {
  const [showLoserNotification, setShowLoserNotification] = useState(false);
  const [notificationLoserId, setNotificationLoserId] = useState<string | null>(null);

  // Reset notification when a new roll starts (lastLoserId becomes null)
  useEffect(() => {
    if (!gameState.lastLoserId) {
      setShowLoserNotification(false);
      setNotificationLoserId(null);
    }
  }, [gameState.lastLoserId]);

  // Find the loser player
  const lastLoser = gameState.players.find((p) => p.id === notificationLoserId);

  return {
    showLoserNotification,
    notificationLoserId,
    lastLoser,
    setNotificationLoserId,
    setShowLoserNotification,
  };
}
