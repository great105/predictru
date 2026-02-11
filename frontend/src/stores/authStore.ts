import { create } from "zustand";
import { authApi, usersApi } from "@/api/endpoints";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  authenticate: (initData: string) => Promise<void>;
  updateBalance: (balance: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem("token"),
  isLoading: false,
  error: null,

  authenticate: async (initData: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authApi.telegram(initData);
      localStorage.setItem("token", data.access_token);
      set({ token: data.access_token });
      // Fetch full profile (auth returns only brief user without stats)
      const { data: profile } = await usersApi.me();
      set({ user: profile, isLoading: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ isLoading: false, error: `Auth failed: ${msg}` });
    }
  },

  updateBalance: (balance: number) => {
    set((state) => ({
      user: state.user ? { ...state.user, balance } : null,
    }));
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null });
  },
}));
