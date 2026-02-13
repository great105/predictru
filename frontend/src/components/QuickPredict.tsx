import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MarketDetail } from "@/types";
import { useBuy } from "@/hooks/useTrade";
import { usePlaceOrder } from "@/hooks/useOrderBook";
import { useWebApp } from "@/hooks/useWebApp";
import { formatPRC } from "@/utils/format";
import { fireConfetti } from "@/utils/confetti";

interface QuickPredictProps {
  market: MarketDetail;
}

const PRESETS = [10, 25, 50, 100];

export function QuickPredict({ market }: QuickPredictProps) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState(25);
  const { haptic } = useWebApp();
  const buyMutation = useBuy();
  const placeOrderMutation = usePlaceOrder();

  const isClob = market.amm_type === "clob";
  const isPending = buyMutation.isPending || placeOrderMutation.isPending;
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setError(null);
    try {
      if (isClob) {
        const price = outcome === "yes" ? market.price_yes : market.price_no;
        const qty = Math.floor(amount / Math.max(price, 0.01));
        if (qty <= 0) return;
        await placeOrderMutation.mutateAsync({
          market_id: market.id,
          intent: `buy_${outcome}`,
          price: Math.round(price * 100) / 100,
          quantity: qty,
        });
      } else {
        await buyMutation.mutateAsync({
          market_id: market.id,
          outcome,
          amount,
        });
      }
      haptic?.notificationOccurred("success");
      fireConfetti();
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
      }, 1500);
    } catch (e: any) {
      haptic?.notificationOccurred("error");
      const msg = e?.response?.data?.detail || "Ошибка";
      setError(typeof msg === "string" ? msg : "Ошибка");
    }
  }, [isClob, outcome, amount, market, buyMutation, placeOrderMutation, haptic]);

  if (market.status !== "open") return null;

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          haptic?.impactOccurred("medium");
        }}
        className="w-full py-3 rounded-xl font-bold text-base bg-tg-button text-tg-button-text"
      >
        Быстрый прогноз
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl p-5 safe-area-bottom"
              style={{ background: "rgba(15, 23, 36, 0.95)", backdropFilter: "blur(16px)" }}
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

              <h3 className="text-base font-bold text-center mb-4">
                {market.title}
              </h3>

              {success ? (
                <div className="text-center py-6">
                  <div className="text-3xl mb-2">🎉</div>
                  <div className="text-green-400 font-bold">Ставка принята!</div>
                </div>
              ) : (
                <>
                  {/* YES / NO */}
                  <div className="flex gap-3 mb-4">
                    <button
                      onClick={() => {
                        setOutcome("yes");
                        haptic?.selectionChanged();
                      }}
                      className={`flex-1 py-3.5 rounded-xl font-bold text-base transition-colors ${
                        outcome === "yes"
                          ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                          : "bg-green-500/10 text-green-400"
                      }`}
                    >
                      ДА
                    </button>
                    <button
                      onClick={() => {
                        setOutcome("no");
                        haptic?.selectionChanged();
                      }}
                      className={`flex-1 py-3.5 rounded-xl font-bold text-base transition-colors ${
                        outcome === "no"
                          ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      НЕТ
                    </button>
                  </div>

                  {/* Amount presets */}
                  <div className="flex gap-2 mb-4">
                    {PRESETS.map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setAmount(p);
                          haptic?.selectionChanged();
                        }}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                          amount === p
                            ? "bg-tg-button text-tg-button-text"
                            : "bg-white/5 text-tg-text"
                        }`}
                      >
                        {p} PRC
                      </button>
                    ))}
                  </div>

                  {/* Estimated payout */}
                  {(() => {
                    const price = outcome === "yes" ? market.price_yes : market.price_no;
                    const qty = isClob
                      ? Math.floor(amount / Math.max(price, 0.01))
                      : Math.round(amount / Math.max(price, 0.01));
                    const payout = qty;
                    const profit = payout - amount;
                    return (
                      <div className="glass-card p-3 mb-4 space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-tg-hint">Цена за акцию</span>
                          <span className="text-tg-text font-medium">{price.toFixed(2)} PRC</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-tg-hint">Получите акций</span>
                          <span className="text-tg-text font-medium">~{qty}</span>
                        </div>
                        <div className="border-t border-white/10 pt-1.5 flex justify-between text-sm">
                          <span className="text-tg-hint font-medium">Выигрыш если угадал</span>
                          <span className="text-green-400 font-bold">+{formatPRC(profit)} PRC</span>
                        </div>
                      </div>
                    );
                  })()}

                  {error && (
                    <div className="bg-red-500/10 text-red-400 text-xs font-medium rounded-lg px-3 py-2 mb-3">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={isPending}
                    className={`w-full py-3.5 rounded-xl font-bold text-base text-white disabled:opacity-50 ${
                      outcome === "yes" ? "bg-green-500" : "bg-red-500"
                    }`}
                  >
                    {isPending
                      ? "Отправляем..."
                      : `Ставлю ${formatPRC(amount)} на ${outcome === "yes" ? "ДА" : "НЕТ"}`}
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
