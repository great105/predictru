import { useAuthStore } from "@/stores/authStore";
import { formatPRC } from "@/utils/format";

export function BalanceDisplay() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  return (
    <div className="flex items-center gap-1 bg-tg-secondary rounded-full px-3 py-1.5">
      <span className="text-sm font-semibold">🪙 {formatPRC(user.balance)}</span>
    </div>
  );
}
