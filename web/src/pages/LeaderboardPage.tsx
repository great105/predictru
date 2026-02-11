import { useState } from "react";
import { motion } from "framer-motion";
import { useLeaderboard } from "../hooks";

const PERIODS = [
  { value: "all", label: "Все время" },
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
];

const MEDALS: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

const PODIUM_COLORS = [
  "border-l-amber border-amber/15 bg-amber/5",
  "border-l-gray-400 border-gray-400/15 bg-gray-400/5",
  "border-l-orange-600 border-orange-600/15 bg-orange-600/5",
];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState("all");
  const { data: entries, isLoading } = useLeaderboard(period);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl lg:text-4xl font-display font-extrabold tracking-tight">Рейтинг трейдеров</h1>
          <p className="text-sm text-txt-secondary mt-2">
            Лучшие трейдеры платформы по общей прибыли
          </p>
        </div>
      </motion.div>

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
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse flex items-center gap-4">
              <div className="w-8 h-8 shimmer rounded-full" />
              <div className="flex-1">
                <div className="h-4 shimmer rounded w-1/3 mb-2" />
                <div className="h-3 shimmer rounded w-1/4" />
              </div>
              <div className="h-5 shimmer rounded w-20" />
            </div>
          ))}
        </div>
      ) : !entries?.length ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-base-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-txt-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.853m0 0l.5 4.669m-.5-4.669a6.023 6.023 0 01-2.77-.853m5.54 0l-.5 4.669m-4.54-4.669l-.5 4.669m0 0a62.24 62.24 0 00-.21 3.172M9.497 14.25l.5-4.669" />
            </svg>
          </div>
          <p className="text-txt-secondary font-medium">Рейтинг пуст</p>
          <p className="text-txt-muted text-sm mt-1">Пока никто не совершил сделок</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop table header */}
          <div className="hidden lg:grid grid-cols-[60px_1fr_120px_120px_140px] gap-4 px-6 py-3 border-b border-line text-[10px] text-txt-muted uppercase tracking-wider font-medium">
            <span>#</span>
            <span>Трейдер</span>
            <span className="text-right">Сделки</span>
            <span className="text-right">Winrate</span>
            <span className="text-right">Прибыль</span>
          </div>

          <div className="divide-y divide-line">
            {entries.map((entry, i) => {
              const isTop3 = i < 3;
              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`px-6 py-4 flex items-center gap-4 transition-colors hover:bg-base-800/50 ${
                    isTop3 ? `border-l-2 ${PODIUM_COLORS[i]}` : ""
                  }`}
                >
                  {/* Rank */}
                  <div className="w-[36px] text-center shrink-0">
                    {isTop3 ? (
                      <span className="text-xl">{MEDALS[i]}</span>
                    ) : (
                      <span className="text-sm font-mono text-txt-muted font-medium">{entry.rank}</span>
                    )}
                  </div>

                  {/* Avatar + name */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 font-display ${
                      isTop3 ? "bg-brand/15 text-brand" : "bg-base-600 text-txt-muted"
                    }`}>
                      {entry.first_name?.[0] ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {entry.first_name}
                        {entry.username && (
                          <span className="text-txt-muted ml-2 text-xs font-normal">@{entry.username}</span>
                        )}
                      </p>
                      <p className="text-[10px] text-txt-muted lg:hidden">
                        {entry.total_trades} сделок · {(entry.win_rate * 100).toFixed(0)}% winrate
                      </p>
                    </div>
                  </div>

                  {/* Stats — desktop only */}
                  <div className="hidden lg:block w-[120px] text-right">
                    <span className="text-sm font-mono text-txt-secondary">{entry.total_trades}</span>
                  </div>
                  <div className="hidden lg:block w-[120px] text-right">
                    <span className="text-sm font-mono text-amber">{(entry.win_rate * 100).toFixed(0)}%</span>
                  </div>

                  {/* Profit */}
                  <div className="w-[140px] text-right shrink-0">
                    <p className={`text-sm font-bold font-mono ${
                      entry.total_profit >= 0 ? "text-yes" : "text-no"
                    }`}>
                      {entry.total_profit >= 0 ? "+" : ""}
                      {Number(entry.total_profit).toLocaleString("ru-RU")}
                    </p>
                    <p className="text-[10px] text-txt-muted">PRC</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
