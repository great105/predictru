import { useState } from "react";
import { useMyOrders, useCancelOrder } from "@/hooks/useOrderBook";
import { useWebApp } from "@/hooks/useWebApp";
import type { UserOrder } from "@/types";

interface OpenOrdersProps {
  marketId?: string;
}

const INTENT_LABELS: Record<string, string> = {
  buy_yes: "Ставлю на ДА",
  buy_no: "Ставлю на НЕТ",
  sell_yes: "Продаю ДА",
  sell_no: "Продаю НЕТ",
};

const INTENT_COLORS: Record<string, string> = {
  buy_yes: "text-green-600 bg-green-50",
  buy_no: "text-red-600 bg-red-50",
  sell_yes: "text-red-600 bg-red-50",
  sell_no: "text-green-600 bg-green-50",
};

function OrderRow({ order }: { order: UserOrder }) {
  const cancelMutation = useCancelOrder();
  const { haptic } = useWebApp();

  const filled = order.filled_quantity;
  const total = order.quantity;
  const progress = total > 0 ? (filled / total) * 100 : 0;

  const [confirmCancel, setConfirmCancel] = useState(false);

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
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 min-w-0">
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
              INTENT_COLORS[order.original_intent] ?? "text-gray-600 bg-gray-50"
            }`}
          >
            {INTENT_LABELS[order.original_intent] ?? order.original_intent}
          </span>
          <span className="text-sm font-medium">
            @ {(order.price * 100).toFixed(0)}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-tg-button rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-tg-hint whitespace-nowrap">
            {filled.toFixed(1)}/{total.toFixed(1)}
          </span>
        </div>
      </div>

      <button
        onClick={handleCancel}
        disabled={cancelMutation.isPending}
        className={`text-xs font-medium px-2 py-1 rounded-lg transition-colors disabled:opacity-50 ${
          confirmCancel
            ? "text-white bg-red-500"
            : "text-red-500 bg-red-50 hover:bg-red-100"
        }`}
      >
        {cancelMutation.isPending ? "..." : confirmCancel ? "Точно?" : "Отменить"}
      </button>
    </div>
  );
}

export function OpenOrders({ marketId }: OpenOrdersProps) {
  const { data: orders, isLoading } = useMyOrders(marketId);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold mb-2">Твои заявки</h3>
        <div className="text-center text-tg-hint text-sm py-4">Загрузка...</div>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold mb-2">
        Твои заявки ({orders.length})
      </h3>
      <div>
        {orders.map((order) => (
          <OrderRow key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}
