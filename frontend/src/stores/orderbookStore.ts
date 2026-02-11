import { create } from "zustand";

type OrderType = "buy" | "sell";
type Outcome = "yes" | "no";

interface OrderBookState {
  selectedOutcome: Outcome;
  orderType: OrderType;
  price: string;
  quantity: string;
  setOutcome: (outcome: Outcome) => void;
  setOrderType: (type: OrderType) => void;
  setPrice: (price: string) => void;
  setQuantity: (quantity: string) => void;
  reset: () => void;
}

export const useOrderBookStore = create<OrderBookState>((set) => ({
  selectedOutcome: "yes",
  orderType: "buy",
  price: "",
  quantity: "",

  setOutcome: (outcome) => set({ selectedOutcome: outcome }),
  setOrderType: (type) => set({ orderType: type }),
  setPrice: (price) => set({ price }),
  setQuantity: (quantity) => set({ quantity }),
  reset: () => set({ selectedOutcome: "yes", orderType: "buy", price: "", quantity: "" }),
}));
