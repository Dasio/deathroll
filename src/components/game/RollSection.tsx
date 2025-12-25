import { Card } from "@/components/ui/Card";
import { RollDisplay } from "@/components/game/RollDisplay";
import { GameState } from "@/types/game";

export interface RollSectionProps {
  gameState: GameState;
  onAnimationComplete: () => void;
  showRollTwicePicker?: boolean;
  rollTwicePickerContent?: React.ReactNode;
  isMyLoss?: boolean;
}

export function RollSection({
  gameState,
  onAnimationComplete,
  showRollTwicePicker,
  rollTwicePickerContent,
  isMyLoss,
}: RollSectionProps) {
  return (
    <Card className="mb-6">
      {!showRollTwicePicker || gameState.isRolling ? (
        <RollDisplay
          currentMax={gameState.currentMaxRoll}
          lastRoll={gameState.lastRoll}
          lastMaxRoll={gameState.lastMaxRoll}
          isRolling={gameState.isRolling}
          isMyLoss={isMyLoss}
          extraVisualEffects={gameState.extraVisualEffects}
          onAnimationComplete={onAnimationComplete}
        />
      ) : (
        <div className="text-center py-8">
          <div className="text-2xl font-bold mb-2">🎲🎲 Pick Your Roll</div>
          <div className="text-[var(--muted)]">Choose which result you want to keep</div>
        </div>
      )}

      {rollTwicePickerContent}
    </Card>
  );
}
