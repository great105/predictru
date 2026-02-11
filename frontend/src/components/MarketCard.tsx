import { Link } from "react-router-dom";
import type { Market } from "@/types";
import { categoryIcon, formatNumber, formatTimeLeft } from "@/utils/format";
import { PriceBar } from "./PriceBar";

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  return (
    <Link
      to={`/market/${market.id}`}
      className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors"
    >
      <div className="flex items-start gap-2 mb-3">
        <span className="text-lg">{categoryIcon(market.category)}</span>
        <h3 className="text-sm font-medium leading-tight flex-1">
          {market.title}
        </h3>
      </div>

      <PriceBar priceYes={market.price_yes} priceNo={market.price_no} />

      <div className="flex justify-between items-center mt-3 text-xs text-tg-hint">
        <span>Объём: {formatNumber(market.total_volume)} PRC</span>
        <span
          className={`px-1.5 py-0.5 rounded font-semibold ${
            market.amm_type === "clob"
              ? "bg-blue-50 text-blue-600"
              : "bg-purple-50 text-purple-600"
          }`}
        >
          {market.amm_type === "clob" ? "Order Book" : "AMM"}
        </span>
        <span>{formatTimeLeft(market.closes_at)}</span>
      </div>
    </Link>
  );
}
