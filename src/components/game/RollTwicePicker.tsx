import { Button } from "@/components/ui/Button";

export interface RollTwicePickerProps {
  rollTwiceResults: number[];
  onChooseRoll: (roll: number) => void;
}

export function RollTwicePicker({ rollTwiceResults, onChooseRoll }: RollTwicePickerProps) {
  return (
    <div className="mb-4 p-4 bg-[var(--accent)]/10 rounded border border-[var(--accent)]">
      <div className="text-sm font-semibold mb-3 text-center">
        Pick your roll:
      </div>
      <div className="flex gap-3 justify-center">
        {rollTwiceResults.map((roll, index) => (
          <Button
            key={index}
            size="lg"
            onClick={() => onChooseRoll(roll)}
            className="px-8 py-6 text-2xl font-bold"
          >
            {roll.toLocaleString()}
          </Button>
        ))}
      </div>
    </div>
  );
}
