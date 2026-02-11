import { useState, useEffect } from "react";

/** Returns actual Telegram viewport height in px, updates on resize */
export function useTgHeight(): number {
  const [h, setH] = useState(() => {
    const tg = window.Telegram?.WebApp as any;
    return tg?.viewportStableHeight || tg?.viewportHeight || window.innerHeight;
  });

  useEffect(() => {
    const tg = window.Telegram?.WebApp as any;
    const update = () => {
      setH(tg?.viewportStableHeight || tg?.viewportHeight || window.innerHeight);
    };
    tg?.onEvent?.("viewportChanged", update);
    window.addEventListener("resize", update);
    return () => {
      tg?.offEvent?.("viewportChanged", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return h;
}
