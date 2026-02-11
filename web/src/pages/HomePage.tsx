import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useMarkets } from "../hooks";
import MarketCard from "../components/MarketCard";

const CATEGORIES = [
  { value: "all", label: "Все рынки" },
  { value: "general", label: "Общее" },
  { value: "politics", label: "Политика" },
  { value: "economics", label: "Экономика" },
  { value: "sports", label: "Спорт" },
  { value: "crypto", label: "Крипто" },
  { value: "tech", label: "Технологии" },
  { value: "entertainment", label: "Развлечения" },
];

export default function HomePage() {
  const [category, setCategory] = useState("all");
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useMarkets(category);

  const observerRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [handleObserver]);

  const markets = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl lg:text-4xl font-display font-extrabold tracking-tight">
            Рынки предсказаний
          </h1>
          <p className="text-sm text-txt-secondary mt-2 max-w-lg">
            Торгуйте прогнозами на актуальные события. Покупайте акции ДА или НЕТ и зарабатывайте на точных предсказаниях.
          </p>
        </div>
        <div className="text-sm text-txt-muted font-mono">
          {markets.length > 0 && `${markets.length} рынков`}
        </div>
      </motion.div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`chip ${category === cat.value ? "chip-active" : "chip-inactive"}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Markets grid — 4 columns on xl, 3 on lg, 2 on md */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="flex justify-between">
                <div className="h-6 w-20 shimmer rounded-md" />
                <div className="h-6 w-14 shimmer rounded-md" />
              </div>
              <div className="h-5 shimmer rounded w-full" />
              <div className="h-5 shimmer rounded w-3/4" />
              <div className="h-10 shimmer rounded-lg" />
              <div className="h-4 shimmer rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : markets.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-base-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-txt-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <p className="text-txt-secondary font-medium">Нет активных рынков в этой категории</p>
          <p className="text-txt-muted text-sm mt-1">Попробуйте выбрать другую категорию</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {markets.map((market, i) => (
            <MarketCard key={market.id} market={market} index={i} />
          ))}
        </div>
      )}

      {/* Infinite scroll trigger */}
      <div ref={observerRef} className="h-10 flex items-center justify-center">
        {isFetchingNextPage && (
          <svg className="animate-spin w-5 h-5 text-brand" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>
    </div>
  );
}
