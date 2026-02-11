import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { Market } from "../types";

const CATEGORY_LABELS: Record<string, string> = {
  general: "Общее",
  sports: "Спорт",
  crypto: "Крипто",
  politics: "Политика",
  tech: "Технологии",
  entertainment: "Развлечения",
  science: "Наука",
};

function timeLeft(closes: string): string {
  const diff = new Date(closes).getTime() - Date.now();
  if (diff <= 0) return "Закрыт";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}д ${hours}ч`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}ч ${mins}м`;
}

export default function MarketCard({ market, index = 0 }: { market: Market; index?: number }) {
  const yesPercent = Math.round(market.price_yes * 100);
  const noPercent = 100 - yesPercent;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
    >
      <Link
        to={`/market/${market.id}`}
        className="block card card-hover card-glow p-5 lg:p-6 h-full group"
      >
        {/* Top row: category + time */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-txt-muted bg-base-600 px-2.5 py-1 rounded-md">
              {CATEGORY_LABELS[market.category] ?? market.category}
            </span>
            {market.amm_type === "clob" && (
              <span className="text-[10px] font-mono text-amber bg-amber/10 px-2 py-0.5 rounded-md">CLOB</span>
            )}
          </div>
          <span className={`text-xs font-medium ${market.status === "open" ? "text-yes" : "text-txt-muted"}`}>
            {market.status === "open" ? timeLeft(market.closes_at) : market.status === "resolved" ? "Решён" : "Закрыт"}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-display font-semibold text-base leading-snug mb-5 group-hover:text-brand transition-colors duration-200 line-clamp-2 min-h-[2.75rem]">
          {market.title}
        </h3>

        {/* Price bar */}
        <div className="relative h-10 rounded-lg overflow-hidden bg-base-700 mb-4">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-yes/25 to-yes/5 transition-all duration-700"
            style={{ width: `${yesPercent}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-between px-4">
            <span className="text-sm font-mono font-bold text-yes">{yesPercent}% Да</span>
            <span className="text-sm font-mono font-bold text-no">{noPercent}% Нет</span>
          </div>
        </div>

        {/* Bottom stats */}
        <div className="flex items-center justify-between text-xs text-txt-muted">
          <span className="font-mono">
            {Number(market.total_volume).toLocaleString("ru-RU")} PRC
          </span>
          <span>{market.total_traders} трейдеров</span>
        </div>
      </Link>
    </motion.div>
  );
}
