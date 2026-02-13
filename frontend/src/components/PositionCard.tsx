import { useState } from "react";
import type { Position } from "@/types";
import { formatPRC } from "@/utils/format";
import { VictoryScreen } from "./VictoryScreen";

interface PositionCardProps {
  position: Position;
}

export function PositionCard({ position }: PositionCardProps) {
  const isResolved = position.market_status === "resolved";
  const won = isResolved && position.resolution_outcome === position.outcome;
  const payout = won ? position.shares : 0;
  const profit = payout - position.total_cost;
  const [showVictory, setShowVictory] = useState(false);

  return (
    <>
      <div className="glass-card p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h4 className="text-sm font-medium leading-tight">
              {position.market_title ?? "Market"}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                  position.outcome === "yes"
                    ? "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {position.outcome === "yes" ? "ДА" : "НЕТ"}
              </span>
              {isResolved && (
                <span
                  className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                    won ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {won ? "Угадал" : "Не угадал"}
                </span>
              )}
            </div>
          </div>
          {won && profit > 0 && (
            <button
              onClick={() => setShowVictory(true)}
              className="text-xs px-2.5 py-1 rounded-lg bg-green-500/10 text-green-400 font-semibold"
            >
              🎉 +{formatPRC(profit)}
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs mt-3">
          <div>
            <span className="text-tg-hint block">Штук</span>
            <span className="font-medium">{Number(position.shares).toFixed(2)}</span>
          </div>
          <div>
            <span className="text-tg-hint block">Потрачено</span>
            <span className="font-medium">{formatPRC(position.total_cost)}</span>
          </div>
          <div>
            <span className="text-tg-hint block">{isResolved ? "Результат" : "Множ."}</span>
            {isResolved ? (
              <span className={`font-medium ${profit >= 0 ? "text-green-400" : "text-red-400"}`}>
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

      {showVictory && (
        <VictoryScreen
          profit={profit}
          marketTitle={position.market_title ?? ""}
          onClose={() => setShowVictory(false)}
        />
      )}
    </>
  );
}
