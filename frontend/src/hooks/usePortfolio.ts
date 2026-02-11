import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/api/endpoints";

export function usePositions() {
  return useQuery({
    queryKey: ["positions"],
    queryFn: async () => {
      const { data } = await usersApi.positions();
      return data;
    },
  });
}

export function useTransactions(limit: number = 20) {
  return useQuery({
    queryKey: ["transactions", limit],
    queryFn: async () => {
      const { data } = await usersApi.transactions({ limit });
      return data;
    },
  });
}
