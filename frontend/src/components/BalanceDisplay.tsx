import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { formatPRC } from "@/utils/format";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function BalanceDisplay() {
  const user = useAuthStore((s) => s.user);
  const [displayed, setDisplayed] = useState(user?.balance ?? 0);
  const prevRef = useRef(user?.balance ?? 0);

  useEffect(() => {
    const target = user?.balance ?? 0;
    const from = prevRef.current;
    if (from === target) return;

    const duration = 400;
    let start: number | null = null;
    let raf: number;

    const step = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const t = Math.min(elapsed / duration, 1);
      setDisplayed(from + (target - from) * easeOutCubic(t));
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        prevRef.current = target;
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [user?.balance]);

  if (!user) return null;

  return (
    <div className="flex items-center gap-1 bg-tg-secondary rounded-full px-3 py-1.5">
      <span className="text-sm font-semibold tabular-nums">
        🪙 {formatPRC(displayed)}
      </span>
    </div>
  );
}
