import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/api/endpoints";
import { Skeleton } from "@/components/Skeleton";
import { formatPRC, formatPercent } from "@/utils/format";

const PERIODS = [
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
  { key: "all", label: "Всё время" },
];

export function LeaderboardPage() {
  const [period, setPeriod] = useState("all");

  const { data: entries, isLoading } = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: async () => {
      const { data } = await usersApi.leaderboard(period);
      return data;
    },
  });

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold mb-4">Рейтинг</h1>

      {/* Period tabs */}
      <div className="flex gap-2 mb-4">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p.key
                ? "bg-tg-button text-tg-button-text"
                : "bg-tg-secondary text-tg-text"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Leaderboard list */}
      <div className="space-y-2">
        {isLoading &&
          Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}

        {entries?.map((entry, idx) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border border-gray-100"
          >
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                idx === 0
                  ? "bg-yellow-100 text-yellow-700"
                  : idx === 1
                  ? "bg-gray-100 text-gray-600"
                  : idx === 2
                  ? "bg-orange-100 text-orange-700"
                  : "bg-tg-secondary text-tg-hint"
              }`}
            >
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {entry.first_name}
                {entry.username ? ` @${entry.username}` : ""}
              </div>
              <div className="text-xs text-tg-hint">
                {entry.total_trades} ставок | Побед: {formatPercent(entry.win_rate / 100)}
              </div>
            </div>
            <div
              className={`text-sm font-semibold ${
                entry.total_profit >= 0 ? "text-yes-dark" : "text-no-dark"
              }`}
            >
              {entry.total_profit >= 0 ? "+" : ""}
              {formatPRC(entry.total_profit)}
            </div>
          </div>
        ))}

        {!isLoading && (!entries || entries.length === 0) && (
          <div className="text-center text-tg-hint py-12">
            Нет данных рейтинга
          </div>
        )}
      </div>
    </div>
  );
}
