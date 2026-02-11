import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { marketsApi, tradeApi, orderbookApi, usersApi } from "./api";
import { useAuthStore } from "./store";

// ── Markets ──
export function useMarkets(category?: string) {
  return useInfiniteQuery({
    queryKey: ["markets", category],
    queryFn: ({ pageParam }) =>
      marketsApi.list({
        category: category === "all" ? undefined : category,
        cursor: pageParam as string | undefined,
        limit: 20,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 30_000,
  });
}

export function useMarketDetail(id: string) {
  return useQuery({
    queryKey: ["market", id],
    queryFn: () => marketsApi.get(id),
    staleTime: 15_000,
    enabled: !!id,
  });
}

export function usePriceHistory(id: string) {
  return useQuery({
    queryKey: ["price-history", id],
    queryFn: () => marketsApi.history(id),
    staleTime: 30_000,
    enabled: !!id,
  });
}

// ── Trading (LMSR) ──
export function useBuy() {
  const qc = useQueryClient();
  const updateBalance = useAuthStore((s) => s.updateBalance);
  return useMutation({
    mutationFn: tradeApi.buy,
    onSuccess: (data) => {
      updateBalance(data.new_balance);
      qc.invalidateQueries({ queryKey: ["markets"] });
      qc.invalidateQueries({ queryKey: ["market"] });
      qc.invalidateQueries({ queryKey: ["positions"] });
      qc.invalidateQueries({ queryKey: ["price-history"] });
    },
  });
}

export function useSell() {
  const qc = useQueryClient();
  const updateBalance = useAuthStore((s) => s.updateBalance);
  return useMutation({
    mutationFn: tradeApi.sell,
    onSuccess: (data) => {
      updateBalance(data.new_balance);
      qc.invalidateQueries({ queryKey: ["markets"] });
      qc.invalidateQueries({ queryKey: ["market"] });
      qc.invalidateQueries({ queryKey: ["positions"] });
    },
  });
}

// ── Order Book (CLOB) ──
export function useOrderBook(marketId: string) {
  return useQuery({
    queryKey: ["orderbook", marketId],
    queryFn: () => orderbookApi.getBook(marketId),
    refetchInterval: 2000,
    enabled: !!marketId,
  });
}

export function usePlaceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orderbookApi.placeOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orderbook"] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      qc.invalidateQueries({ queryKey: ["positions"] });
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orderbookApi.cancelOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orderbook"] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
    },
  });
}

export function useMyOrders(marketId?: string) {
  return useQuery({
    queryKey: ["my-orders", marketId],
    queryFn: () => orderbookApi.getMyOrders({ market_id: marketId, active_only: true }),
    refetchInterval: 5000,
  });
}

// ── User ──
export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: usersApi.me,
    staleTime: 30_000,
  });
}

export function usePositions() {
  return useQuery({
    queryKey: ["positions"],
    queryFn: usersApi.positions,
    staleTime: 15_000,
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: () => usersApi.transactions({ limit: 50 }),
    staleTime: 30_000,
  });
}

export function useLeaderboard(period = "all") {
  return useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () => usersApi.leaderboard(period),
    staleTime: 60_000,
  });
}

export function useDailyBonus() {
  const qc = useQueryClient();
  const updateBalance = useAuthStore((s) => s.updateBalance);
  return useMutation({
    mutationFn: usersApi.dailyBonus,
    onSuccess: (data: { new_balance: number }) => {
      updateBalance(data.new_balance);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useDeposit() {
  const qc = useQueryClient();
  const updateBalance = useAuthStore((s) => s.updateBalance);
  return useMutation({
    mutationFn: (amount: number) => usersApi.deposit(amount),
    onSuccess: (data: { new_balance: number }) => {
      updateBalance(data.new_balance);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
