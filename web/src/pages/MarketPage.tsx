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

export default function MarketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: market, isLoading } = useMarketDetail(id!);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-surface-3 rounded w-1/2" />
        <div className="h-4 bg-surface-3 rounded w-full" />
        <div className="h-64 bg-surface-3 rounded-2xl" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="text-center py-20">
        <p className="text-muted">Рынок не найден</p>
        <button onClick={() => navigate("/")} className="btn-ghost mt-4">На главную</button>
      </div>
    );
  }

  const yesPercent = Math.round(market.price_yes * 100);
  const noPercent = 100 - yesPercent;
  const isClob = market.amm_type === "clob";

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="btn-ghost inline-flex items-center gap-1 -ml-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Назад
      </button>

      {/* Market header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold leading-snug">{market.title}</h1>
            {market.description && (
              <p className="text-sm text-muted mt-2 leading-relaxed">{market.description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span
              className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${
                market.status === "open"
                  ? "bg-yes/10 text-yes"
                  : market.status === "resolved"
                    ? "bg-accent/10 text-accent"
                    : "bg-surface-4 text-muted"
              }`}
            >
              {market.status === "open" ? "Активен" : market.status === "resolved" ? "Решён" : market.status}
            </span>
            {isClob && <span className="text-[10px] font-mono text-muted bg-surface-4 px-2 py-0.5 rounded">CLOB</span>}
          </div>
        </div>

        {/* Resolution badge */}
        {market.resolution_outcome && (
          <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${
            market.resolution_outcome === "yes"
              ? "bg-yes/10 text-yes border border-yes/20"
              : "bg-no/10 text-no border border-no/20"
          }`}>
            Исход: {market.resolution_outcome === "yes" ? "ДА" : "НЕТ"}
          </div>
        )}

        {/* Big price display */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-surface-2 rounded-xl p-4 text-center border border-yes/10">
            <p className="text-3xl font-bold font-mono text-yes">{yesPercent}%</p>
            <p className="text-xs text-muted mt-1">Да</p>
          </div>
          <div className="bg-surface-2 rounded-xl p-4 text-center border border-no/10">
            <p className="text-3xl font-bold font-mono text-no">{noPercent}%</p>
            <p className="text-xs text-muted mt-1">Нет</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Объём", value: `${Number(market.total_volume).toLocaleString("ru-RU")} PRC`, icon: "💰" },
            { label: "Трейдеры", value: market.total_traders, icon: "👥" },
            { label: "Закрытие", value: timeLeft(market.closes_at), icon: "⏱️" },
            { label: "Тип", value: isClob ? "Ордерная книга" : "LMSR AMM", icon: "⚙️" },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface-2 rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-muted">{stat.icon} {stat.label}</p>
              <p className="text-sm font-mono font-medium mt-0.5">{stat.value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Two-column layout on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Chart + info (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          <PriceChart marketId={market.id} />
        </div>

        {/* Right: Trading panel (2 cols) */}
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
