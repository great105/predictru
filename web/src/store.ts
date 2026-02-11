import { create } from "zustand";
import type { UserBrief, TelegramLoginData } from "./types";
import { authApi } from "./api";

interface AuthState {
  user: UserBrief | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (data: TelegramLoginData) => Promise<void>;
  restore: () => void;
  updateBalance: (balance: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem("token"),
  isLoading: false,
  isAuthenticated: !!localStorage.getItem("token"),

  login: async (data: TelegramLoginData) => {
    set({ isLoading: true });
    try {
      const res = await authApi.telegramLogin(data);
      localStorage.setItem("token", res.access_token);
      localStorage.setItem("user", JSON.stringify(res.user));
      set({
        token: res.access_token,
        user: res.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
      throw new Error("Auth failed");
    }
  },

  restore: () => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (token && userStr) {
      set({
        token,
        user: JSON.parse(userStr),
        isAuthenticated: true,
      });
    }
  },

  updateBalance: (balance: number) =>
    set((s) => (s.user ? { user: { ...s.user, balance } } : {})),

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ token: null, user: null, isAuthenticated: false });
  },
}));

interface TradeState {
  outcome: "yes" | "no";
  amount: string;
  setOutcome: (o: "yes" | "no") => void;
  setAmount: (a: string) => void;
  reset: () => void;
}

export const useTradeStore = create<TradeState>((set) => ({
  outcome: "yes",
  amount: "",
  setOutcome: (outcome) => set({ outcome }),
  setAmount: (amount) => set({ amount }),
  reset: () => set({ outcome: "yes", amount: "" }),
}));
