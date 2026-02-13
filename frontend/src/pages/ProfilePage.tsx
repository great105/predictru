import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { usersApi } from "@/api/endpoints";
import { Skeleton } from "@/components/Skeleton";
import { formatPRC, formatPercent } from "@/utils/format";

const TX_TYPE_LABELS: Record<string, string> = {
  buy: "Ставка",
  sell: "Продажа",
  payout: "Выплата",
  bonus: "Бонус",
  referral: "Реферал",
  daily: "Ежедневный бонус",
  fee: "Комиссия",
  deposit: "Пополнение",
  withdraw: "Вывод",
  order_fill: "Сделка",
  order_cancel: "Отмена",
};

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateBalance = useAuthStore((s) => s.updateBalance);
  const [depositAmount, setDepositAmount] = useState("");
  const [showDeposit, setShowDeposit] = useState(false);
  const queryClient = useQueryClient();

  const depositMutation = useMutation({
    mutationFn: (amount: number) => usersApi.deposit(amount),
    onSuccess: (res) => {
      updateBalance(res.data.new_balance);
      setDepositAmount("");
      setShowDeposit(false);
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data } = await usersApi.transactions({ limit: 20 });
      return data.items;
    },
  });

  if (!user) return null;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center text-2xl font-bold text-primary-500">
          {user.first_name[0]}
        </div>
        <div>
          <h2 className="text-lg font-bold">{user.first_name}</h2>
          {user.username && (
            <div className="text-sm text-tg-hint">@{user.username}</div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-3">
          <div className="text-xs text-tg-hint">На счету</div>
          <div className="text-lg font-bold">{formatPRC(user.balance)}</div>
          <button
            onClick={() => setShowDeposit(!showDeposit)}
            className="mt-2 w-full py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium"
          >
            Добавить 🪙
          </button>
          {showDeposit && (
            <div className="mt-2 flex gap-2">
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Сумма"
                className="flex-1 bg-tg-secondary rounded px-2 py-1.5 text-sm outline-none"
              />
              <button
                onClick={() => {
                  const amt = parseFloat(depositAmount);
                  if (amt > 0) depositMutation.mutate(amt);
                }}
                disabled={depositMutation.isPending}
                className="px-3 py-1.5 bg-yes text-white rounded text-xs font-medium"
              >
                OK
              </button>
            </div>
          )}
        </div>
        <div className="glass-card p-3">
          <div className="text-xs text-tg-hint">Заработок</div>
          <div
            className={`text-lg font-bold ${
              (user.total_profit ?? 0) >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {(user.total_profit ?? 0) >= 0 ? "+" : ""}
            {formatPRC(user.total_profit ?? 0)}
          </div>
        </div>
        <div className="glass-card p-3">
          <div className="text-xs text-tg-hint">Прогнозов</div>
          <div className="text-lg font-bold">{user.total_trades ?? 0}</div>
        </div>
        <div className="glass-card p-3">
          <div className="text-xs text-tg-hint">Угадано</div>
          <div className="text-lg font-bold">
            {formatPercent((user.win_rate ?? 0) / 100)}
          </div>
        </div>
      </div>

      {/* Referral */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold mb-2">Пригласи друга</h3>
        <div className="flex items-center gap-2">
          <code className="flex-1 min-w-0 truncate bg-tg-secondary rounded px-3 py-2 text-sm font-mono">
            {user.referral_code}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(user.referral_code)}
            className="px-3 py-2 bg-tg-button text-tg-button-text rounded text-sm"
          >
            Скопировать
          </button>
        </div>
        <div className="text-xs text-tg-hint mt-2">
          Приглашённых: {user.referral_count} · За каждого друга — 🪙 100 PRC
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <h3 className="text-sm font-semibold mb-3">История</h3>
        <div className="space-y-2">
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}

          {transactions?.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between glass-card p-3"
            >
              <div>
                <div className="text-sm font-medium">{TX_TYPE_LABELS[tx.type] ?? tx.type}</div>
                <div className="text-xs text-tg-hint">
                  {new Date(tx.created_at).toLocaleDateString("ru")}
                </div>
              </div>
              <span
                className={`text-sm font-semibold ${
                  tx.amount >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {tx.amount >= 0 ? "+" : ""}
                {formatPRC(tx.amount)}
              </span>
            </div>
          ))}

          {!isLoading && (!transactions || transactions.length === 0) && (
            <div className="text-center text-tg-hint py-8">
              Пока пусто
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
