import { useState, useCallback, useRef } from "react";
import { useMarkets } from "@/hooks/useMarkets";
import { MarketCard } from "@/components/MarketCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { MarketCardSkeleton } from "@/components/Skeleton";

export function HomePage() {
  const [category, setCategory] = useState("all");
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

  const allMarkets = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div>
      <CategoryFilter selected={category} onSelect={setCategory} />

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
            Вопросов пока нет. Загляни позже!
          </div>
        )}
      </div>
    </div>
  );
}
