import { useState } from "react";
import { motion } from "framer-motion";
import { useBuy, useSell } from "../hooks";
import { useTradeStore, useAuthStore } from "../store";
import type { MarketDetail } from "../types";

const PRESETS = [10, 25, 50, 100, 250];
const FEE = 0.02;

function priceToMult(price: number): number {
  return price > 0 ? (1 - FEE) / price : 0;
}

export default function TradePanel({ market }: { market: MarketDetail }) {
  const { outcome, amount, setOutcome, setAmount, reset } = useTradeStore();
  const balance = useAuthStore((s) => s.user?.balance ?? 0);
  const buy = useBuy();
  const sell = useSell();
  const [mode, setMode] = useState<"buy" | "sell">("buy");

  const numAmount = parseFloat(amount) || 0;
  const price = outcome === "yes" ? market.price_yes : market.price_no;
  const estimatedShares = numAmount > 0 ? numAmount / price : 0;
  const yesMult = priceToMult(market.price_yes);
  const noMult = priceToMult(market.price_no);
  const activeMult = outcome === "yes" ? yesMult : noMult;
  const potentialWin = numAmount * activeMult;

  const handleTrade = () => {
    if (numAmount <= 0) return;
    if (mode === "buy") {
      buy.mutate(
        { market_id: market.id, outcome, amount: numAmount },
        { onSuccess: () => reset() }
      );
    } else {
      sell.mutate(
        { market_id: market.id, outcome, shares: numAmount },
        { onSuccess: () => reset() }
      );
    }
  };

  const isLoading = buy.isPending || sell.isPending;

  return (
    <div className="card p-5 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-base">Торговля</h3>
        <div className="flex bg-base-700 rounded-lg p-0.5 border border-line">
          <button
            onClick={() => setMode("buy")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              mode === "buy" ? "bg-brand text-base-950 shadow-sm" : "text-txt-muted hover:text-txt"
            }`}
          >
            Купить
          </button>
          <button
            onClick={() => setMode("sell")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              mode === "sell" ? "bg-no text-white shadow-sm" : "text-txt-muted hover:text-txt"
            }`}
          >
            Продать
          </button>
        </div>
      </div>

      {/* Outcome selector */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setOutcome("yes")}
          className={`relative overflow-hidden rounded-xl p-4 text-center transition-all border ${
            outcome === "yes"
              ? "border-yes/50 bg-yes/10"
              : "border-line bg-base-800 hover:border-yes/30"
          }`}
        >
          <div className="relative">
            <p className="text-yes font-bold text-xl font-mono">x{yesMult.toFixed(1)}</p>
            <p className="text-xs text-txt-muted mt-1 font-medium">Да <span className="font-mono opacity-60">{Math.round(market.price_yes * 100)}%</span></p>
          </div>
        </button>
        <button
          onClick={() => setOutcome("no")}
          className={`relative overflow-hidden rounded-xl p-4 text-center transition-all border ${
            outcome === "no"
              ? "border-no/50 bg-no/10"
              : "border-line bg-base-800 hover:border-no/30"
          }`}
        >
          <div className="relative">
            <p className="text-no font-bold text-xl font-mono">x{noMult.toFixed(1)}</p>
            <p className="text-xs text-txt-muted mt-1 font-medium">Нет <span className="font-mono opacity-60">{Math.round(market.price_no * 100)}%</span></p>
          </div>
        </button>
      </div>

      {/* Amount input */}
      <div>
        <label className="text-xs text-txt-muted font-medium mb-1.5 block">
          {mode === "buy" ? "Сумма (PRC)" : "Количество акций"}
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="input-field font-mono text-lg"
          min={0}
        />
        <div className="flex gap-2 mt-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(String(p))}
              className="chip chip-inactive text-[10px] flex-1 py-1.5"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {numAmount > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-3"
        >
          {mode === "buy" && (
            <div className={`rounded-xl p-4 text-center border ${
              outcome === "no" ? "bg-no/5 border-no/20" : "bg-yes/5 border-yes/20"
            }`}>
              <p className={`text-3xl font-bold font-mono ${outcome === "no" ? "text-no" : "text-yes"}`}>
                +{(potentialWin - numAmount).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} PRC
              </p>
              <p className={`text-sm mt-1 ${outcome === "no" ? "text-no/70" : "text-yes/70"}`}>
                выигрыш {potentialWin.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} PRC (x{activeMult.toFixed(1)})
              </p>
            </div>
          )}
          <div className="bg-base-800 rounded-xl p-4 space-y-2.5 text-xs border border-line">
            <div className="flex justify-between text-txt-muted">
              <span>Цена за акцию</span>
              <span className="font-mono text-txt-secondary">{(price * 100).toFixed(1)}%</span>
            </div>
            {mode === "buy" && (
              <div className="flex justify-between text-txt-muted">
                <span>~Акций</span>
                <span className="font-mono text-txt-secondary">{estimatedShares.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-txt-muted">
              <span>Комиссия (2%)</span>
              <span className="font-mono text-txt-secondary">{(numAmount * 0.02).toFixed(2)} PRC</span>
            </div>
            <div className="border-t border-line pt-2.5 flex justify-between font-semibold text-txt">
              <span>Если угадал</span>
              <span className={`font-mono ${outcome === "yes" ? "text-yes" : "text-no"}`}>
                {potentialWin.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} PRC
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Balance & submit */}
      <div className="flex items-center justify-between text-xs text-txt-muted">
        <span>Баланс: <span className="font-mono text-txt">{Number(balance).toLocaleString("ru-RU")} PRC</span></span>
      </div>

      <button
        onClick={handleTrade}
        disabled={numAmount <= 0 || isLoading}
        className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
          outcome === "yes"
            ? "bg-gradient-to-r from-yes to-emerald-500 text-white shadow-lg shadow-yes/20 hover:shadow-yes/30"
            : "bg-gradient-to-r from-no to-rose-500 text-white shadow-lg shadow-no/20 hover:shadow-no/30"
        }`}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Обработка...
          </span>
        ) : (
          `${mode === "buy" ? "Купить" : "Продать"} ${outcome === "yes" ? "ДА" : "НЕТ"}`
        )}
      </button>

      {(buy.isError || sell.isError) && (
        <p className="text-no text-xs text-center">Ошибка. Попробуйте снова.</p>
      )}
    </div>
  );
}
