import { useState } from "react";

export interface CoinAbilityState {
  showPlayerSelector: boolean;
  setShowPlayerSelector: (value: boolean) => void;
  localRollTwice: boolean;
  setLocalRollTwice: (value: boolean) => void;
  localNextPlayerOverride: string | null;
  setLocalNextPlayerOverride: (value: string | null) => void;
  resetCoinState: () => void;
}

export function useCoinAbilityState(): CoinAbilityState {
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [localRollTwice, setLocalRollTwice] = useState(false);
  const [localNextPlayerOverride, setLocalNextPlayerOverride] = useState<string | null>(null);

  const resetCoinState = () => {
    setLocalRollTwice(false);
    setLocalNextPlayerOverride(null);
    setShowPlayerSelector(false);
  };

  return {
    showPlayerSelector,
    setShowPlayerSelector,
    localRollTwice,
    setLocalRollTwice,
    localNextPlayerOverride,
    setLocalNextPlayerOverride,
    resetCoinState,
  };
}
