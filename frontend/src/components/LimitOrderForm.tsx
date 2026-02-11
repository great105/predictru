import { useCallback, useState } from "react";
import type { MarketDetail } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { useOrderBookStore } from "@/stores/orderbookStore";
import { usePlaceOrder } from "@/hooks/useOrderBook";
import { useWebApp } from "@/hooks/useWebApp";
import { formatPRC } from "@/utils/format";

interface LimitOrderFormProps {
  market: MarketDetail;
}

const FEE = 0.02;

export function LimitOrderForm({ market }: LimitOrderFormProps) {
  const user = useAuthStore((s) => s.user);
  const { haptic } = useWebApp();
  const placeOrderMutation = usePlaceOrder();

  const {
    orderType,
    selectedOutcome,
    price,
    quantity,
    setOrderType,
    setOutcome,
    setPrice,
    setQuantity,
  } = useOrderBookStore();

  const [error, setError] = useState<string | null>(null);

  const numPrice = parseFloat(price) || 0;
  const numQuantity = parseFloat(quantity) || 0;

  const cost = numPrice * numQuantity;
  const fee = cost * FEE;
  const mult = numPrice > 0 ? (1 - FEE) / numPrice : 0;
  const profit = numQuantity - cost;

  const isYes = selectedOutcome === "yes";
  const isBuy = orderType === "buy";

  const adjustPrice = (delta: number) => {
    const current = numPrice || 0.5;
    const newPrice = Math.max(
      0.01,
      Math.min(0.99, Math.round((current + delta) * 100) / 100),
    );
    setPrice(newPrice.toFixed(2));
    haptic?.selectionChanged();
  };

  const intent = `${orderType}_${selectedOutcome}` as
    | "buy_yes"
    | "buy_no"
    | "sell_yes"
    | "sell_no";

  const handleSubmit = useCallback(async () => {
    if (!numPrice || !numQuantity) return;
    setError(null);
    try {
      await placeOrderMutation.mutateAsync({
        market_id: market.id,
        intent,
        price: Math.round(numPrice * 100) / 100,
        quantity: numQuantity,
      });
      haptic?.notificationOccurred("success");
      setQuantity("");
    } catch (e: any) {
      haptic?.notificationOccurred("error");
      const msg = e?.response?.data?.detail || "Ошибка";
      setError(typeof msg === "string" ? msg : "Ошибка");
    }
  }, [numPrice, numQuantity, market.id, intent, placeOrderMutation, haptic, setQuantity]);

  if (market.status !== "open") {
    return (
      <div className="p-4 text-center text-tg-hint">
        Торговля закрыта для этого рынка
      </div>
    );
  }

  const canSubmit = numPrice >= 0.01 && numPrice <= 0.99 && numQuantity > 0;
  const quantityPresets = [5, 10, 25, 50];

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
      {/* BUY / SELL toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setOrderType("buy");
            haptic?.selectionChanged();
          }}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
            isBuy
              ? "bg-green-500 text-white shadow-md"
              : "bg-tg-secondary text-tg-hint"
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => {
            setOrderType("sell");
            haptic?.selectionChanged();
          }}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
            !isBuy
              ? "bg-red-500 text-white shadow-md"
              : "bg-tg-secondary text-tg-hint"
          }`}
        >
          SELL
        </button>
      </div>

      {/* YES / NO toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setOutcome("yes");
            haptic?.selectionChanged();
          }}
          className={`flex-1 py-2 rounded-xl font-semibold text-sm transition-colors ${
            isYes
              ? "bg-green-500 text-white shadow-md"
              : "bg-tg-secondary text-tg-hint"
          }`}
        >
          YES
        </button>
        <button
          onClick={() => {
            setOutcome("no");
            haptic?.selectionChanged();
          }}
          className={`flex-1 py-2 rounded-xl font-semibold text-sm transition-colors ${
            !isYes
              ? "bg-red-500 text-white shadow-md"
              : "bg-tg-secondary text-tg-hint"
          }`}
        >
          NO
        </button>
      </div>

      {/* Hint when no price set */}
      {!price && (
        <p className="text-xs text-tg-hint text-center py-1">
          Нажми на цену в книге ордеров
        </p>
      )}

      {/* Price stepper */}
      <div>
        <label className="text-xs text-tg-hint block mb-1">
          Цена (0.01 — 0.99)
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => adjustPrice(-0.01)}
            className="w-10 h-10 rounded-lg bg-tg-secondary text-lg font-bold flex items-center justify-center shrink-0"
          >
            −
          </button>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            max="0.99"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.50"
            className="flex-1 min-w-0 bg-tg-secondary rounded-lg px-3 py-2.5 text-center text-base font-semibold outline-none"
          />
          <button
            onClick={() => adjustPrice(0.01)}
            className="w-10 h-10 rounded-lg bg-tg-secondary text-lg font-bold flex items-center justify-center shrink-0"
          >
            +
          </button>
        </div>
      </div>

      {/* Quantity */}
      <div>
        <label className="text-xs text-tg-hint block mb-1">Количество</label>
        <input
          type="number"
          inputMode="decimal"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="0"
          className="w-full bg-tg-secondary rounded-lg px-3 py-2.5 text-base font-semibold outline-none"
        />
        <div className="flex gap-2 mt-2">
          {quantityPresets.map((p) => (
            <button
              key={p}
              onClick={() => {
                setQuantity(String(p));
                haptic?.selectionChanged();
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                numQuantity === p
                  ? "bg-tg-button text-tg-button-text"
                  : "bg-tg-secondary"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 text-xs font-medium rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Summary */}
      {canSubmit && (
        <div className="bg-tg-secondary rounded-xl p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-tg-hint">Стоимость</span>
            <span className="font-medium">{formatPRC(cost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tg-hint">Комиссия 2%</span>
            <span className="text-tg-hint">~{formatPRC(fee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tg-hint">Коэффициент</span>
            <span className="font-medium">x{mult.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-1">
            <span className="text-tg-hint font-medium">
              Прибыль (если угадал)
            </span>
            <span
              className={`font-bold ${isYes ? "text-green-600" : "text-red-600"}`}
            >
              +{formatPRC(profit)}
            </span>
          </div>
          <div className="flex justify-between opacity-50">
            <span className="text-tg-hint">Баланс</span>
            <span>{formatPRC(user?.balance ?? 0)}</span>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || placeOrderMutation.isPending}
        className={`w-full py-3.5 rounded-xl font-bold text-base text-white disabled:opacity-50 ${
          isYes ? "bg-green-500" : "bg-red-500"
        }`}
      >
        {placeOrderMutation.isPending
          ? "Отправка..."
          : `${isBuy ? "Купить" : "Продать"} ${isYes ? "YES" : "NO"} — ${formatPRC(cost)}`}
      </button>
    </div>
  );
}
