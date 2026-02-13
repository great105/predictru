import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/api/endpoints";
import { useAuthStore } from "@/stores/authStore";
import { useAllMyOrders, useCancelOrder } from "@/hooks/useOrderBook";
import { PositionCard } from "@/components/PositionCard";
import { StreakBadge } from "@/components/StreakBadge";
import { Skeleton } from "@/components/Skeleton";
import { formatPRC } from "@/utils/format";
import { useWebApp } from "@/hooks/useWebApp";
import type { UserOrder } from "@/types";

const INTENT_LABELS: Record<string, string> = {
  buy_yes: "Ставлю на ДА",
  buy_no: "Ставлю на НЕТ",
  sell_yes: "Продаю ДА",
  sell_no: "Продаю НЕТ",
};

const INTENT_COLORS: Record<string, string> = {
  buy_yes: "text-green-400 bg-green-500/10",
  buy_no: "text-red-400 bg-red-500/10",
  sell_yes: "text-red-400 bg-red-500/10",
  sell_no: "text-green-400 bg-green-500/10",
};

function PortfolioOrderRow({ order }: { order: UserOrder }) {
  const cancelMutation = useCancelOrder();
  const { haptic } = useWebApp();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const progress =
    order.quantity > 0
      ? (order.filled_quantity / order.quantity) * 100
      : 0;

  const handleCancel = async () => {
    if (!confirmCancel) {
      setConfirmCancel(true);
      setTimeout(() => setConfirmCancel(false), 3000);
      return;
    }
    try {
      await cancelMutation.mutateAsync(order.id);
      haptic?.notificationOccurred("success");
    } catch {
      haptic?.notificationOccurred("error");
    }
    setConfirmCancel(false);
  };

  return (
    <div className="glass-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
              INTENT_COLORS[order.original_intent] ?? "text-tg-hint bg-white/5"
            }`}
          >
            {INTENT_LABELS[order.original_intent] ?? order.original_intent}
          </span>
          <span className="text-sm font-medium">
            @ {(order.price * 100).toFixed(0)}%
          </span>
        </div>
        <button
          onClick={handleCancel}
          disabled={cancelMutation.isPending}
          className={`text-xs font-medium px-2 py-1 rounded-lg disabled:opacity-50 ${
            confirmCancel
              ? "text-white bg-red-500"
              : "text-red-400 bg-red-500/10"
          }`}
        >
          {cancelMutation.isPending ? "..." : confirmCancel ? "Точно?" : "Отменить"}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-tg-button rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-tg-hint">
          {order.filled_quantity.toFixed(1)}/{order.quantity.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

export function PortfolioPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<"active" | "orders" | "resolved">("active");

  const { data: positions, isLoading } = useQuery({
    queryKey: ["positions"],
    queryFn: async () => {
      const { data } = await usersApi.positions();
      return data;
    },
  });

  const { data: openOrders, isLoading: ordersLoading } = useAllMyOrders();

  const filtered = positions?.filter((p) => {
    if (tab === "active") return p.market_status === "open" || p.market_status === "trading_closed";
    if (tab === "resolved") return p.market_status === "resolved" || p.market_status === "cancelled";
    return false;
  });

  return (
    <div className="px-4 py-4">
      {/* Balance card */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-5 text-white mb-4">
        <div className="text-sm opacity-80">На счету 🪙</div>
        <div className="text-3xl font-bold mt-1">
          {formatPRC(user?.balance ?? 0)}
        </div>
      </div>

      {/* Streak */}
      {positions && <StreakBadge positions={positions} />}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(["active", "orders", "resolved"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? "bg-tg-button text-tg-button-text"
                : "bg-tg-secondary text-tg-text"
            }`}
          >
            {t === "active"
              ? "Сейчас"
              : t === "orders"
              ? `Заявки${openOrders?.length ? ` (${openOrders.length})` : ""}`
              : "Результаты"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-3">
        {tab === "orders" ? (
          <>
            {ordersLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            {openOrders?.map((order) => (
              <PortfolioOrderRow key={order.id} order={order} />
            ))}
            {!ordersLoading && (!openOrders || openOrders.length === 0) && (
              <div className="text-center text-tg-hint py-12">
                Нет активных заявок
              </div>
            )}
          </>
        ) : (
          <>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            {filtered?.map((pos) => (
              <PositionCard key={pos.id} position={pos} />
            ))}
            {!isLoading && (!filtered || filtered.length === 0) && (
              <div className="text-center text-tg-hint py-12">
                {tab === "active"
                  ? "Ты ещё не делал прогнозов. Выбери вопрос и попробуй!"
                  : "Пока нет результатов"}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
