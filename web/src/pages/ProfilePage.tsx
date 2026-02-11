import { useState } from "react";
import { motion } from "framer-motion";
import { useProfile, useTransactions, useDailyBonus, useDeposit } from "../hooks";
import { useAuthStore } from "../store";

const TX_LABELS: Record<string, { label: string; color: string }> = {
  buy: { label: "Покупка", color: "text-brand" },
  sell: { label: "Продажа", color: "text-amber" },
  payout: { label: "Выплата", color: "text-yes" },
  bonus: { label: "Бонус", color: "text-yes" },
  referral: { label: "Реферал", color: "text-purple-400" },
  daily: { label: "Ежедневный", color: "text-yes" },
  fee: { label: "Комиссия", color: "text-no" },
  deposit: { label: "Пополнение", color: "text-yes" },
  order_fill: { label: "Сделка", color: "text-brand" },
  order_cancel: { label: "Отмена", color: "text-txt-muted" },
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
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl lg:text-4xl font-display font-extrabold tracking-tight">Профиль</h1>
      </motion.div>

      {/* Two-column layout on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — user info + actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* User card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-2xl font-bold text-base-950 font-display">
                {user?.first_name?.[0] ?? "?"}
              </div>
              <div>
                <h2 className="text-lg font-display font-bold">{p?.first_name} {p?.last_name ?? ""}</h2>
                {p?.username && <p className="text-sm text-txt-muted">@{p.username}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Баланс", value: `${Number(p?.balance ?? 0).toLocaleString("ru-RU")}`, color: "text-brand" },
                { label: "Прибыль", value: `${Number(p?.total_profit ?? 0) >= 0 ? "+" : ""}${Number(p?.total_profit ?? 0).toLocaleString("ru-RU")}`, color: Number(p?.total_profit ?? 0) >= 0 ? "text-yes" : "text-no" },
                { label: "Сделки", value: String(p?.total_trades ?? 0), color: "text-txt" },
                { label: "Winrate", value: `${((p?.win_rate ?? 0) * 100).toFixed(0)}%`, color: "text-amber" },
              ].map((stat) => (
                <div key={stat.label} className="bg-base-800 rounded-lg p-3 text-center border border-line">
                  <p className="text-[10px] text-txt-muted uppercase tracking-wider font-medium mb-1">{stat.label}</p>
                  <p className={`text-lg font-bold font-mono ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Daily bonus */}
          <div className="card p-5">
            <h3 className="text-sm font-display font-semibold mb-3">Ежедневный бонус</h3>
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
          <div className="card p-5">
            <h3 className="text-sm font-display font-semibold mb-3">Пополнить баланс</h3>
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

          {/* Referral */}
          {p?.referral_code && (
            <div className="card p-5">
              <h3 className="text-sm font-display font-semibold mb-1">Реферальная программа</h3>
              <p className="text-xs text-txt-muted mb-3">
                Приглашайте друзей и получайте 100 PRC за каждого
              </p>
              <div className="flex gap-2">
                <div className="input-field font-mono text-sm flex-1 flex items-center text-txt-secondary">
                  {p.referral_code}
                </div>
                <button onClick={copyReferral} className="btn-secondary whitespace-nowrap">
                  {copied ? "Скопировано!" : "Копировать"}
                </button>
              </div>
              {p.referral_count > 0 && (
                <p className="text-xs text-txt-muted mt-2">
                  Приглашено: <span className="text-txt font-mono">{p.referral_count}</span>
                </p>
              )}
            </div>
          )}

          {/* Logout (mobile) */}
          <div className="lg:hidden">
            <button onClick={logout} className="w-full py-3 text-sm text-no hover:text-no-light transition-colors font-medium">
              Выйти из аккаунта
            </button>
          </div>
        </div>

        {/* Right column — transactions */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card p-6"
          >
            <h3 className="text-base font-display font-semibold mb-5">История транзакций</h3>
            {!txData?.items?.length ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-base-700 flex items-center justify-center">
                  <svg className="w-6 h-6 text-txt-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                </div>
                <p className="text-txt-muted text-sm">Нет транзакций</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-txt-muted text-[10px] uppercase tracking-wider">
                      <th className="text-left pb-3 font-medium">Тип</th>
                      <th className="text-left pb-3 font-medium">Описание</th>
                      <th className="text-right pb-3 font-medium">Сумма</th>
                      <th className="text-right pb-3 font-medium">Дата</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {txData.items.map((tx) => {
                      const info = TX_LABELS[tx.type] ?? { label: tx.type, color: "text-txt-muted" };
                      return (
                        <tr key={tx.id} className="hover:bg-base-800/50 transition-colors">
                          <td className="py-3 pr-4">
                            <span className={`text-xs font-semibold ${info.color}`}>{info.label}</span>
                          </td>
                          <td className="py-3 pr-4 text-txt-secondary text-xs max-w-[300px] truncate">
                            {tx.description || "—"}
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <span className={`font-mono font-semibold text-xs ${tx.amount >= 0 ? "text-yes" : "text-no"}`}>
                              {tx.amount >= 0 ? "+" : ""}{tx.amount.toFixed(2)} PRC
                            </span>
                          </td>
                          <td className="py-3 text-right text-txt-muted text-xs font-mono">
                            {new Date(tx.created_at).toLocaleDateString("ru-RU")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
