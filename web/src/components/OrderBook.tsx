import { useState } from "react";
import { useOrderBook, usePlaceOrder, useCancelOrder, useMyOrders } from "../hooks";
import type { MarketDetail } from "../types";

export default function OrderBookPanel({ market }: { market: MarketDetail }) {
  const { data: book } = useOrderBook(market.id);
  const { data: myOrders } = useMyOrders(market.id);
  const placeOrder = usePlaceOrder();
  const cancelOrder = useCancelOrder();

  const [intent, setIntent] = useState("buy_yes");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");

  const handlePlace = () => {
    const p = parseFloat(price);
    const q = parseFloat(quantity);
    if (!p || !q || p <= 0 || p >= 100 || q <= 0) return;
    placeOrder.mutate(
      { market_id: market.id, intent, price: p / 100, quantity: q },
      { onSuccess: () => { setPrice(""); setQuantity(""); } }
    );
  };

  const maxBidQty = book ? Math.max(...book.bids.map((b) => b.quantity), 1) : 1;
  const maxAskQty = book ? Math.max(...book.asks.map((a) => a.quantity), 1) : 1;

  return (
    <div className="space-y-4">
      {/* Order Book Display */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Книга ордеров</h3>
          {book?.last_price != null && (
            <span className="text-xs font-mono text-accent">
              Последняя: {(book.last_price * 100).toFixed(1)}%
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Bids */}
          <div>
            <div className="flex justify-between text-[10px] text-muted font-medium mb-2 px-1">
              <span>ЦЕНА</span>
              <span>КОЛ-ВО</span>
            </div>
            <div className="space-y-0.5">
              {(book?.bids ?? []).slice(0, 8).map((level, i) => (
                <div key={i} className="relative flex justify-between items-center px-2 py-1 rounded text-xs font-mono">
                  <div
                    className="absolute inset-y-0 right-0 bg-yes/8 rounded"
                    style={{ width: `${(level.quantity / maxBidQty) * 100}%` }}
                  />
                  <span className="relative text-yes">{(level.price * 100).toFixed(1)}</span>
                  <span className="relative text-muted">{level.quantity.toFixed(0)}</span>
                </div>
              ))}
              {(!book?.bids?.length) && (
                <p className="text-xs text-muted text-center py-4">Нет заявок</p>
              )}
            </div>
          </div>

          {/* Asks */}
          <div>
            <div className="flex justify-between text-[10px] text-muted font-medium mb-2 px-1">
              <span>ЦЕНА</span>
              <span>КОЛ-ВО</span>
            </div>
            <div className="space-y-0.5">
              {(book?.asks ?? []).slice(0, 8).map((level, i) => (
                <div key={i} className="relative flex justify-between items-center px-2 py-1 rounded text-xs font-mono">
                  <div
                    className="absolute inset-y-0 left-0 bg-no/8 rounded"
                    style={{ width: `${(level.quantity / maxAskQty) * 100}%` }}
                  />
                  <span className="relative text-no">{(level.price * 100).toFixed(1)}</span>
                  <span className="relative text-muted">{level.quantity.toFixed(0)}</span>
                </div>
              ))}
              {(!book?.asks?.length) && (
                <p className="text-xs text-muted text-center py-4">Нет заявок</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Place Order Form */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold text-sm">Разместить ордер</h3>

        <div className="grid grid-cols-4 gap-1.5">
          {[
            { val: "buy_yes", label: "Купить ДА", color: "yes" },
            { val: "buy_no", label: "Купить НЕТ", color: "no" },
            { val: "sell_yes", label: "Продать ДА", color: "gold" },
            { val: "sell_no", label: "Продать НЕТ", color: "muted" },
          ].map((opt) => (
            <button
              key={opt.val}
              onClick={() => setIntent(opt.val)}
              className={`py-2 rounded-lg text-[10px] font-medium transition-all border ${
                intent === opt.val
                  ? `border-${opt.color}/50 bg-${opt.color}/10 text-${opt.color}`
                  : "border-border text-muted hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted mb-1 block">Цена (%)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="50"
              className="input-field font-mono text-sm"
              min={1}
              max={99}
            />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Кол-во</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="10"
              className="input-field font-mono text-sm"
              min={1}
            />
          </div>
        </div>

        <button
          onClick={handlePlace}
          disabled={placeOrder.isPending}
          className="w-full btn-primary disabled:opacity-40"
        >
          {placeOrder.isPending ? "Размещение..." : "Разместить ордер"}
        </button>
      </div>

      {/* My Orders */}
      {myOrders && myOrders.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-3">Мои ордера</h3>
          <div className="space-y-2">
            {myOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between bg-surface-2 rounded-xl p-3">
                <div>
                  <p className="text-xs font-medium">
                    {order.original_intent.replace("_", " ").toUpperCase()}
                  </p>
                  <p className="text-[10px] font-mono text-muted">
                    {(order.price * 100).toFixed(1)}% × {order.quantity}
                    {order.filled_quantity > 0 && (
                      <span className="text-yes ml-1">({order.filled_quantity} исполнено)</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => cancelOrder.mutate(order.id)}
                  disabled={cancelOrder.isPending}
                  className="text-xs text-no hover:text-no-light transition-colors"
                >
                  Отменить
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
