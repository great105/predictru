import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useMarketDetail, usePriceHistory } from "@/hooks/useMarkets";
import { PriceChart } from "@/components/PriceChart";
import { PriceBar } from "@/components/PriceBar";
import { TradePanel } from "@/components/TradePanel";
import { OrderBookDisplay } from "@/components/OrderBookDisplay";
import { LimitOrderForm } from "@/components/LimitOrderForm";
import { OpenOrders } from "@/components/OpenOrders";
import { Skeleton } from "@/components/Skeleton";
import { useWebApp } from "@/hooks/useWebApp";
import { categoryIcon, formatTimeLeft, formatNumber } from "@/utils/format";

const STATUS_LABELS: Record<string, string> = {
  open: "Открыт",
  trading_closed: "Торги закрыты",
  resolved: "Завершён",
  cancelled: "Отменён",
};

export function MarketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { backButton } = useWebApp();
  const { data: market, isLoading } = useMarketDetail(id!);
  const { data: history } = usePriceHistory(id!);

  useEffect(() => {
    backButton?.show();
    const goBack = () => navigate(-1);
    backButton?.onClick(goBack);
    return () => {
      backButton?.offClick(goBack);
      backButton?.hide();
    };
  }, [backButton, navigate]);

  if (isLoading || !market) {
    return (
      <div className="max-w-lg mx-auto bg-tg-bg text-tg-text min-h-screen pb-4">
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const isClob = market.amm_type === "clob";

  return (
    <div className="h-full overflow-y-auto max-w-lg mx-auto bg-tg-bg text-tg-text">
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{categoryIcon(market.category)}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              market.status === "open"
                ? "bg-green-100 text-green-700"
                : market.status === "resolved"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {STATUS_LABELS[market.status] ?? market.status}
          </span>
          {isClob && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
              CLOB
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold leading-tight">{market.title}</h1>
        {market.description && (
          <p className="text-sm text-tg-hint mt-2">{market.description}</p>
        )}
      </div>

      <PriceBar priceYes={market.price_yes} priceNo={market.price_no} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-tg-secondary rounded-lg p-2">
          <div className="text-xs text-tg-hint">Объём</div>
          <div className="text-sm font-semibold">
            {formatNumber(market.total_volume)}
          </div>
        </div>
        <div className="bg-tg-secondary rounded-lg p-2">
          <div className="text-xs text-tg-hint">Игроки</div>
          <div className="text-sm font-semibold">{market.total_traders}</div>
        </div>
        <div className="bg-tg-secondary rounded-lg p-2">
          <div className="text-xs text-tg-hint">До закрытия</div>
          <div className="text-sm font-semibold">
            {formatTimeLeft(market.closes_at)}
          </div>
        </div>
      </div>

      {/* Price chart (LMSR only — CLOB markets use order book) */}
      {!isClob && (
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold mb-2">История цены</h3>
          <PriceChart data={history ?? []} />
        </div>
      )}

      {/* Trading: CLOB vs LMSR */}
      {isClob ? (
        <>
          <OrderBookDisplay marketId={market.id} />
          <LimitOrderForm market={market} />
          <OpenOrders marketId={market.id} />
        </>
      ) : (
        <TradePanel market={market} />
      )}

      {/* Resolution Rules */}
      {market.resolution_source && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h3 className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
            <span className="text-base">&#9878;</span> Правила
          </h3>
          <p className="text-xs text-tg-hint leading-relaxed whitespace-pre-line">
            {market.resolution_source}
          </p>
        </div>
      )}

      {/* Resolution info */}
      {market.status === "resolved" && (
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <div className="text-sm text-blue-700 font-medium">
            Результат:{" "}
            <span className="font-bold">
              {market.resolution_outcome === "yes" ? "ДА" : market.resolution_outcome === "no" ? "НЕТ" : market.resolution_outcome}
            </span>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
