import { motion } from "framer-motion";
import type { Position } from "@/types";

interface StreakBadgeProps {
  positions: Position[];
}

function computeStreak(positions: Position[]): number {
  const resolved = positions
    .filter((p) => p.market_status === "resolved")
    .sort((a, b) => (b.market?.created_at ?? "").localeCompare(a.market?.created_at ?? ""));

  let streak = 0;
  for (const pos of resolved) {
    const won = pos.resolution_outcome === pos.outcome;
    if (won) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function StreakBadge({ positions }: StreakBadgeProps) {
  const streak = computeStreak(positions);

  if (streak < 2) return null;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/20 rounded-xl px-4 py-3"
    >
      <span className="text-2xl">🔥</span>
      <div>
        <div className="text-sm font-bold text-orange-400">
          {streak} верных подряд!
        </div>
        <div className="text-xs text-tg-hint">
          Продолжай в том же духе
        </div>
      </div>
    </motion.div>
  );
}
