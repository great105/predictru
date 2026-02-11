import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tradeApi } from "@/api/endpoints";
import { useAuthStore } from "@/stores/authStore";

export function useBuy() {
  const queryClient = useQueryClient();
  const updateBalance = useAuthStore((s) => s.updateBalance);

  return useMutation({
    mutationFn: tradeApi.buy,
    onSuccess: ({ data }) => {
      updateBalance(data.new_balance);
      queryClient.invalidateQueries({ queryKey: ["markets"] });
      queryClient.invalidateQueries({ queryKey: ["market"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
  });
}

export function useSell() {
  const queryClient = useQueryClient();
  const updateBalance = useAuthStore((s) => s.updateBalance);

  return useMutation({
    mutationFn: tradeApi.sell,
    onSuccess: ({ data }) => {
      updateBalance(data.new_balance);
      queryClient.invalidateQueries({ queryKey: ["markets"] });
      queryClient.invalidateQueries({ queryKey: ["market"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
  });
}
