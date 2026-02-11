import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { usePositions, useMyOrders, useCancelOrder } from "../hooks";
import { useAuthStore } from "../store";

export default function PortfolioPage() {
  const balance = useAuthStore((s) => s.user?.balance ?? 0);
  const { data: positions, isLoading: posLoading } = usePositions();
  const { data: orders } = useMyOrders();
  const cancelOrder = useCancelOrder();
  const [tab, setTab] = useState<"active" | "orders" | "resolved">("active");

  const activePositions = positions?.filter((p) => p.market_status === "open" || p.market_status === "trading_closed") ?? [];
  const resolvedPositions = positions?.filter((p) => p.market_status === "resolved" || p.market_status === "cancelled") ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Портфель</h1>

      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-blue-600/10 to-purple-500/10" />
        <div className="absolute inset-0 glass" />
        <div className="relative">
          <p className="text-xs text-muted mb-1">Баланс</p>
          <p className="text-4xl font-bold font-mono gradient-text">
            {Number(balance).toLocaleString("ru-RU")}
          </p>
          <p className="text-sm text-muted mt-1">PRC</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-2 rounded-xl p-1">
        {[
          { key: "active" as const, label: "Активные", count: activePositions.length },
          { key: "orders" as const, label: "Ордера", count: orders?.length ?? 0 },
          { key: "resolved" as const, label: "Закрытые", count: resolvedPositions.length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${
              tab === t.key
                ? "bg-surface-4 text-white shadow"
                : "text-muted hover:text-white"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 bg-accent/20 text-accent text-[10px] px-1.5 py-0.5 rounded-full">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {posLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-surface-3 rounded w-2/3 mb-2" />
              <div className="h-3 bg-surface-3 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : tab === "active" ? (
        activePositions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-muted text-sm">Нет активных позиций</p>
            <Link to="/" className="btn-primary inline-block mt-4 text-xs">Открыть рынки</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {activePositions.map((pos, i) => (
              <motion.div
                key={pos.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/market/${pos.market_id}`}
                  className="block glass rounded-xl p-4 glass-hover transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{pos.market_title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          pos.outcome === "yes" ? "bg-yes/10 text-yes" : "bg-no/10 text-no"
                        }`}>
                          {pos.outcome === "yes" ? "ДА" : "НЕТ"}
                        </span>
                        <span className="text-xs font-mono text-muted">
                          {pos.shares.toFixed(2)} акций
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono font-medium">{pos.total_cost.toFixed(0)} PRC</p>
                      <p className="text-[10px] font-mono text-muted">
                        avg {(pos.avg_price * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )
      ) : tab === "orders" ? (
        !orders?.length ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-muted text-sm">Нет активных ордеров</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="glass rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">
                    {order.original_intent.replace("_", " ").toUpperCase()}
                  </p>
                  <p className="text-[10px] font-mono text-muted mt-1">
                    {(order.price * 100).toFixed(1)}% x {order.quantity}
                    {order.filled_quantity > 0 && (
                      <span className="text-yes ml-1.5">
                        {order.filled_quantity}/{order.quantity} исполнено
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => cancelOrder.mutate(order.id)}
                  className="text-xs text-no hover:text-no-light transition-colors px-3 py-1.5 rounded-lg hover:bg-no/10"
                >
                  Отменить
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        resolvedPositions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">📜</p>
            <p className="text-muted text-sm">Нет закрытых позиций</p>
          </div>
        ) : (
          <div className="space-y-3">
            {resolvedPositions.map((pos) => {
              const won = pos.resolution_outcome === pos.outcome;
              return (
                <div key={pos.id} className="glass rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{pos.market_title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          pos.outcome === "yes" ? "bg-yes/10 text-yes" : "bg-no/10 text-no"
                        }`}>
                          {pos.outcome === "yes" ? "ДА" : "НЕТ"}
                        </span>
                        <span className={`text-[10px] font-medium ${won ? "text-yes" : "text-no"}`}>
                          {won ? "Выигрыш" : "Проигрыш"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-mono font-medium ${won ? "text-yes" : "text-no"}`}>
                        {won ? "+" : "-"}{pos.total_cost.toFixed(0)} PRC
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
