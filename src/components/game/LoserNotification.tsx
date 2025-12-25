import { Card } from "@/components/ui/Card";
import { Player } from "@/types/game";

export interface LoserNotificationProps {
  loser: Player;
  isMyLoss?: boolean;
}

export function LoserNotification({ loser, isMyLoss }: LoserNotificationProps) {
  return (
    <Card className={`mb-4 ${isMyLoss ? "bg-[var(--danger)]/20" : "bg-[var(--danger)]/10"} border-[var(--danger)]`}>
      <div className="text-center">
        {isMyLoss ? (
          <span className="text-[var(--danger)] font-bold">
            💀 YOU rolled a 1! Pick the next starting range.
          </span>
        ) : (
          <span className="text-[var(--danger)] font-bold">
            💀 {loser.name} rolled a 1!{loser.losses !== undefined && ` (Total losses: ${loser.losses})`}
          </span>
        )}
      </div>
    </Card>
  );
}
