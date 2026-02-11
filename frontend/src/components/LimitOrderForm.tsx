import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MarketDetail } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { usePlaceOrder, useOrderBook } from "@/hooks/useOrderBook";
import { useWebApp } from "@/hooks/useWebApp";
import { usersApi } from "@/api/endpoints";
import { formatPRC } from "@/utils/format";

interface LimitOrderFormProps {
  market: MarketDetail;
}

const FEE = 0.02;

function multToPrice(mult: number): number {
  return Math.max(0.01, Math.min(0.99, (1 - FEE) / mult));
}
function priceToMult(price: number): number {
  return price > 0 ? (1 - FEE) / price : 0;
}

export function LimitOrderForm({ market }: LimitOrderFormProps) {
  const user = useAuthStore((s) => s.user);
  const { haptic } = useWebApp();
  const placeOrderMutation = usePlaceOrder();

  const [outcome, setOutcome] = useState<"yes" | "no">("yes");
  const [betAmount, setBetAmount] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedMult, setSelectedMult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSell, setShowSell] = useState(false);
  const [sellOutcome, setSellOutcome] = useState<"yes" | "no">("yes");
  const [sellQty, setSellQty] = useState("");
  const [sellPrice, setSellPrice] = useState("0.50");

  // Order book
  const { data: book } = useOrderBook(market.id);
  const bestAskYes = book?.asks?.[0]?.price;
  const bestBidYes = book?.bids?.[0]?.price;

  // Market prices for each side
  const yesMktPrice = bestAskYes ?? market.price_yes;
  const noMktPrice = bestBidYes
    ? Math.round((1 - bestBidYes) * 100) / 100
    : 1 - market.price_yes;

  const yesMult = priceToMult(yesMktPrice);
  const noMult = priceToMult(noMktPrice);

  const isNo = outcome === "no";
  const sideLabel = isNo ? "НЕТ" : "ДА";
  const sideMktPrice = isNo ? noMktPrice : yesMktPrice;
  const sideMarketMult = isNo ? noMult : yesMult;

  // Market mode (default) vs advanced (custom multiplier)
  const isMarketMode = !showAdvanced || selectedMult === null;
  const activeMult = isMarketMode ? sideMarketMult : selectedMult;
  const activePrice = isMarketMode ? sideMktPrice : multToPrice(selectedMult);

  // Advanced presets
  const mktMultRounded = Math.round(sideMarketMult * 10) / 10;
  const presets: { label: string; mult: number; isMarket?: boolean }[] = [];
  if (mktMultRounded >= 1.05) {
    presets.push({
      label: `x${mktMultRounded.toFixed(1)}`,
      mult: mktMultRounded,
      isMarket: true,
    });
  }
  for (const m of [1.5, 2, 3, 5, 10]) {
    if (Math.abs(m - mktMultRounded) > 0.2) {
      presets.push({ label: `x${m}`, mult: m });
    }
  }
  presets.sort((a, b) => a.mult - b.mult);

  // Calculations
  const numBet = parseFloat(betAmount) || 0;
  const quantity =
    activePrice > 0 ? Math.floor((numBet / activePrice) * 100) / 100 : 0;
  const fee = numBet * FEE;
  const potentialWin = numBet * activeMult;

  const switchOutcome = (newOutcome: "yes" | "no") => {
    if (newOutcome === outcome) return;
    setOutcome(newOutcome);
    setSelectedMult(null);
    haptic?.selectionChanged();
  };

  const handleBuy = useCallback(async () => {
    if (!activePrice || !quantity) return;
    setError(null);
    const intent = outcome === "yes" ? "buy_yes" : "buy_no";
    try {
      await placeOrderMutation.mutateAsync({
        market_id: market.id,
        intent,
        price: Math.round(activePrice * 100) / 100,
        quantity,
      });
      haptic?.notificationOccurred("success");
      setBetAmount("");
    } catch (e: any) {
      haptic?.notificationOccurred("error");
      const msg = e?.response?.data?.detail || "Ошибка";
      setError(typeof msg === "string" ? msg : "Ошибка");
    }
  }, [activePrice, quantity, market.id, outcome, placeOrderMutation, haptic]);

  // === SELL ===
  const numSellPrice = parseFloat(sellPrice) || 0;
  const numSellQty = parseFloat(sellQty) || 0;

  const handleSell = useCallback(async () => {
    if (!numSellPrice || !numSellQty) return;
    setError(null);
    const intent = sellOutcome === "yes" ? "sell_yes" : "sell_no";
    try {
      await placeOrderMutation.mutateAsync({
        market_id: market.id,
        intent,
        price: numSellPrice,
        quantity: numSellQty,
      });
      haptic?.notificationOccurred("success");
      setSellQty("");
    } catch (e: any) {
      haptic?.notificationOccurred("error");
      const msg = e?.response?.data?.detail || "Ошибка";
      setError(typeof msg === "string" ? msg : "Ошибка");
    }
  }, [numSellPrice, numSellQty, market.id, sellOutcome, placeOrderMutation, haptic]);

  // Positions
  const { data: positions } = useQuery({
    queryKey: ["positions"],
    queryFn: async () => {
      const { data } = await usersApi.positions();
      return data;
    },
  });
  const myPositions = (positions ?? []).filter(
    (p) => p.market_id === market.id && p.shares > 0,
  );
  const yesShares =
    myPositions.find((p) => p.outcome === "yes")?.shares ?? 0;
  const noShares =
    myPositions.find((p) => p.outcome === "no")?.shares ?? 0;

  if (market.status !== "open") {
    return (
      <div className="p-4 text-center text-tg-hint">
        Торговля закрыта для этого рынка
      </div>
    );
  }

  const betPresets = [10, 25, 50, 100];
  const canBuy = numBet > 0 && activeMult > 0 && (!showAdvanced || selectedMult !== null);

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold mb-3">Сделать ставку</h3>

        {/* Outcome buttons with multipliers */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => switchOutcome("yes")}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
              outcome === "yes"
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
            onClick={() => switchOutcome("no")}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
              outcome === "no"
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
          value={betAmount}
          onChange={(e) => setBetAmount(e.target.value)}
          placeholder="Сколько ставишь (PRC)"
          className="w-full bg-tg-secondary rounded-lg px-4 py-2.5 text-base font-semibold outline-none mb-2"
        />
        <div className="flex gap-2 mb-3">
          {betPresets.map((p) => (
            <button
              key={p}
              onClick={() => {
                setBetAmount(String(p));
                haptic?.selectionChanged();
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                numBet === p
                  ? "bg-tg-button text-tg-button-text"
                  : "bg-tg-secondary"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => {
            setShowAdvanced(!showAdvanced);
            if (showAdvanced) setSelectedMult(null);
            haptic?.selectionChanged();
          }}
          className="text-xs text-tg-link mb-2 block"
        >
          {showAdvanced ? "← Купить по рынку" : "Свой коэффициент →"}
        </button>

        {showAdvanced && (
          <div className="mb-3">
            <div className="flex gap-1.5 mb-1.5">
              {presets.map((p) => (
                <button
                  key={p.mult}
                  onClick={() => {
                    setSelectedMult(p.mult);
                    haptic?.selectionChanged();
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    selectedMult !== null &&
                    Math.abs(selectedMult - p.mult) < 0.05
                      ? isNo
                        ? "bg-red-500 text-white shadow-md"
                        : "bg-green-500 text-white shadow-md"
                      : "bg-tg-secondary text-tg-text"
                  }`}
                >
                  {p.label}
                  {p.isMarket && (
                    <div className="text-[10px] font-normal opacity-80 -mt-0.5">
                      рынок
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-tg-hint">
              {selectedMult === null
                ? "Выбери коэффициент"
                : selectedMult <= mktMultRounded + 0.2
                  ? "Сработает сразу"
                  : "Ждёт встречного игрока"}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 text-xs font-medium rounded-lg px-3 py-2 mb-3">
            {error}
          </div>
        )}

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
                Ставлю {formatPRC(numBet)} на {sideLabel}
              </div>
              <div
                className={`text-3xl font-bold ${isNo ? "text-red-600" : "text-green-600"}`}
              >
                +{formatPRC(potentialWin - numBet)}
              </div>
              <div
                className={`text-sm mt-1 ${isNo ? "text-red-500" : "text-green-500"}`}
              >
                выигрыш {formatPRC(potentialWin)} (x{activeMult.toFixed(1)})
              </div>
            </div>

            <div className="bg-tg-secondary rounded-xl p-3 text-sm space-y-1 mb-3">
              <div className="flex justify-between">
                <span className="text-tg-hint">Ставка</span>
                <span className="font-medium">{formatPRC(numBet)}</span>
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
              disabled={placeOrderMutation.isPending || quantity <= 0}
              className={`w-full py-3.5 rounded-xl font-bold text-base text-white disabled:opacity-50 ${
                isNo ? "bg-red-500" : "bg-green-500"
              }`}
            >
              {placeOrderMutation.isPending
                ? "Отправка..."
                : isMarketMode
                  ? `Купить сейчас — ${sideLabel} за ${formatPRC(numBet)}`
                  : `Ставлю на ${sideLabel} — ${formatPRC(numBet)}`}
            </button>
          </>
        )}
      </div>

      {/* SELL (only if has shares) */}
      {(yesShares > 0 || noShares > 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setShowSell(!showSell)}
            className="w-full flex items-center justify-between px-4 py-3"
          >
            <span className="text-sm font-semibold">
              Продать акции
              <span className="text-xs text-tg-hint font-normal ml-2">
                {yesShares > 0 && `ДА: ${yesShares.toFixed(1)}`}
                {yesShares > 0 && noShares > 0 && " / "}
                {noShares > 0 && `НЕТ: ${noShares.toFixed(1)}`}
              </span>
            </span>
            <span className="text-tg-hint">{showSell ? "−" : "+"}</span>
          </button>

          {showSell && (
            <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
              <p className="text-xs text-tg-hint">
                Продай свои акции другим игрокам и получи PRC.
              </p>

              <div className="flex gap-2">
                {yesShares > 0 && (
                  <button
                    onClick={() => setSellOutcome("yes")}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold ${
                      sellOutcome === "yes"
                        ? "bg-green-500 text-white"
                        : "bg-green-50 text-green-700"
                    }`}
                  >
                    ДА ({yesShares.toFixed(1)})
                  </button>
                )}
                {noShares > 0 && (
                  <button
                    onClick={() => setSellOutcome("no")}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold ${
                      sellOutcome === "no"
                        ? "bg-red-500 text-white"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    НЕТ ({noShares.toFixed(1)})
                  </button>
                )}
              </div>

              <div>
                <label className="text-xs text-tg-hint block mb-1">
                  Цена продажи
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  max="0.99"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  className="w-full bg-tg-secondary rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-tg-hint block mb-1">
                  Сколько продать
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={sellQty}
                  onChange={(e) => setSellQty(e.target.value)}
                  placeholder={`Макс: ${(sellOutcome === "yes" ? yesShares : noShares).toFixed(1)}`}
                  className="w-full bg-tg-secondary rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>

              {numSellPrice > 0 && numSellQty > 0 && (
                <button
                  onClick={handleSell}
                  disabled={placeOrderMutation.isPending}
                  className="w-full py-2.5 bg-orange-500 text-white rounded-lg font-semibold text-sm disabled:opacity-50"
                >
                  {placeOrderMutation.isPending
                    ? "Отправка..."
                    : `Продать ${numSellQty} ${sellOutcome === "yes" ? "ДА" : "НЕТ"} по ${numSellPrice.toFixed(2)}`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
