import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBetLookup, useJoinBet } from "@/hooks/usePrivateBets";
import { useWebApp } from "@/hooks/useWebApp";
import { useAuthStore } from "@/stores/authStore";
import { formatPRC, formatTimeLeft } from "@/utils/format";

export function BetJoinPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { haptic, backButton } = useWebApp();
  const rawBalance = useAuthStore((s) => s.user?.balance ?? 0);
  const balance = Number(rawBalance);
  const { data: bet, isLoading, isError } = useBetLookup(code ?? "");
  const joinBet = useJoinBet();
  const [outcome, setOutcome] = useState<"yes" | "no">("yes");

  useEffect(() => {
    backButton?.show();
    const handler = () => navigate(-1);
    backButton?.onClick(handler);
    return () => {
      backButton?.offClick(handler);
      backButton?.hide();
    };
  }, [backButton, navigate]);

  if (isLoading) {
    return (
      <div className="px-4 py-4 space-y-4">
        <div className="glass-card p-6 h-40 shimmer rounded-xl" />
      </div>
    );
  }

  if (isError || !bet) {
    return (
      <div className="px-4 py-12 text-center space-y-3">
        <div className="text-4xl">🔍</div>
        <div className="text-tg-hint text-sm">
          Спор с кодом <span className="font-mono font-bold">{code}</span> не найден
        </div>
        <button
          onClick={() => navigate("/bets")}
          className="bg-white/10 px-6 py-2 rounded-lg text-sm"
        >
          К спорам
        </button>
      </div>
    );
  }

  if (bet.status !== "open") {
    return (
      <div className="px-4 py-12 text-center space-y-3">
        <div className="text-4xl">🔒</div>
        <div className="text-tg-hint text-sm">
          Этот спор уже закрыт для новых участников
        </div>
        <button
          onClick={() => navigate("/bets")}
          className="bg-white/10 px-6 py-2 rounded-lg text-sm"
        >
          К спорам
        </button>
      </div>
    );
  }

  const canJoin = balance >= bet.stake_amount && !joinBet.isPending;
  const total = bet.yes_count + bet.no_count;

  const handleJoin = async () => {
    if (!canJoin) return;
    haptic?.impactOccurred("heavy");
    try {
      const result = await joinBet.mutateAsync({
        invite_code: bet.invite_code,
        outcome,
      });
      navigate(`/bet/${result.id}`, { replace: true });
    } catch {
      haptic?.notificationOccurred("error");
    }
  };

  return (
    <div className="px-4 py-4 space-y-5">
      <h1 className="text-lg font-bold">Присоединиться к спору</h1>

      {/* Bet info */}
      <div className="glass-card p-4 space-y-3">
        <h2 className="text-base font-medium">{bet.title}</h2>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-xs text-tg-hint">Ставка</div>
            <div className="text-sm font-bold">{formatPRC(bet.stake_amount)}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-xs text-tg-hint">Участники</div>
            <div className="text-sm font-bold">{total}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-xs text-tg-hint">Банк</div>
            <div className="text-sm font-bold">{formatPRC(bet.total_pool)}</div>
          </div>
        </div>

        <div className="text-center text-xs text-tg-hint">
          от {bet.creator_name} &middot; {formatTimeLeft(bet.closes_at)}
        </div>

        {/* Sides */}
        <div className="flex justify-between text-xs text-tg-hint">
          <span>
            ДА: <span className="text-green-400">{bet.yes_count}</span>
          </span>
          <span>
            НЕТ: <span className="text-red-400">{bet.no_count}</span>
          </span>
        </div>
      </div>

      {/* Choose side */}
      <div className="space-y-2">
        <label className="text-xs text-tg-hint uppercase tracking-wider">Выберите сторону</label>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setOutcome("yes");
              haptic?.selectionChanged();
            }}
            className={`flex-1 py-4 rounded-xl text-sm font-bold transition-all ${
              outcome === "yes"
                ? "bg-green-500/20 border-2 border-green-500 text-green-400 scale-[1.02]"
                : "bg-white/10 border-2 border-transparent text-tg-hint"
            }`}
          >
            ДА
          </button>
          <button
            onClick={() => {
              setOutcome("no");
              haptic?.selectionChanged();
            }}
            className={`flex-1 py-4 rounded-xl text-sm font-bold transition-all ${
              outcome === "no"
                ? "bg-red-500/20 border-2 border-red-500 text-red-400 scale-[1.02]"
                : "bg-white/10 border-2 border-transparent text-tg-hint"
            }`}
          >
            НЕТ
          </button>
        </div>
      </div>

      {/* Error */}
      {joinBet.isError && (
        <div className="text-red-400 text-sm text-center">
          {(joinBet.error as any)?.response?.data?.detail ?? "Ошибка"}
        </div>
      )}

      {/* Join button */}
      {balance < bet.stake_amount && (
        <div className="text-center text-red-400 text-xs">
          Недостаточно средств (нужно {formatPRC(bet.stake_amount)}, у вас{" "}
          {formatPRC(balance)})
        </div>
      )}

      <button
        onClick={handleJoin}
        disabled={!canJoin}
        className="w-full bg-tg-button text-tg-button-text py-3.5 rounded-xl text-sm font-bold transition-opacity disabled:opacity-40"
      >
        {joinBet.isPending
          ? "Присоединяемся..."
          : `Присоединиться (-${bet.stake_amount} PRC)`}
      </button>
    </div>
  );
}
