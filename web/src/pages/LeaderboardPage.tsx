import { useState } from "react";
import { motion } from "framer-motion";
import { useLeaderboard } from "../hooks";

const PERIODS = [
  { value: "all", label: "Все время" },
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
];

const PODIUM_COLORS = [
  "from-gold/30 to-gold/5 border-gold/30",
  "from-silver/20 to-silver/5 border-silver/30",
  "from-amber-700/20 to-amber-700/5 border-amber-700/30",
];

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState("all");
  const { data: entries, isLoading } = useLeaderboard(period);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Рейтинг</h1>
          <p className="text-sm text-muted mt-1">Лучшие трейдеры платформы</p>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`chip ${period === p.value ? "chip-active" : "chip-inactive"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-surface-3 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-surface-3 rounded w-1/3" />
                  <div className="h-3 bg-surface-3 rounded w-1/4 mt-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !entries?.length ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🏆</p>
          <p className="text-muted">Рейтинг пуст</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const isTop3 = i < 3;
            return (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-xl p-4 flex items-center gap-4 transition-all ${
                  isTop3
                    ? `bg-gradient-to-r ${PODIUM_COLORS[i]} border`
                    : "glass glass-hover"
                }`}
              >
                {/* Rank */}
                <div className="w-8 text-center shrink-0">
                  {isTop3 ? (
                    <span className="text-xl">{MEDALS[i]}</span>
                  ) : (
                    <span className="text-sm font-mono text-muted font-medium">{entry.rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  isTop3 ? "bg-white/10" : "bg-surface-3"
                }`}>
                  {entry.first_name?.[0] ?? "?"}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {entry.first_name}
                    {entry.username && (
                      <span className="text-muted ml-1.5 text-xs">@{entry.username}</span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted">
                    {entry.total_trades} сделок · {(entry.win_rate * 100).toFixed(0)}% winrate
                  </p>
                </div>

                {/* Profit */}
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold font-mono ${
                    entry.total_profit >= 0 ? "text-yes" : "text-no"
                  }`}>
                    {entry.total_profit >= 0 ? "+" : ""}
                    {Number(entry.total_profit).toLocaleString("ru-RU")}
                  </p>
                  <p className="text-[10px] text-muted">PRC</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
