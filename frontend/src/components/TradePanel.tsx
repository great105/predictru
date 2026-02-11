import { useEffect, useCallback } from "react";
import type { MarketDetail } from "@/types";
import { useTradeStore } from "@/stores/tradeStore";
import { useAuthStore } from "@/stores/authStore";
import { useBuy } from "@/hooks/useTrade";
import { useWebApp } from "@/hooks/useWebApp";
import { estimateShares } from "@/utils/lmsr";
import { formatPRC } from "@/utils/format";

interface TradePanelProps {
  market: MarketDetail;
}

const FEE = 0.02;

export function TradePanel({ market }: TradePanelProps) {
  const { selectedOutcome, amount, estimatedShares, setOutcome, setAmount, setEstimatedShares, reset } = useTradeStore();
  const user = useAuthStore((s) => s.user);
  const { mainButton, haptic } = useWebApp();
  const buyMutation = useBuy();

  // Multipliers from current prices
  const yesMult = market.price_yes > 0 ? (1 - FEE) / market.price_yes : 0;
  const noMult = market.price_no > 0 ? (1 - FEE) / market.price_no : 0;

  const isNo = selectedOutcome === "no";
  const sideLabel = isNo ? "НЕТ" : "ДА";

  useEffect(() => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setEstimatedShares(0);
      return;
    }
    const netAmount = numAmount * (1 - FEE);
    const shares = estimateShares(
      market.q_yes,
      market.q_no,
      market.liquidity_b,
      selectedOutcome,
      netAmount
    );
    setEstimatedShares(shares);
  }, [amount, selectedOutcome, market.q_yes, market.q_no, market.liquidity_b, setEstimatedShares]);

  const handleBuy = useCallback(async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    try {
      await buyMutation.mutateAsync({
        market_id: market.id,
        outcome: selectedOutcome,
        amount: numAmount,
      });
      haptic?.notificationOccurred("success");
      reset();
    } catch {
      haptic?.notificationOccurred("error");
    }
  }, [amount, selectedOutcome, market.id, buyMutation, haptic, reset]);

  // Telegram MainButton
  useEffect(() => {
    const numAmount = parseFloat(amount);
    if (mainButton && numAmount > 0) {
      mainButton.setText(`Ставлю на ${sideLabel} — ${formatPRC(numAmount)}`);
      mainButton.show();
      mainButton.enable();
      mainButton.onClick(handleBuy);
      return () => {
        mainButton.offClick(handleBuy);
        mainButton.hide();
      };
    }
    mainButton?.hide();
  }, [amount, selectedOutcome, mainButton, handleBuy, sideLabel]);

  if (market.status !== "open") {
    return (
      <div className="p-4 text-center text-tg-hint">
        Торговля закрыта для этого рынка
      </div>
    );
  }

  const numAmount = parseFloat(amount) || 0;
  const fee = numAmount * FEE;
  const multiplier = numAmount > 0 ? estimatedShares / numAmount : 0;
  const potentialWin = estimatedShares;
  const profit = potentialWin - numAmount;
  const presets = [10, 25, 50, 100];
  const canBuy = numAmount > 0 && estimatedShares > 0;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold mb-3">Сделать ставку</h3>

      {/* Outcome buttons with multipliers */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setOutcome("yes"); haptic?.selectionChanged(); }}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
            selectedOutcome === "yes"
              ? "bg-green-500 text-white shadow-md"
              : "bg-green-50 text-green-700"
          }`}
        >
          ДА
          <span className="text-xs font-normal opacity-80 ml-1">
            x{yesMult.toFixed(1)}
          </span>
        </button>
        <button
          onClick={() => { setOutcome("no"); haptic?.selectionChanged(); }}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
            selectedOutcome === "no"
              ? "bg-red-500 text-white shadow-md"
              : "bg-red-50 text-red-700"
          }`}
        >
          НЕТ
          <span className="text-xs font-normal opacity-80 ml-1">
            x{noMult.toFixed(1)}
          </span>
        </button>
      </div>

      {/* Amount */}
      <input
        type="number"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Сколько ставишь (PRC)"
        className="w-full bg-tg-secondary rounded-lg px-4 py-2.5 text-base font-semibold outline-none mb-2"
      />
      <div className="flex gap-2 mb-3">
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => { setAmount(String(preset)); haptic?.selectionChanged(); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${
              numAmount === preset
                ? "bg-tg-button text-tg-button-text"
                : "bg-tg-secondary"
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Summary + buy button */}
      {canBuy && (
        <>
          <div
            className={`border rounded-xl p-4 mb-3 text-center ${
              isNo
                ? "bg-red-50 border-red-200"
                : "bg-green-50 border-green-200"
            }`}
          >
            <div
              className={`text-xs mb-1 ${isNo ? "text-red-600" : "text-green-600"}`}
            >
              Ставлю {formatPRC(numAmount)} на {sideLabel}
            </div>
            <div
              className={`text-3xl font-bold ${isNo ? "text-red-600" : "text-green-600"}`}
            >
              +{formatPRC(profit)}
            </div>
            <div
              className={`text-sm mt-1 ${isNo ? "text-red-500" : "text-green-500"}`}
            >
              выигрыш {formatPRC(potentialWin)} (x{multiplier.toFixed(1)})
            </div>
          </div>

          <div className="bg-tg-secondary rounded-xl p-3 text-sm space-y-1 mb-3">
            <div className="flex justify-between">
              <span className="text-tg-hint">Ставка</span>
              <span className="font-medium">{formatPRC(numAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-tg-hint">Комиссия 2%</span>
              <span className="text-tg-hint">~{formatPRC(fee)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1">
              <span className="text-tg-hint font-medium">Если угадал</span>
              <span
                className={`font-bold ${isNo ? "text-red-600" : "text-green-600"}`}
              >
                {formatPRC(potentialWin)}
              </span>
            </div>
            <div className="flex justify-between opacity-50">
              <span className="text-tg-hint">Баланс</span>
              <span>{formatPRC(user?.balance ?? 0)}</span>
            </div>
          </div>

          <button
            onClick={handleBuy}
            disabled={buyMutation.isPending}
            className={`w-full py-3.5 rounded-xl font-bold text-base text-white disabled:opacity-50 ${
              isNo ? "bg-red-500" : "bg-green-500"
            }`}
          >
            {buyMutation.isPending
              ? "Отправка..."
              : `Ставлю на ${sideLabel} — ${formatPRC(numAmount)}`}
          </button>
        </>
      )}
    </div>
  );
}
