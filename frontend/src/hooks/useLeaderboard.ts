import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/api/endpoints";

export function useLeaderboard(period: string = "all") {
  return useQuery({
    queryKey: ["leaderboard", period],
    queryFn: async () => {
      const { data } = await usersApi.leaderboard(period);
      return data;
    },
    staleTime: 60_000,
  });
}
