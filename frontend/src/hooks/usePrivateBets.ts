import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { betsApi, usersApi } from "@/api/endpoints";
import { useAuthStore } from "@/stores/authStore";

function refreshBalance(updateBalance: (b: number) => void) {
  usersApi.me().then(({ data }) => updateBalance(data.balance));
}

export function useMyBets() {
  return useQuery({
    queryKey: ["private-bets", "my"],
    queryFn: async () => {
      const { data } = await betsApi.my();
      return data;
    },
  });
}

export function useBetDetail(id: string) {
  return useQuery({
    queryKey: ["private-bet", id],
    queryFn: async () => {
      const { data } = await betsApi.get(id);
      return data;
    },
    enabled: !!id,
  });
}

export function useBetLookup(code: string) {
  return useQuery({
    queryKey: ["bet-lookup", code],
    queryFn: async () => {
      const { data } = await betsApi.lookup(code);
      return data;
    },
    enabled: code.length >= 4,
    retry: false,
  });
}

export function useCreateBet() {
  const qc = useQueryClient();
  const updateBalance = useAuthStore((s) => s.updateBalance);

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      stake_amount: number;
      closes_at: string;
      outcome: string;
      is_closed?: boolean;
      allowed_usernames?: string[];
    }) => {
      const { data: bet } = await betsApi.create(data);
      return bet;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["private-bets"] });
      refreshBalance(updateBalance);
    },
  });
}

export function useJoinBet() {
  const qc = useQueryClient();
  const updateBalance = useAuthStore((s) => s.updateBalance);

  return useMutation({
    mutationFn: async (data: { invite_code: string; outcome: string }) => {
      const { data: bet } = await betsApi.join(data);
      return bet;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["private-bets"] });
      refreshBalance(updateBalance);
    },
  });
}

export function useStartVoting(betId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await betsApi.startVoting(betId);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["private-bet", betId] });
      qc.invalidateQueries({ queryKey: ["private-bets"] });
    },
  });
}

export function useCastVote(betId: string) {
  const qc = useQueryClient();
  const updateBalance = useAuthStore((s) => s.updateBalance);

  return useMutation({
    mutationFn: async (vote: string) => {
      const { data } = await betsApi.vote(betId, { vote });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["private-bet", betId] });
      qc.invalidateQueries({ queryKey: ["private-bets"] });
      refreshBalance(updateBalance);
    },
  });
}
