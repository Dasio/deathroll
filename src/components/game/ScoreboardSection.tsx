import { Card } from "@/components/ui/Card";
import { PlayerList } from "@/components/game/PlayerList";
import { TeamList } from "@/components/game/TeamList";
import { GameState } from "@/types/game";

export interface ScoreboardSectionProps {
  gameState: GameState;
  currentPlayerId?: string;
  myPlayerId?: string;
  lastLoserId?: string | null;
  showLoserNotification: boolean;
  onKick?: (playerId: string) => void;
}

export function ScoreboardSection({
  gameState,
  currentPlayerId,
  myPlayerId,
  lastLoserId,
  showLoserNotification,
  onKick,
}: ScoreboardSectionProps) {
  return (
    <Card className="mb-6">
      <h2 className="text-lg font-semibold mb-4">Scoreboard</h2>
      {gameState.teamMode && gameState.teams.length > 0 ? (
        <TeamList
          teams={gameState.teams}
          players={gameState.players}
          currentPlayerId={currentPlayerId}
          myPlayerId={myPlayerId}
          lastLoserTeamId={showLoserNotification ? gameState.lastLoserTeamId ?? undefined : undefined}
          showScores
        />
      ) : (
        <PlayerList
          players={gameState.players}
          currentPlayerId={currentPlayerId}
          myPlayerId={myPlayerId}
          lastLoserId={showLoserNotification ? lastLoserId ?? undefined : undefined}
          showScores
          showCoins={gameState.coinsEnabled}
          onKick={onKick}
        />
      )}
    </Card>
  );
}
