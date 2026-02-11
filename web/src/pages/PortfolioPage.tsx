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
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl lg:text-4xl font-display font-extrabold tracking-tight">Портфель</h1>
      </motion.div>

      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card relative overflow-hidden p-6 lg:p-8"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-brand/8 via-transparent to-amber/5" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs text-txt-muted font-medium uppercase tracking-wider mb-2">Баланс аккаунта</p>
            <p className="text-4xl lg:text-5xl font-bold font-mono text-gradient">
              {Number(balance).toLocaleString("ru-RU")}
            </p>
            <p className="text-sm text-txt-muted mt-1">PRC</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-base-700 rounded-lg px-5 py-3 border border-line text-center min-w-[100px]">
              <p className="text-[10px] text-txt-muted uppercase tracking-wider">Активные</p>
              <p className="text-lg font-mono font-bold text-txt mt-1">{activePositions.length}</p>
            </div>
            <div className="bg-base-700 rounded-lg px-5 py-3 border border-line text-center min-w-[100px]">
              <p className="text-[10px] text-txt-muted uppercase tracking-wider">Ордера</p>
              <p className="text-lg font-mono font-bold text-txt mt-1">{orders?.length ?? 0}</p>
            </div>
            <div className="bg-base-700 rounded-lg px-5 py-3 border border-line text-center min-w-[100px]">
              <p className="text-[10px] text-txt-muted uppercase tracking-wider">Закрытые</p>
              <p className="text-lg font-mono font-bold text-txt mt-1">{resolvedPositions.length}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-base-800 rounded-xl p-1 border border-line max-w-md">
        {[
          { key: "active" as const, label: "Активные", count: activePositions.length },
          { key: "orders" as const, label: "Ордера", count: orders?.length ?? 0 },
          { key: "resolved" as const, label: "Закрытые", count: resolvedPositions.length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-base-600 text-txt shadow-sm"
                : "text-txt-muted hover:text-txt"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 bg-brand/15 text-brand text-[10px] px-1.5 py-0.5 rounded-full font-mono">
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
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-5 shimmer rounded w-2/3 mb-3" />
              <div className="h-4 shimmer rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : tab === "active" ? (
        activePositions.length === 0 ? (
          <EmptyState
            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />}
            title="Нет активных позиций"
            subtitle="Перейдите на рынки, чтобы открыть первую сделку"
            action={<Link to="/" className="btn-primary inline-block text-sm">Открыть рынки</Link>}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activePositions.map((pos, i) => (
              <motion.div
                key={pos.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  to={`/market/${pos.market_id}`}
                  className="block card card-hover p-5 h-full"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{pos.market_title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-md ${
                          pos.outcome === "yes" ? "bg-yes/10 text-yes" : "bg-no/10 text-no"
                        }`}>
                          {pos.outcome === "yes" ? "ДА" : "НЕТ"}
                        </span>
                        <span className="text-xs font-mono text-txt-muted">
                          {pos.shares.toFixed(2)} акций
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono font-bold">{pos.total_cost.toFixed(0)} PRC</p>
                      <p className="text-[10px] font-mono text-txt-muted mt-1">
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
          <EmptyState
            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />}
            title="Нет активных ордеров"
            subtitle="Ваши лимитные ордера появятся здесь"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {orders.map((order) => (
              <div key={order.id} className="card p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {order.original_intent.replace("_", " ").toUpperCase()}
                  </p>
                  <p className="text-xs font-mono text-txt-muted mt-1">
                    {(order.price * 100).toFixed(1)}% × {order.quantity}
                    {order.filled_quantity > 0 && (
                      <span className="text-yes ml-2">
                        {order.filled_quantity}/{order.quantity} исполнено
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => cancelOrder.mutate(order.id)}
                  className="text-xs text-no hover:text-no-light transition-colors px-3 py-2 rounded-lg hover:bg-no/10 font-medium shrink-0"
                >
                  Отменить
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        resolvedPositions.length === 0 ? (
          <EmptyState
            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />}
            title="Нет закрытых позиций"
            subtitle="Результаты ваших сделок будут здесь"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {resolvedPositions.map((pos, i) => {
              const won = pos.resolution_outcome === pos.outcome;
              return (
                <motion.div
                  key={pos.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="card p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{pos.market_title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-md ${
                          pos.outcome === "yes" ? "bg-yes/10 text-yes" : "bg-no/10 text-no"
                        }`}>
                          {pos.outcome === "yes" ? "ДА" : "НЕТ"}
                        </span>
                        <span className={`text-xs font-semibold ${won ? "text-yes" : "text-no"}`}>
                          {won ? "Выигрыш" : "Проигрыш"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-mono font-bold ${won ? "text-yes" : "text-no"}`}>
                        {won ? "+" : "-"}{pos.total_cost.toFixed(0)} PRC
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

function EmptyState({ icon, title, subtitle, action }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-base-700 flex items-center justify-center">
        <svg className="w-7 h-7 text-txt-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          {icon}
        </svg>
      </div>
      <p className="text-txt-secondary font-medium">{title}</p>
      <p className="text-txt-muted text-sm mt-1">{subtitle}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
