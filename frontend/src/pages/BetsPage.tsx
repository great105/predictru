import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMyBets } from "@/hooks/usePrivateBets";
import { BetCard } from "@/components/BetCard";
import { useWebApp } from "@/hooks/useWebApp";

export function BetsPage() {
  const { data: bets, isLoading } = useMyBets();
  const { haptic } = useWebApp();
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  const handleJoinByCode = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length >= 4) {
      haptic?.impactOccurred("medium");
      navigate(`/bet/join/${trimmed}`);
    }
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Споры</h1>
        <Link
          to="/bet/create"
          onClick={() => haptic?.impactOccurred("light")}
          className="bg-tg-button text-tg-button-text px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Создать
        </Link>
      </div>

      {/* Join by code */}
      <div className="glass-card p-3 flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Введите код"
          maxLength={8}
          className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm font-mono tracking-wider placeholder:text-tg-hint outline-none"
        />
        <button
          onClick={handleJoinByCode}
          disabled={code.trim().length < 4}
          className="bg-tg-button text-tg-button-text px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
        >
          Войти
        </button>
      </div>

      {/* Bets list */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-4 h-32 shimmer rounded-xl" />
          ))}
        </div>
      )}

      {bets && bets.length > 0 && (
        <div className="space-y-3">
          {bets.map((bet) => (
            <BetCard key={bet.id} bet={bet} />
          ))}
        </div>
      )}

      {!isLoading && bets && bets.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <div className="text-4xl">🤝</div>
          <div className="text-tg-hint text-sm">
            У вас пока нет споров.
            <br />
            Создайте свой или введите код друга!
          </div>
        </div>
      )}
    </div>
  );
}
