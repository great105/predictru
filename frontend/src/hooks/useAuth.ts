import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useWebApp } from "./useWebApp";

export function useAuth() {
  const { initData } = useWebApp();
  const { user, token, isLoading, error, authenticate } = useAuthStore();

  useEffect(() => {
    if (!user && !isLoading && initData) {
      authenticate(initData);
    }
  }, [user, isLoading, initData, authenticate]);

  return { user, token, isLoading, isAuthenticated: !!user, error };
}
