import { Link } from "react-router-dom";
import type { PrivateBet } from "@/types";
import { formatTimeLeft, formatPRC } from "@/utils/format";
import { useWebApp } from "@/hooks/useWebApp";

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  open: { text: "Открыт", color: "text-green-400" },
  voting: { text: "Голосование", color: "text-amber-400" },
  resolved: { text: "Завершён", color: "text-blue-400" },
  cancelled: { text: "Отменён", color: "text-tg-hint" },
};

export function BetCard({ bet }: { bet: PrivateBet }) {
  const { haptic } = useWebApp();
  const total = bet.yes_count + bet.no_count;
  const yesPercent = total > 0 ? Math.round((bet.yes_count / total) * 100) : 50;
  const statusInfo = STATUS_LABELS[bet.status] ?? STATUS_LABELS.open;

  return (
    <Link
      to={`/bet/${bet.id}`}
      onClick={() => haptic?.impactOccurred("light")}
      className="block glass-card p-4 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-medium leading-tight flex-1">{bet.title}</h3>
        <span className={`text-xs font-medium shrink-0 ${statusInfo.color}`}>
          {statusInfo.text}
        </span>
      </div>

      {/* YES/NO bar */}
      <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
          style={{ width: `${yesPercent}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-tg-hint mb-1">
        <span>
          ДА <span className="text-green-400">{bet.yes_count}</span>
        </span>
        <span>
          <span className="text-red-400">{bet.no_count}</span> НЕТ
        </span>
      </div>

      <div className="flex justify-between items-center text-xs text-tg-hint">
        <span>{formatPRC(bet.stake_amount)} / чел.</span>
        <span>Банк: {formatPRC(bet.total_pool)}</span>
      </div>

      <div className="flex justify-between items-center mt-1 text-xs text-tg-hint">
        <span>от {bet.creator_name}</span>
        <span>
          {bet.status === "open"
            ? formatTimeLeft(bet.closes_at)
            : bet.status === "voting"
              ? `Голос. ${formatTimeLeft(bet.voting_deadline)}`
              : ""}
        </span>
      </div>
    </Link>
  );
}
