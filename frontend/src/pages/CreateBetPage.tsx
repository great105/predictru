import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateBet } from "@/hooks/usePrivateBets";
import { useWebApp } from "@/hooks/useWebApp";
import { useAuthStore } from "@/stores/authStore";

const STAKE_PRESETS = [25, 50, 100, 250];

function parseUsernames(input: string): string[] {
  return input
    .split(/[\s,\n]+/)
    .map((u) => u.replace(/^@/, "").trim().toLowerCase())
    .filter((u) => u.length > 0);
}

export function CreateBetPage() {
  const navigate = useNavigate();
  const { haptic, backButton } = useWebApp();
  const rawBalance = useAuthStore((s) => s.user?.balance ?? 0);
  const balance = Number(rawBalance);
  const createBet = useCreateBet();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stake, setStake] = useState(50);
  const [customStake, setCustomStake] = useState("");
  const [outcome, setOutcome] = useState<"yes" | "no">("yes");
  const [hours, setHours] = useState(24);
  const [isClosed, setIsClosed] = useState(false);
  const [usernamesInput, setUsernamesInput] = useState("");
  const [usernames, setUsernames] = useState<string[]>([]);

  useEffect(() => {
    backButton?.show();
    const handler = () => navigate(-1);
    backButton?.onClick(handler);
    return () => {
      backButton?.offClick(handler);
      backButton?.hide();
    };
  }, [backButton, navigate]);

  const effectiveStake = customStake ? Number(customStake) : stake;
  const canSubmit =
    title.trim().length >= 3 &&
    effectiveStake >= 10 &&
    effectiveStake <= 10000 &&
    effectiveStake <= balance &&
    (!isClosed || usernames.length > 0) &&
    !createBet.isPending;

  const handleAddUsernames = () => {
    const parsed = parseUsernames(usernamesInput);
    if (parsed.length === 0) return;
    setUsernames((prev) => {
      const set = new Set(prev);
      parsed.forEach((u) => set.add(u));
      return Array.from(set);
    });
    setUsernamesInput("");
    haptic?.selectionChanged();
  };

  const handleRemoveUsername = (username: string) => {
    setUsernames((prev) => prev.filter((u) => u !== username));
    haptic?.selectionChanged();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    haptic?.impactOccurred("heavy");

    const closesAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    try {
      const bet = await createBet.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        stake_amount: effectiveStake,
        closes_at: closesAt,
        outcome,
        is_closed: isClosed,
        allowed_usernames: isClosed ? usernames : [],
      });
      navigate(`/bet/${bet.id}`, { replace: true });
    } catch {
      haptic?.notificationOccurred("error");
    }
  };

  return (
    <div className="px-4 py-4 space-y-5">
      <h1 className="text-lg font-bold">Создать спор</h1>

      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-xs text-tg-hint uppercase tracking-wider">Вопрос</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Россия выиграет матч?"
          maxLength={500}
          className="w-full bg-white/10 rounded-lg px-4 py-3 text-sm placeholder:text-tg-hint outline-none"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-xs text-tg-hint uppercase tracking-wider">Описание (опц.)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Подробности спора..."
          rows={2}
          className="w-full bg-white/10 rounded-lg px-4 py-3 text-sm placeholder:text-tg-hint outline-none resize-none"
        />
      </div>

      {/* Stake */}
      <div className="space-y-2">
        <label className="text-xs text-tg-hint uppercase tracking-wider">
          Ставка (баланс: {balance.toFixed(0)} PRC)
        </label>
        <div className="flex flex-wrap gap-2">
          {STAKE_PRESETS.map((val) => (
            <button
              key={val}
              onClick={() => {
                setStake(val);
                setCustomStake("");
                haptic?.selectionChanged();
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !customStake && stake === val
                  ? "bg-tg-button text-tg-button-text"
                  : "bg-white/10 text-tg-text"
              }`}
            >
              {val}
            </button>
          ))}
        </div>
        <input
          type="number"
          value={customStake}
          onChange={(e) => setCustomStake(e.target.value)}
          placeholder="Другая сумма (10–10000)"
          min={10}
          max={10000}
          className="w-full bg-white/10 rounded-lg px-4 py-2.5 text-sm placeholder:text-tg-hint outline-none"
        />
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <label className="text-xs text-tg-hint uppercase tracking-wider">Закроется через</label>
        <div className="flex flex-wrap gap-2">
          {[1, 6, 12, 24, 48, 72].map((h) => (
            <button
              key={h}
              onClick={() => {
                setHours(h);
                haptic?.selectionChanged();
              }}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                hours === h
                  ? "bg-tg-button text-tg-button-text"
                  : "bg-white/10 text-tg-text"
              }`}
            >
              {h < 24 ? `${h}ч` : `${h / 24}д`}
            </button>
          ))}
        </div>
      </div>

      {/* Your side */}
      <div className="space-y-2">
        <label className="text-xs text-tg-hint uppercase tracking-wider">Ваша сторона</label>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setOutcome("yes");
              haptic?.selectionChanged();
            }}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
              outcome === "yes"
                ? "bg-green-500/20 border-2 border-green-500 text-green-400"
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
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
              outcome === "no"
                ? "bg-red-500/20 border-2 border-red-500 text-red-400"
                : "bg-white/10 border-2 border-transparent text-tg-hint"
            }`}
          >
            НЕТ
          </button>
        </div>
      </div>

      {/* Closed bet toggle */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => {
            setIsClosed((v) => !v);
            haptic?.selectionChanged();
          }}
          className="flex items-center gap-3 w-full"
        >
          <div
            className={`w-11 h-6 rounded-full transition-colors relative ${
              isClosed ? "bg-tg-button" : "bg-white/20"
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                isClosed ? "translate-x-[22px]" : "translate-x-0.5"
              }`}
            />
          </div>
          <span className="text-sm">Закрытый спор (только для приглашённых)</span>
        </button>

        {isClosed && (
          <div className="space-y-2">
            <label className="text-xs text-tg-hint uppercase tracking-wider">
              Приглашённые (@username)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={usernamesInput}
                onChange={(e) => setUsernamesInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddUsernames();
                  }
                }}
                placeholder="@user1, @user2"
                className="flex-1 bg-white/10 rounded-lg px-4 py-2.5 text-sm placeholder:text-tg-hint outline-none min-w-0"
              />
              <button
                type="button"
                onClick={handleAddUsernames}
                className="bg-white/10 hover:bg-white/20 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors shrink-0"
              >
                +
              </button>
            </div>

            {usernames.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {usernames.map((u) => (
                  <span
                    key={u}
                    className="inline-flex items-center gap-1 bg-white/10 rounded-full px-3 py-1 text-xs"
                  >
                    @{u}
                    <button
                      type="button"
                      onClick={() => handleRemoveUsername(u)}
                      className="text-tg-hint hover:text-red-400 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {isClosed && usernames.length === 0 && (
              <div className="text-xs text-amber-400">
                Добавьте хотя бы одного участника
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {createBet.isError && (
        <div className="text-red-400 text-sm text-center">
          {(createBet.error as any)?.response?.data?.detail ?? "Ошибка создания"}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full bg-tg-button text-tg-button-text py-3.5 rounded-xl text-sm font-bold transition-opacity disabled:opacity-40"
      >
        {createBet.isPending ? "Создаём..." : `Создать спор (-${effectiveStake} PRC)`}
      </button>
    </div>
  );
}
