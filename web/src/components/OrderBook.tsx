import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrderBook, usePlaceOrder, useCancelOrder, useMyOrders, usePositions } from "../hooks";
import { useAuthStore } from "../store";
import type { MarketDetail } from "../types";

const FEE = 0.02;
const BET_PRESETS = [10, 25, 50, 100, 250];

function multToPrice(mult: number): number {
  return Math.max(0.01, Math.min(0.99, (1 - FEE) / mult));
}
function priceToMult(price: number): number {
  return price > 0 ? (1 - FEE) / price : 0;
}
function formatPRC(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " PRC";
}

export default function OrderBookPanel({ market }: { market: MarketDetail }) {
  const { data: book } = useOrderBook(market.id);
  const { data: myOrders } = useMyOrders(market.id);
  const { data: positions } = usePositions();
  const placeOrder = usePlaceOrder();
  const cancelOrder = useCancelOrder();
  const balance = useAuthStore((s) => s.user?.balance ?? 0);

  const [outcome, setOutcome] = useState<"yes" | "no">("yes");
  const [betAmount, setBetAmount] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedMult, setSelectedMult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sell state
  const [showSell, setShowSell] = useState(false);
  const [sellOutcome, setSellOutcome] = useState<"yes" | "no">("yes");
  const [sellQty, setSellQty] = useState("");
  const [sellPrice, setSellPrice] = useState("0.50");

  // Collapsible sections
  const [showBook, setShowBook] = useState(false);
  const [showOrders, setShowOrders] = useState(false);

  // ── Market prices from order book ──
  const bestAskYes = book?.asks?.[0]?.price;
  const bestBidYes = book?.bids?.[0]?.price;

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
  const activePrice = isMarketMode ? sideMktPrice : multToPrice(selectedMult!);

  // Advanced presets
  const mktMultRounded = Math.round(sideMarketMult * 10) / 10;
  const presets: { label: string; mult: number; isMarket?: boolean }[] = [];
  if (mktMultRounded >= 1.05) {
    presets.push({ label: `x${mktMultRounded.toFixed(1)}`, mult: mktMultRounded, isMarket: true });
  }
  for (const m of [1.5, 2, 3, 5, 10]) {
    if (Math.abs(m - mktMultRounded) > 0.2) {
      presets.push({ label: `x${m}`, mult: m });
    }
  }
  presets.sort((a, b) => a.mult - b.mult);

  // Calculations
  const numBet = parseFloat(betAmount) || 0;
  const quantity = activePrice > 0 ? Math.floor((numBet / activePrice) * 100) / 100 : 0;
  const fee = numBet * FEE;
  const potentialWin = numBet * activeMult;
  const canBuy = numBet > 0 && activeMult > 0 && (!showAdvanced || selectedMult !== null);

  const switchOutcome = (newOutcome: "yes" | "no") => {
    if (newOutcome === outcome) return;
    setOutcome(newOutcome);
    setSelectedMult(null);
  };

  const handleBuy = useCallback(async () => {
    if (!activePrice || !quantity) return;
    setError(null);
    const intent = outcome === "yes" ? "buy_yes" : "buy_no";
    try {
      await placeOrder.mutateAsync({
        market_id: market.id,
        intent,
        price: Math.round(activePrice * 100) / 100,
        quantity,
      });
      setBetAmount("");
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Ошибка размещения";
      setError(typeof msg === "string" ? msg : "Ошибка размещения");
    }
  }, [activePrice, quantity, market.id, outcome, placeOrder]);

  // ── Sell ──
  const numSellPrice = parseFloat(sellPrice) || 0;
  const numSellQty = parseFloat(sellQty) || 0;

  const handleSell = useCallback(async () => {
    if (!numSellPrice || !numSellQty) return;
    setError(null);
    const intent = sellOutcome === "yes" ? "sell_yes" : "sell_no";
    try {
      await placeOrder.mutateAsync({
        market_id: market.id,
        intent,
        price: numSellPrice,
        quantity: numSellQty,
      });
      setSellQty("");
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Ошибка";
      setError(typeof msg === "string" ? msg : "Ошибка");
    }
  }, [numSellPrice, numSellQty, market.id, sellOutcome, placeOrder]);

  // Positions
  const myPositions = (positions ?? []).filter(
    (p) => p.market_id === market.id && p.shares > 0,
  );
  const yesShares = myPositions.find((p) => p.outcome === "yes")?.shares ?? 0;
  const noShares = myPositions.find((p) => p.outcome === "no")?.shares ?? 0;

  // Order book depth bars
  const maxBidQty = book ? Math.max(...book.bids.map((b) => b.quantity), 1) : 1;
  const maxAskQty = book ? Math.max(...book.asks.map((a) => a.quantity), 1) : 1;

  return (
    <div className="space-y-4">
      {/* ═══ BET FORM ═══ */}
      <div className="card p-5 lg:p-6 space-y-4">
        <h3 className="font-display font-semibold text-base">Сделать ставку</h3>

        {/* YES / NO buttons with multipliers */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => switchOutcome("yes")}
            className={`relative overflow-hidden rounded-xl p-4 text-center transition-all border ${
              outcome === "yes"
                ? "border-yes/50 bg-yes/10"
                : "border-line bg-base-800 hover:border-yes/30"
            }`}
          >
            <div className="relative">
              <p className="text-yes font-bold text-xl font-mono">
                x{yesMult.toFixed(1)}
              </p>
              <p className="text-xs text-txt-muted mt-1 font-medium">
                Да <span className="font-mono opacity-60">{Math.round(yesMktPrice * 100)}%</span>
              </p>
            </div>
          </button>
          <button
            onClick={() => switchOutcome("no")}
            className={`relative overflow-hidden rounded-xl p-4 text-center transition-all border ${
              outcome === "no"
                ? "border-no/50 bg-no/10"
                : "border-line bg-base-800 hover:border-no/30"
            }`}
          >
            <div className="relative">
              <p className="text-no font-bold text-xl font-mono">
                x{noMult.toFixed(1)}
              </p>
              <p className="text-xs text-txt-muted mt-1 font-medium">
                Нет <span className="font-mono opacity-60">{Math.round(noMktPrice * 100)}%</span>
              </p>
            </div>
          </button>
        </div>

        {/* Amount input */}
        <div>
          <label className="text-xs text-txt-muted font-medium mb-1.5 block">Сумма (PRC)</label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            placeholder="0"
            className="input-field font-mono text-lg"
            min={0}
          />
          <div className="flex gap-2 mt-2">
            {BET_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setBetAmount(String(p))}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                  numBet === p
                    ? "border-brand/50 bg-brand/10 text-brand"
                    : "border-line text-txt-muted hover:text-txt hover:border-line-light"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => {
            setShowAdvanced(!showAdvanced);
            if (showAdvanced) setSelectedMult(null);
          }}
          className="text-xs text-brand hover:text-brand-light transition-colors"
        >
          {showAdvanced ? "\u2190 Купить по рынку" : "Свой коэффициент \u2192"}
        </button>

        {/* Advanced presets */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-1.5 mb-1.5">
                {presets.map((p) => (
                  <button
                    key={p.mult}
                    onClick={() => setSelectedMult(p.mult)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                      selectedMult !== null && Math.abs(selectedMult - p.mult) < 0.05
                        ? isNo
                          ? "border-no/50 bg-no/15 text-no"
                          : "border-yes/50 bg-yes/15 text-yes"
                        : "border-line bg-base-800 text-txt-muted hover:text-txt hover:border-line-light"
                    }`}
                  >
                    {p.label}
                    {p.isMarket && (
                      <div className="text-[9px] font-normal opacity-60 -mt-0.5">рынок</div>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-txt-muted">
                {selectedMult === null
                  ? "Выбери коэффициент"
                  : selectedMult <= mktMultRounded + 0.2
                    ? "Сработает сразу"
                    : "Ждёт встречного игрока"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <p className="text-no text-xs text-center bg-no/10 rounded-lg py-2 px-3">{error}</p>
        )}

        {/* Summary + buy button */}
        <AnimatePresence>
          {canBuy && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden space-y-3"
            >
              {/* Potential win highlight */}
              <div className={`rounded-xl p-4 text-center border ${
                isNo ? "bg-no/5 border-no/20" : "bg-yes/5 border-yes/20"
              }`}>
                <p className={`text-xs mb-1 ${isNo ? "text-no/70" : "text-yes/70"}`}>
                  Ставлю {formatPRC(numBet)} на {sideLabel}
                </p>
                <p className={`text-3xl font-bold font-mono ${isNo ? "text-no" : "text-yes"}`}>
                  +{formatPRC(potentialWin - numBet)}
                </p>
                <p className={`text-sm mt-1 ${isNo ? "text-no/70" : "text-yes/70"}`}>
                  выигрыш {formatPRC(potentialWin)} (x{activeMult.toFixed(1)})
                </p>
              </div>

              {/* Details */}
              <div className="bg-base-800 rounded-xl p-4 space-y-2 text-xs border border-line">
                <div className="flex justify-between text-txt-muted">
                  <span>Ставка</span>
                  <span className="font-mono text-txt-secondary">{formatPRC(numBet)}</span>
                </div>
                <div className="flex justify-between text-txt-muted">
                  <span>Комиссия 2%</span>
                  <span className="font-mono text-txt-secondary">~{formatPRC(fee)}</span>
                </div>
                <div className="border-t border-line pt-2 flex justify-between text-txt-muted">
                  <span className="font-medium">Если угадал</span>
                  <span className={`font-mono font-semibold ${isNo ? "text-no" : "text-yes"}`}>
                    {formatPRC(potentialWin)}
                  </span>
                </div>
                <div className="flex justify-between text-txt-muted opacity-50">
                  <span>Баланс</span>
                  <span className="font-mono">{formatPRC(balance)}</span>
                </div>
              </div>

              {/* Buy button */}
              <button
                onClick={handleBuy}
                disabled={placeOrder.isPending || quantity <= 0}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  isNo
                    ? "bg-gradient-to-r from-no to-rose-500 text-white shadow-lg shadow-no/20 hover:shadow-no/30"
                    : "bg-gradient-to-r from-yes to-emerald-500 text-white shadow-lg shadow-yes/20 hover:shadow-yes/30"
                }`}
              >
                {placeOrder.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Отправка...
                  </span>
                ) : isMarketMode
                  ? `Купить сейчас \u2014 ${sideLabel} за ${formatPRC(numBet)}`
                  : `Ставлю на ${sideLabel} \u2014 ${formatPRC(numBet)}`
                }
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ SELL SECTION (collapsible, only if user has shares) ═══ */}
      {(yesShares > 0 || noShares > 0) && (
        <div className="card overflow-hidden">
          <button
            onClick={() => setShowSell(!showSell)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-base-800/50 transition-colors"
          >
            <span className="font-display font-semibold text-sm">
              Продать акции
              <span className="text-xs text-txt-muted font-body font-normal ml-2">
                {yesShares > 0 && `ДА: ${yesShares.toFixed(1)}`}
                {yesShares > 0 && noShares > 0 && " / "}
                {noShares > 0 && `НЕТ: ${noShares.toFixed(1)}`}
              </span>
            </span>
            <svg className={`w-4 h-4 text-txt-muted transition-transform ${showSell ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          <AnimatePresence>
            {showSell && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 border-t border-line pt-4 space-y-3">
                  <p className="text-xs text-txt-muted">
                    Продай свои акции другим игрокам и получи PRC.
                  </p>

                  <div className="flex gap-2">
                    {yesShares > 0 && (
                      <button
                        onClick={() => setSellOutcome("yes")}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all border ${
                          sellOutcome === "yes"
                            ? "border-yes/50 bg-yes/10 text-yes"
                            : "border-line text-txt-muted hover:text-txt"
                        }`}
                      >
                        ДА ({yesShares.toFixed(1)})
                      </button>
                    )}
                    {noShares > 0 && (
                      <button
                        onClick={() => setSellOutcome("no")}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all border ${
                          sellOutcome === "no"
                            ? "border-no/50 bg-no/10 text-no"
                            : "border-line text-txt-muted hover:text-txt"
                        }`}
                      >
                        НЕТ ({noShares.toFixed(1)})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-txt-muted font-medium mb-1 block">Цена продажи</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="0.99"
                        value={sellPrice}
                        onChange={(e) => setSellPrice(e.target.value)}
                        className="input-field font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-txt-muted font-medium mb-1 block">Кол-во</label>
                      <input
                        type="number"
                        value={sellQty}
                        onChange={(e) => setSellQty(e.target.value)}
                        placeholder={`Макс: ${(sellOutcome === "yes" ? yesShares : noShares).toFixed(1)}`}
                        className="input-field font-mono text-sm"
                      />
                    </div>
                  </div>

                  {numSellPrice > 0 && numSellQty > 0 && (
                    <button
                      onClick={handleSell}
                      disabled={placeOrder.isPending}
                      className="w-full py-2.5 rounded-xl bg-amber text-base-950 font-semibold text-sm transition-all hover:bg-amber/90 disabled:opacity-40"
                    >
                      {placeOrder.isPending
                        ? "Отправка..."
                        : `Продать ${numSellQty} ${sellOutcome === "yes" ? "ДА" : "НЕТ"} по ${numSellPrice}`
                      }
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ═══ MY ORDERS (collapsible) ═══ */}
      {myOrders && myOrders.length > 0 && (
        <div className="card overflow-hidden">
          <button
            onClick={() => setShowOrders(!showOrders)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-base-800/50 transition-colors"
          >
            <span className="font-display font-semibold text-sm">
              Мои ордера
              <span className="text-xs text-txt-muted font-body font-normal ml-2">{myOrders.length}</span>
            </span>
            <svg className={`w-4 h-4 text-txt-muted transition-transform ${showOrders ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          <AnimatePresence>
            {showOrders && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-4 border-t border-line pt-3 space-y-2">
                  {myOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between bg-base-800 rounded-xl p-3.5 border border-line">
                      <div>
                        <p className="text-xs font-semibold text-txt">
                          {order.original_intent.replace("_", " ").toUpperCase()}
                        </p>
                        <p className="text-[10px] font-mono text-txt-muted mt-1">
                          {(order.price * 100).toFixed(1)}% × {order.quantity}
                          {order.filled_quantity > 0 && (
                            <span className="text-yes ml-1.5">({order.filled_quantity} исполнено)</span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => cancelOrder.mutate(order.id)}
                        disabled={cancelOrder.isPending}
                        className="text-xs text-no hover:text-no-light transition-colors font-medium px-3 py-1.5 rounded-lg hover:bg-no/10"
                      >
                        Отменить
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ═══ ORDER BOOK (collapsible read-only) ═══ */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setShowBook(!showBook)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-base-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="font-display font-semibold text-sm">Книга ордеров</span>
            {book?.last_price != null && (
              <span className="text-[10px] font-mono text-brand bg-brand/10 px-2 py-0.5 rounded-md">
                Посл: {(book.last_price * 100).toFixed(1)}%
              </span>
            )}
          </div>
          <svg className={`w-4 h-4 text-txt-muted transition-transform ${showBook ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        <AnimatePresence>
          {showBook && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 border-t border-line pt-3">
                <div className="grid grid-cols-2 gap-4">
                  {/* Bids */}
                  <div>
                    <div className="flex justify-between text-[10px] text-txt-muted font-medium mb-2 px-2 uppercase tracking-wider">
                      <span>Цена</span>
                      <span>Кол-во</span>
                    </div>
                    <div className="space-y-0.5">
                      {(book?.bids ?? []).slice(0, 8).map((level, i) => (
                        <div key={i} className="relative flex justify-between items-center px-2 py-1.5 rounded text-xs font-mono">
                          <div
                            className="absolute inset-y-0 right-0 bg-yes/8 rounded"
                            style={{ width: `${(level.quantity / maxBidQty) * 100}%` }}
                          />
                          <span className="relative text-yes font-medium">{(level.price * 100).toFixed(1)}</span>
                          <span className="relative text-txt-muted">{level.quantity.toFixed(0)}</span>
                        </div>
                      ))}
                      {(!book?.bids?.length) && (
                        <p className="text-xs text-txt-muted text-center py-4">Нет заявок</p>
                      )}
                    </div>
                  </div>

                  {/* Asks */}
                  <div>
                    <div className="flex justify-between text-[10px] text-txt-muted font-medium mb-2 px-2 uppercase tracking-wider">
                      <span>Цена</span>
                      <span>Кол-во</span>
                    </div>
                    <div className="space-y-0.5">
                      {(book?.asks ?? []).slice(0, 8).map((level, i) => (
                        <div key={i} className="relative flex justify-between items-center px-2 py-1.5 rounded text-xs font-mono">
                          <div
                            className="absolute inset-y-0 left-0 bg-no/8 rounded"
                            style={{ width: `${(level.quantity / maxAskQty) * 100}%` }}
                          />
                          <span className="relative text-no font-medium">{(level.price * 100).toFixed(1)}</span>
                          <span className="relative text-txt-muted">{level.quantity.toFixed(0)}</span>
                        </div>
                      ))}
                      {(!book?.asks?.length) && (
                        <p className="text-xs text-txt-muted text-center py-4">Нет заявок</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
