import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/api/endpoints";
import { useAuthStore } from "@/stores/authStore";
import { useWebApp } from "@/hooks/useWebApp";

export function DailyBonusButton() {
  const user = useAuthStore((s) => s.user);
  const updateBalance = useAuthStore((s) => s.updateBalance);
  const { haptic } = useWebApp();
  const queryClient = useQueryClient();
  const [timeLeft, setTimeLeft] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const alreadyClaimed = user?.daily_bonus_claimed_at === today;

  const mutation = useMutation({
    mutationFn: () => usersApi.dailyBonus(),
    onSuccess: ({ data }) => {
      updateBalance(data.new_balance);
      haptic?.notificationOccurred("success");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  useEffect(() => {
    if (!alreadyClaimed) return;

    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);

      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60_000);
    return () => clearInterval(interval);
  }, [alreadyClaimed]);

  return (
    <button
      onClick={() => !alreadyClaimed && mutation.mutate()}
      disabled={alreadyClaimed || mutation.isPending}
      className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
        alreadyClaimed
          ? "bg-gray-100 text-gray-400"
          : "bg-gradient-to-r from-yellow-400 to-orange-400 text-white active:opacity-80"
      }`}
    >
      {alreadyClaimed
        ? `Next bonus in ${timeLeft}`
        : mutation.isPending
        ? "Claiming..."
        : "Claim Daily Bonus (+50 PRC)"}
    </button>
  );
}
