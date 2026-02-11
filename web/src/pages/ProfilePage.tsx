import { useState } from "react";
import { motion } from "framer-motion";
import { useProfile, useTransactions, useDailyBonus, useDeposit } from "../hooks";
import { useAuthStore } from "../store";

const TX_LABELS: Record<string, { label: string; color: string }> = {
  buy: { label: "Покупка", color: "text-accent" },
  sell: { label: "Продажа", color: "text-gold" },
  payout: { label: "Выплата", color: "text-yes" },
  bonus: { label: "Бонус", color: "text-yes" },
  referral: { label: "Реферал", color: "text-purple-400" },
  daily: { label: "Ежедневный", color: "text-yes" },
  fee: { label: "Комиссия", color: "text-no" },
  deposit: { label: "Пополнение", color: "text-yes" },
  order_fill: { label: "Сделка", color: "text-accent" },
  order_cancel: { label: "Отмена", color: "text-muted" },
};

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const { data: profile } = useProfile();
  const { data: txData } = useTransactions();
  const dailyBonus = useDailyBonus();
  const deposit = useDeposit();
  const [depositAmount, setDepositAmount] = useState("");
  const [copied, setCopied] = useState(false);

  const p = profile;

  const copyReferral = () => {
    if (p?.referral_code) {
      navigator.clipboard.writeText(p.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDeposit = () => {
    const amt = parseFloat(depositAmount);
    if (amt > 0) {
      deposit.mutate(amt, { onSuccess: () => setDepositAmount("") });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Профиль</h1>

      {/* User card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-2xl font-bold">
            {user?.first_name?.[0] ?? "?"}
          </div>
          <div>
            <h2 className="text-lg font-bold">{p?.first_name} {p?.last_name ?? ""}</h2>
            {p?.username && <p className="text-sm text-muted">@{p.username}</p>}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Баланс", value: `${Number(p?.balance ?? 0).toLocaleString("ru-RU")} PRC`, color: "text-accent" },
            { label: "Прибыль", value: `${Number(p?.total_profit ?? 0) >= 0 ? "+" : ""}${Number(p?.total_profit ?? 0).toLocaleString("ru-RU")}`, color: Number(p?.total_profit ?? 0) >= 0 ? "text-yes" : "text-no" },
            { label: "Сделки", value: p?.total_trades ?? 0, color: "text-white" },
            { label: "Winrate", value: `${((p?.win_rate ?? 0) * 100).toFixed(0)}%`, color: "text-gold" },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface-2 rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted mb-1">{stat.label}</p>
              <p className={`text-lg font-bold font-mono ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Actions row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily bonus */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-3">Ежедневный бонус</h3>
          <button
            onClick={() => dailyBonus.mutate()}
            disabled={dailyBonus.isPending}
            className="w-full btn-primary"
          >
            {dailyBonus.isPending ? "Получаем..." : "Получить 50 PRC"}
          </button>
          {dailyBonus.isError && (
            <p className="text-no text-xs mt-2">Бонус уже получен сегодня</p>
          )}
          {dailyBonus.isSuccess && (
            <p className="text-yes text-xs mt-2">+50 PRC начислено!</p>
          )}
        </div>

        {/* Deposit */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-3">Пополнить баланс</h3>
          <div className="flex gap-2">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Сумма PRC"
              className="input-field font-mono text-sm flex-1"
              min={1}
              max={10000}
            />
            <button
              onClick={handleDeposit}
              disabled={deposit.isPending || !depositAmount}
              className="btn-primary whitespace-nowrap"
            >
              {deposit.isPending ? "..." : "Внести"}
            </button>
          </div>
        </div>
      </div>

      {/* Referral */}
      {p?.referral_code && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-1">Реферальная программа</h3>
          <p className="text-xs text-muted mb-3">
            Приглашайте друзей и получайте 100 PRC за каждого
          </p>
          <div className="flex gap-2">
            <div className="input-field font-mono text-sm flex-1 flex items-center">
              {p.referral_code}
            </div>
            <button onClick={copyReferral} className="btn-ghost border border-border">
              {copied ? "Скопировано!" : "Копировать"}
            </button>
          </div>
          {p.referral_count > 0 && (
            <p className="text-xs text-muted mt-2">
              Приглашено: <span className="text-white font-mono">{p.referral_count}</span>
            </p>
          )}
        </div>
      )}

      {/* Transaction history */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold mb-4">История транзакций</h3>
        {!txData?.items?.length ? (
          <p className="text-muted text-xs text-center py-6">Нет транзакций</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {txData.items.map((tx) => {
              const info = TX_LABELS[tx.type] ?? { label: tx.type, color: "text-muted" };
              return (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <span className={`text-xs font-medium ${info.color}`}>{info.label}</span>
                    {tx.description && (
                      <p className="text-[10px] text-muted mt-0.5 max-w-[200px] truncate">{tx.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-mono font-medium ${tx.amount >= 0 ? "text-yes" : "text-no"}`}>
                      {tx.amount >= 0 ? "+" : ""}{tx.amount.toFixed(2)} PRC
                    </p>
                    <p className="text-[9px] text-muted">
                      {new Date(tx.created_at).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Logout (mobile) */}
      <div className="lg:hidden">
        <button onClick={logout} className="w-full py-3 text-sm text-no hover:text-no-light transition-colors">
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}
