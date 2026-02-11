import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useMarketDetail } from "../hooks";
import TradePanel from "../components/TradePanel";
import OrderBookPanel from "../components/OrderBook";
import PriceChart from "../components/PriceChart";

function timeLeft(closes: string): string {
  const diff = new Date(closes).getTime() - Date.now();
  if (diff <= 0) return "Закрыт";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days} д ${hours} ч`;
  return `${hours} ч ${mins} мин`;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "Общее",
  politics: "Политика",
  economics: "Экономика",
  sports: "Спорт",
  crypto: "Крипто",
  tech: "Технологии",
  entertainment: "Развлечения",
  science: "Наука",
};

export default function MarketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: market, isLoading } = useMarketDetail(id!);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 shimmer rounded w-24" />
        <div className="h-8 shimmer rounded w-2/3" />
        <div className="h-4 shimmer rounded w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 h-80 shimmer rounded-xl" />
          <div className="lg:col-span-2 h-96 shimmer rounded-xl" />
        </div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="text-center py-24">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-base-700 flex items-center justify-center">
          <svg className="w-8 h-8 text-txt-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-txt-secondary font-medium">Рынок не найден</p>
        <button onClick={() => navigate("/")} className="btn-ghost mt-4">
          На главную
        </button>
      </div>
    );
  }

  const yesPercent = Math.round(market.price_yes * 100);
  const noPercent = 100 - yesPercent;
  const isClob = market.amm_type === "clob";

  return (
    <div className="space-y-6 pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => navigate("/")}
          className="text-txt-muted hover:text-brand transition-colors"
        >
          Рынки
        </button>
        <svg className="w-3.5 h-3.5 text-txt-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-txt-secondary truncate max-w-xs">{market.title}</span>
      </div>

      {/* Market header card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 lg:p-8"
      >
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            {/* Tags row */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium text-txt-muted bg-base-600 px-2.5 py-1 rounded-md">
                {CATEGORY_LABELS[market.category] ?? market.category}
              </span>
              {isClob && (
                <span className="text-[10px] font-mono text-amber bg-amber/10 px-2 py-0.5 rounded-md">CLOB</span>
              )}
              <span
                className={`badge ${
                  market.status === "open"
                    ? "badge-open"
                    : market.status === "resolved"
                      ? "badge-resolved"
                      : "badge-closed"
                }`}
              >
                {market.status === "open" ? "Активен" : market.status === "resolved" ? "Решён" : "Закрыт"}
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-display font-bold leading-snug">
              {market.title}
            </h1>
            {market.description && (
              <p className="text-sm text-txt-secondary mt-3 leading-relaxed max-w-2xl">
                {market.description}
              </p>
            )}
          </div>
        </div>

        {/* Resolution badge */}
        {market.resolution_outcome && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-semibold flex items-center gap-3 ${
            market.resolution_outcome === "yes"
              ? "bg-yes/10 text-yes border border-yes/20"
              : "bg-no/10 text-no border border-no/20"
          }`}>
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Исход: {market.resolution_outcome === "yes" ? "ДА" : "НЕТ"}
          </div>
        )}

        {/* Big price display */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-base-800 rounded-xl p-5 text-center border border-yes/10 hover:border-yes/25 transition-colors">
            <p className="text-4xl lg:text-5xl font-bold font-mono text-yes">{yesPercent}%</p>
            <p className="text-xs text-txt-muted mt-2 font-medium">Да</p>
          </div>
          <div className="bg-base-800 rounded-xl p-5 text-center border border-no/10 hover:border-no/25 transition-colors">
            <p className="text-4xl lg:text-5xl font-bold font-mono text-no">{noPercent}%</p>
            <p className="text-xs text-txt-muted mt-2 font-medium">Нет</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Объём торгов", value: `${Number(market.total_volume).toLocaleString("ru-RU")} PRC` },
            { label: "Трейдеры", value: String(market.total_traders) },
            { label: "Закрытие", value: timeLeft(market.closes_at) },
            { label: "Тип маркета", value: isClob ? "Ордерная книга" : "LMSR AMM" },
          ].map((stat) => (
            <div key={stat.label} className="bg-base-800 rounded-lg px-4 py-3 border border-line">
              <p className="text-[10px] text-txt-muted uppercase tracking-wider font-medium">{stat.label}</p>
              <p className="text-sm font-mono font-semibold mt-1 text-txt">{stat.value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Resolution rules */}
      {market.resolution_source && (
        <div className="card p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4.5 h-4.5 text-txt-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <h3 className="text-sm font-semibold text-txt-secondary uppercase tracking-wider">Правила резолюции</h3>
          </div>
          <p className="text-sm text-txt-secondary leading-relaxed whitespace-pre-line">
            {market.resolution_source}
          </p>
        </div>
      )}

      {/* Two-column layout: Chart (left) + Trading (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <PriceChart marketId={market.id} />
        </div>
        <div className="lg:col-span-2 space-y-6">
          {market.status === "open" && (
            isClob
              ? <OrderBookPanel market={market} />
              : <TradePanel market={market} />
          )}
        </div>
      </div>
    </div>
  );
}
