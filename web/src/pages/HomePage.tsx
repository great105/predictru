import { useState, useCallback, useRef, useEffect } from "react";
import { useMarkets } from "../hooks";
import MarketCard from "../components/MarketCard";

const CATEGORIES = [
  { value: "all", label: "Все" },
  { value: "general", label: "🌐 Общее" },
  { value: "sports", label: "⚽ Спорт" },
  { value: "crypto", label: "₿ Крипто" },
  { value: "politics", label: "🏛️ Политика" },
  { value: "tech", label: "💻 Технологии" },
  { value: "entertainment", label: "🎬 Развлечения" },
];

export default function HomePage() {
  const [category, setCategory] = useState("all");
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useMarkets(category);

  const observerRef = useRef<HTMLDivElement>(null);

  // Infinite scroll with IntersectionObserver
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Рынки</h1>
        <p className="text-sm text-muted mt-1">Торгуйте предсказаниями на актуальные события</p>
      </div>

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

      {/* Markets grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-surface-3 rounded w-1/3 mb-3" />
              <div className="h-5 bg-surface-3 rounded w-full mb-2" />
              <div className="h-5 bg-surface-3 rounded w-3/4 mb-4" />
              <div className="h-8 bg-surface-3 rounded mb-3" />
              <div className="h-3 bg-surface-3 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : markets.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-muted">Нет активных рынков в этой категории</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {markets.map((market, i) => (
            <MarketCard key={market.id} market={market} index={i} />
          ))}
        </div>
      )}

      {/* Infinite scroll trigger */}
      <div ref={observerRef} className="h-10 flex items-center justify-center">
        {isFetchingNextPage && (
          <svg className="animate-spin w-5 h-5 text-accent" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>
    </div>
  );
}
