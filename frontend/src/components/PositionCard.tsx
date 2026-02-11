import type { Position } from "@/types";
import { formatPRC } from "@/utils/format";

interface PositionCardProps {
  position: Position;
}

export function PositionCard({ position }: PositionCardProps) {
  const isResolved = position.market_status === "resolved";
  const won = isResolved && position.resolution_outcome === position.outcome;
  const payout = won ? position.shares : 0;
  const profit = payout - position.total_cost;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h4 className="text-sm font-medium leading-tight">
            {position.market_title ?? "Market"}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                position.outcome === "yes"
                  ? "bg-yes-light text-yes-dark"
                  : "bg-no-light text-no-dark"
              }`}
            >
              {position.outcome === "yes" ? "ДА" : "НЕТ"}
            </span>
            {isResolved && (
              <span
                className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                  won ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {won ? "Выиграл" : "Проиграл"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs mt-3">
        <div>
          <span className="text-tg-hint block">Количество</span>
          <span className="font-medium">{Number(position.shares).toFixed(2)}</span>
        </div>
        <div>
          <span className="text-tg-hint block">Ставка</span>
          <span className="font-medium">{formatPRC(position.total_cost)}</span>
        </div>
        <div>
          <span className="text-tg-hint block">{isResolved ? "Результат" : "Коэфф."}</span>
          {isResolved ? (
            <span className={`font-medium ${profit >= 0 ? "text-yes-dark" : "text-no-dark"}`}>
              {profit >= 0 ? "+" : ""}{formatPRC(profit)}
            </span>
          ) : (
            <span className="font-medium text-tg-link">
              x{(position.total_cost > 0 ? position.shares / position.total_cost : 0).toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
