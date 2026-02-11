import { create } from "zustand";

interface TradeState {
  selectedOutcome: "yes" | "no";
  amount: string;
  estimatedShares: number;
  setOutcome: (outcome: "yes" | "no") => void;
  setAmount: (amount: string) => void;
  setEstimatedShares: (shares: number) => void;
  reset: () => void;
}

export const useTradeStore = create<TradeState>((set) => ({
  selectedOutcome: "yes",
  amount: "",
  estimatedShares: 0,

  setOutcome: (outcome) => set({ selectedOutcome: outcome }),
  setAmount: (amount) => set({ amount }),
  setEstimatedShares: (shares) => set({ estimatedShares: shares }),
  reset: () => set({ selectedOutcome: "yes", amount: "", estimatedShares: 0 }),
}));
