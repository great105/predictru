import { Link } from "react-router-dom";
import type { Market } from "@/types";
import { categoryIcon, formatNumber, formatTimeLeft } from "@/utils/format";
import { PriceBar } from "./PriceBar";
import { useWebApp } from "@/hooks/useWebApp";

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  const { haptic } = useWebApp();
  const yesPercent = Math.round(market.price_yes * 100);

  return (
    <Link
      to={`/market/${market.id}`}
      onClick={() => haptic?.impactOccurred("light")}
      className="block glass-card p-4 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start gap-2 mb-3">
        <span className="text-lg">{categoryIcon(market.category)}</span>
        <h3 className="text-sm font-medium leading-tight flex-1">
          {market.title}
        </h3>
      </div>

      <PriceBar priceYes={market.price_yes} priceNo={market.price_no} />

      {/* Social proof */}
      <div className="flex items-center gap-3 mt-2 text-xs text-tg-hint">
        <span className={yesPercent >= 50 ? "text-green-400" : "text-red-400"}>
          {yesPercent}% считают ДА
        </span>
        <span>👥 {market.total_traders}</span>
      </div>

      <div className="flex justify-between items-center mt-1.5 text-xs text-tg-hint">
        <span>🪙 {formatNumber(market.total_volume)} PRC</span>
        <span>{formatTimeLeft(market.closes_at)}</span>
      </div>
    </Link>
  );
}
