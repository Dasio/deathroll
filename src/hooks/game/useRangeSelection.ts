import { useState } from "react";

export interface RangeSelectionState {
  customRange: number | null;
  setCustomRange: (value: number | null) => void;
  sessionMaxRoll: number | null;
  setSessionMaxRoll: (value: number | null) => void;
}

export function useRangeSelection(): RangeSelectionState {
  const [customRange, setCustomRange] = useState<number | null>(null);
  const [sessionMaxRoll, setSessionMaxRoll] = useState<number | null>(null);

  return {
    customRange,
    setCustomRange,
    sessionMaxRoll,
    setSessionMaxRoll,
  };
}
