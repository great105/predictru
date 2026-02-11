import { useState, useCallback, useRef } from "react";
import { useMarkets } from "@/hooks/useMarkets";
import { MarketCard } from "@/components/MarketCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { MarketCardSkeleton } from "@/components/Skeleton";

export function HomePage() {
  const [category, setCategory] = useState("all");
  const [ammFilter, setAmmFilter] = useState<"all" | "clob" | "lmsr">("all");
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useMarkets(category === "all" ? undefined : category);

  const observerRef = useRef<IntersectionObserver>();
  const lastRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  const allMarketsRaw = data?.pages.flatMap((p) => p.items) ?? [];
  const allMarkets = ammFilter === "all"
    ? allMarketsRaw
    : allMarketsRaw.filter((m) => m.amm_type === ammFilter);

  return (
    <div>
      <CategoryFilter selected={category} onSelect={setCategory} />

      {/* AMM type filter */}
      <div className="flex flex-wrap gap-1.5 px-4 mt-1 mb-2">
        {(["all", "clob", "lmsr"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setAmmFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              ammFilter === t
                ? "bg-tg-button text-tg-button-text"
                : "bg-tg-secondary text-tg-hint"
            }`}
          >
            {t === "all" ? "Все" : t === "clob" ? "Order Book" : "AMM"}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-3 pb-4">
        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <MarketCardSkeleton key={i} />
          ))}

        {allMarkets.map((market, idx) => (
          <div
            key={market.id}
            ref={idx === allMarkets.length - 1 ? lastRef : undefined}
          >
            <MarketCard market={market} />
          </div>
        ))}

        {isFetchingNextPage &&
          Array.from({ length: 2 }).map((_, i) => (
            <MarketCardSkeleton key={`loading-${i}`} />
          ))}

        {!isLoading && allMarkets.length === 0 && (
          <div className="text-center text-tg-hint py-12">
            Рынки не найдены
          </div>
        )}
      </div>
    </div>
  );
}
