import { useOrderBook } from "@/hooks/useOrderBook";
import { useOrderBookStore } from "@/stores/orderbookStore";
import { useWebApp } from "@/hooks/useWebApp";
import { formatPercent } from "@/utils/format";

interface OrderBookDisplayProps {
  marketId: string;
}

export function OrderBookDisplay({ marketId }: OrderBookDisplayProps) {
  const { data: book, isLoading } = useOrderBook(marketId);
  const { setPrice } = useOrderBookStore();
  const { haptic } = useWebApp();

  if (isLoading || !book) {
    return (
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold mb-3">Книга заявок</h3>
        <div className="text-center text-tg-hint text-sm py-8">Загрузка...</div>
      </div>
    );
  }

  const asks = [...book.asks].reverse().slice(0, 8);
  const bids = book.bids.slice(0, 8);

  const maxQty = Math.max(
    ...asks.map((a) => a.quantity),
    ...bids.map((b) => b.quantity),
    1
  );

  const handleTap = (price: number) => {
    setPrice(price.toFixed(2));
    haptic?.selectionChanged();
  };

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold mb-3">Книга заявок</h3>

      {/* Header */}
      <div className="flex justify-between text-xs text-tg-hint mb-1 px-1">
        <span>Цена</span>
        <span>Количество</span>
      </div>

      {/* Asks (sell side) — red, sorted high to low */}
      <div className="space-y-px mb-1">
        {asks.length === 0 ? (
          <div className="text-xs text-tg-hint text-center py-2">Пока нет продавцов</div>
        ) : (
          asks.map((level, i) => (
            <button
              key={`ask-${i}`}
              onClick={() => handleTap(level.price)}
              className="w-full flex justify-between items-center text-xs py-1 px-1 rounded relative overflow-hidden"
            >
              <div
                className="absolute inset-y-0 right-0 bg-red-500/10"
                style={{ width: `${(level.quantity / maxQty) * 100}%` }}
              />
              <span className="relative text-red-400 font-medium">
                {formatPercent(level.price)}
              </span>
              <span className="relative text-tg-text">
                {level.quantity.toFixed(1)}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Spread / Last price */}
      <div className="text-center py-1.5 border-y border-white/10">
        <span className="text-sm font-bold">
          {book.last_price ? formatPercent(book.last_price) : "—"}
        </span>
        <span className="text-xs text-tg-hint ml-1">последняя сделка</span>
      </div>

      {/* Bids (buy side) — green, sorted high to low */}
      <div className="space-y-px mt-1">
        {bids.length === 0 ? (
          <div className="text-xs text-tg-hint text-center py-2">Пока нет покупателей</div>
        ) : (
          bids.map((level, i) => (
            <button
              key={`bid-${i}`}
              onClick={() => handleTap(level.price)}
              className="w-full flex justify-between items-center text-xs py-1 px-1 rounded relative overflow-hidden"
            >
              <div
                className="absolute inset-y-0 right-0 bg-green-500/10"
                style={{ width: `${(level.quantity / maxQty) * 100}%` }}
              />
              <span className="relative text-green-400 font-medium">
                {formatPercent(level.price)}
              </span>
              <span className="relative text-tg-text">
                {level.quantity.toFixed(1)}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
