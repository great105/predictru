import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orderbookApi } from "@/api/endpoints";

export function useOrderBook(marketId: string) {
  return useQuery({
    queryKey: ["orderbook", marketId],
    queryFn: async () => {
      const { data } = await orderbookApi.getBook(marketId);
      return data;
    },
    refetchInterval: 2000,
  });
}

export function useOrderBookTrades(marketId: string) {
  return useQuery({
    queryKey: ["orderbook-trades", marketId],
    queryFn: async () => {
      const { data } = await orderbookApi.getTrades(marketId, 20);
      return data;
    },
    refetchInterval: 5000,
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orderbookApi.placeOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orderbook"] });
      queryClient.invalidateQueries({ queryKey: ["orderbook-trades"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["markets"] });
      queryClient.invalidateQueries({ queryKey: ["market"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => orderbookApi.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orderbook"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useMyOrders(marketId?: string) {
  return useQuery({
    queryKey: ["my-orders", marketId],
    queryFn: async () => {
      const { data } = await orderbookApi.getMyOrders({
        market_id: marketId,
        active_only: true,
      });
      return data;
    },
    refetchInterval: 5000,
  });
}

export function useAllMyOrders() {
  return useQuery({
    queryKey: ["my-orders", "all"],
    queryFn: async () => {
      const { data } = await orderbookApi.getMyOrders({ active_only: true });
      return data;
    },
    refetchInterval: 5000,
  });
}
