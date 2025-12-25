import { Button } from "@/components/ui/Button";
import { GameState } from "@/types/game";

export interface CoinAbilityControlsProps {
  gameState: GameState;
  currentPlayerId: string;
  localRollTwice: boolean;
  setLocalRollTwice: (value: boolean) => void;
  localNextPlayerOverride: string | null;
  setLocalNextPlayerOverride: (value: string | null) => void;
  localSkipRoll: boolean;
  setLocalSkipRoll: (value: boolean) => void;
  showPlayerSelector: boolean;
  setShowPlayerSelector: (value: boolean) => void;
}

export function CoinAbilityControls({
  gameState,
  currentPlayerId,
  localRollTwice,
  setLocalRollTwice,
  localNextPlayerOverride,
  setLocalNextPlayerOverride,
  localSkipRoll,
  setLocalSkipRoll,
  showPlayerSelector,
  setShowPlayerSelector,
}: CoinAbilityControlsProps) {
  const activePlayers = gameState.players.filter((p) => !p.isSpectator && p.isConnected);
  const myPlayer = gameState.players.find((p) => p.id === currentPlayerId);
  const canAfford = myPlayer && myPlayer.coins >= 1;
  const canAffordSkipRoll = myPlayer && myPlayer.coins >= 2;
  const isChooseNextActive = localNextPlayerOverride !== null;
  const hasChoice = activePlayers.length > 2;

  return (
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex gap-2 justify-center flex-wrap">
        {/* Choose Next Player Button - only show with 3+ players */}
        {hasChoice && (
          <Button
            variant={isChooseNextActive ? "primary" : "secondary"}
            size="sm"
            onClick={() => {
              if (isChooseNextActive) {
                // Cancel
                setLocalNextPlayerOverride(null);
                setShowPlayerSelector(false);
              } else {
                // Show selector
                setShowPlayerSelector(!showPlayerSelector);
              }
            }}
            disabled={!isChooseNextActive && !canAfford}
            className="text-sm"
          >
            {isChooseNextActive ? "✓ Next Player Set (click to cancel)" : `🎯 Choose Next (1 🪙)`}
          </Button>
        )}

        {/* Roll Twice Button */}
        <Button
          variant={localRollTwice ? "primary" : "secondary"}
          size="sm"
          onClick={() => setLocalRollTwice(!localRollTwice)}
          disabled={!localRollTwice && !canAfford}
          className="text-sm"
        >
          {localRollTwice ? "✓ Roll Twice (click to cancel)" : `🎲 Roll Twice (1 🪙)`}
        </Button>

        {/* Skip Roll Button */}
        <Button
          variant={localSkipRoll ? "primary" : "secondary"}
          size="sm"
          onClick={() => setLocalSkipRoll(!localSkipRoll)}
          disabled={!localSkipRoll && !canAffordSkipRoll}
          className="text-sm"
        >
          {localSkipRoll ? "✓ Skip Roll (click to cancel)" : `⏭️ Skip Roll (2 🪙)`}
        </Button>
      </div>

      {/* Player Selector */}
      {showPlayerSelector && (
        <div className="p-3 bg-[var(--background)] rounded border border-[var(--border)]">
          <div className="text-sm font-semibold mb-2">Choose who goes next:</div>
          <div className="grid grid-cols-2 gap-2">
            {gameState.players
              .filter((p) => p.id !== currentPlayerId && !p.isSpectator && p.isConnected)
              .map((player) => (
                <Button
                  key={player.id}
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setLocalNextPlayerOverride(player.id);
                    setShowPlayerSelector(false);
                  }}
                  className="text-xs"
                >
                  {player.emoji} {player.name}
                </Button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
