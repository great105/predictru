import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { marketsApi } from "@/api/endpoints";

export function useMarkets(category?: string, status?: string) {
  return useInfiniteQuery({
    queryKey: ["markets", category, status],
    queryFn: async ({ pageParam }) => {
      const { data } = await marketsApi.list({
        category,
        status,
        cursor: pageParam as string | undefined,
        limit: 20,
      });
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
}

export function useMarketDetail(id: string) {
  return useQuery({
    queryKey: ["market", id],
    queryFn: async () => {
      const { data } = await marketsApi.get(id);
      return data;
    },
    enabled: !!id,
  });
}

export function usePriceHistory(id: string) {
  return useQuery({
    queryKey: ["market-history", id],
    queryFn: async () => {
      const { data } = await marketsApi.history(id);
      return data;
    },
    enabled: !!id,
  });
}
