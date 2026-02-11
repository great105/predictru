import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { Market } from "../types";

const CATEGORY_ICONS: Record<string, string> = {
  general: "🌐",
  sports: "⚽",
  crypto: "₿",
  politics: "🏛️",
  tech: "💻",
  entertainment: "🎬",
  science: "🔬",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-yes/10 text-yes",
  trading_closed: "bg-gold/10 text-gold",
  resolved: "bg-accent/10 text-accent",
  cancelled: "bg-surface-4 text-muted",
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
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link
        to={`/market/${market.id}`}
        className="block glass rounded-2xl p-5 glass-hover transition-all duration-300 group"
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{CATEGORY_ICONS[market.category] ?? "📊"}</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[market.status] ?? STATUS_STYLES.open}`}>
              {market.status === "open" ? timeLeft(market.closes_at) : market.status === "resolved" ? "Решён" : market.status}
            </span>
            {market.amm_type === "clob" && (
              <span className="text-[10px] font-mono text-muted bg-surface-4 px-1.5 py-0.5 rounded">CLOB</span>
            )}
          </div>
          {market.is_featured && (
            <span className="text-gold text-xs">★</span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold leading-snug mb-4 group-hover:text-white transition-colors line-clamp-2">
          {market.title}
        </h3>

        {/* Price bar */}
        <div className="relative h-8 rounded-lg overflow-hidden bg-surface-3 mb-3">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-yes/30 to-yes/10 transition-all duration-500"
            style={{ width: `${yesPercent}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-mono font-semibold">
            <span className="text-yes">{yesPercent}% Да</span>
            <span className="text-no">{noPercent}% Нет</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-[11px] text-muted">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {Number(market.total_volume).toLocaleString("ru-RU")} PRC
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            {market.total_traders}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
