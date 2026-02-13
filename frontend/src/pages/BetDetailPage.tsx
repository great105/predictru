import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBetDetail, useCastVote, useStartVoting } from "@/hooks/usePrivateBets";
import { ShareInvite } from "@/components/ShareInvite";
import { VotingPanel } from "@/components/VotingPanel";
import { useWebApp } from "@/hooks/useWebApp";
import { formatPRC, formatTimeLeft } from "@/utils/format";

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  open: { text: "Открыт", color: "text-green-400" },
  voting: { text: "Голосование", color: "text-amber-400" },
  resolved: { text: "Завершён", color: "text-blue-400" },
  cancelled: { text: "Отменён", color: "text-tg-hint" },
};

export function BetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { backButton, haptic } = useWebApp();
  const { data: bet, isLoading, isError } = useBetDetail(id ?? "");
  const vote = useCastVote(id ?? "");
  const startVoting = useStartVoting(id ?? "");
  const [startVotingError, setStartVotingError] = useState<string | null>(null);

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
        <div className="glass-card p-6 h-24 shimmer rounded-xl" />
      </div>
    );
  }

  if (isError || !bet) {
    return (
      <div className="px-4 py-12 text-center text-tg-hint">
        Спор не найден или вы не участник
      </div>
    );
  }

  const statusInfo = STATUS_MAP[bet.status] ?? STATUS_MAP.open;
  const total = bet.yes_count + bet.no_count;

  return (
    <div className="px-4 py-4 space-y-4 pb-8">
      {/* Title & status */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-base font-bold leading-tight flex-1">{bet.title}</h1>
          <span className={`text-xs font-medium shrink-0 ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
        </div>

        {bet.description && (
          <p className="text-xs text-tg-hint">{bet.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-xs text-tg-hint">Ставка</div>
            <div className="text-sm font-bold">{formatPRC(bet.stake_amount)}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-xs text-tg-hint">Банк</div>
            <div className="text-sm font-bold">{formatPRC(bet.total_pool)}</div>
          </div>
        </div>

        {/* Your side */}
        {bet.my_outcome && (
          <div className="text-center text-xs text-tg-hint">
            Ваша сторона:{" "}
            <span className={bet.my_outcome === "yes" ? "text-green-400 font-medium" : "text-red-400 font-medium"}>
              {bet.my_outcome === "yes" ? "ДА" : "НЕТ"}
            </span>
          </div>
        )}
      </div>

      {/* Participants */}
      <div className="glass-card p-4 space-y-3">
        <div className="text-sm font-medium">
          Участники ({total})
        </div>

        {/* YES/NO bar */}
        <div className="h-3 rounded-full bg-white/10 overflow-hidden flex">
          {total > 0 && (
            <>
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${(bet.yes_count / total) * 100}%` }}
              />
              <div
                className="h-full bg-red-500 transition-all"
                style={{ width: `${(bet.no_count / total) * 100}%` }}
              />
            </>
          )}
        </div>
        <div className="flex justify-between text-xs text-tg-hint">
          <span>ДА: {bet.yes_count}</span>
          <span>НЕТ: {bet.no_count}</span>
        </div>

        <div className="space-y-1.5">
          {bet.participants.map((p) => (
            <div
              key={p.user_id}
              className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm truncate">
                  {p.first_name}
                  {p.username && (
                    <span className="text-tg-hint text-xs ml-1">@{p.username}</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-xs font-medium ${
                    p.outcome === "yes" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {p.outcome === "yes" ? "ДА" : "НЕТ"}
                </span>
                {Number(p.payout) > 0 && (
                  <span className="text-xs text-amber-400">+{formatPRC(p.payout)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Voting panel (only in voting phase) */}
      {bet.status === "voting" && (
        <VotingPanel
          yesVotes={bet.yes_votes}
          noVotes={bet.no_votes}
          totalParticipants={total}
          myVote={bet.my_vote}
          isVoting={true}
          onVote={(v) => vote.mutate(v)}
          isPending={vote.isPending}
        />
      )}

      {/* Resolution result */}
      {bet.status === "resolved" && bet.resolution_outcome && (
        <div className="glass-card p-4 text-center space-y-2">
          <div className="text-sm font-medium">Результат</div>
          <div
            className={`text-2xl font-bold ${
              bet.resolution_outcome === "yes" ? "text-green-400" : "text-red-400"
            }`}
          >
            {bet.resolution_outcome === "yes" ? "ДА" : "НЕТ"}
          </div>
          {bet.my_outcome === bet.resolution_outcome ? (
            <div className="text-green-400 text-sm">Вы выиграли!</div>
          ) : (
            <div className="text-red-400 text-sm">Вы проиграли</div>
          )}
        </div>
      )}

      {bet.status === "cancelled" && (
        <div className="glass-card p-4 text-center space-y-2">
          <div className="text-sm font-medium text-tg-hint">Спор отменён</div>
          <div className="text-xs text-tg-hint">Ставки возвращены</div>
        </div>
      )}

      {/* Start voting (creator only, when open and both sides have participants) */}
      {bet.status === "open" && bet.is_creator && (
        <div className="glass-card p-4 space-y-3">
          <div className="text-sm font-medium">Управление спором</div>
          {bet.yes_count > 0 && bet.no_count > 0 ? (
            <>
              <button
                onClick={async () => {
                  setStartVotingError(null);
                  haptic?.impactOccurred("heavy");
                  try {
                    await startVoting.mutateAsync();
                    haptic?.notificationOccurred("success");
                  } catch (e: any) {
                    setStartVotingError(
                      e?.response?.data?.detail ?? "Ошибка"
                    );
                    haptic?.notificationOccurred("error");
                  }
                }}
                disabled={startVoting.isPending}
                className="w-full bg-amber-500/20 border border-amber-500/50 text-amber-400 py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-40"
              >
                {startVoting.isPending
                  ? "Запускаем..."
                  : "Начать голосование"}
              </button>
              <div className="text-xs text-tg-hint text-center">
                Все участники получат уведомление
              </div>
            </>
          ) : (
            <div className="text-xs text-tg-hint text-center">
              Для начала голосования нужен хотя бы один участник на каждой стороне
              (ДА: {bet.yes_count}, НЕТ: {bet.no_count})
            </div>
          )}
          {startVotingError && (
            <div className="text-red-400 text-sm text-center">{startVotingError}</div>
          )}
        </div>
      )}

      {/* Share (only when open) */}
      {bet.status === "open" && (
        <ShareInvite
          inviteCode={bet.invite_code}
          title={bet.title}
          stakeAmount={bet.stake_amount}
          totalPool={bet.total_pool}
          yesCount={bet.yes_count}
          noCount={bet.no_count}
          closesAt={bet.closes_at}
          creatorName={bet.creator_name}
        />
      )}

      {/* Timing */}
      <div className="text-center text-xs text-tg-hint space-y-1">
        {bet.status === "open" && (
          <div>Приём ставок: {formatTimeLeft(bet.closes_at)}</div>
        )}
        {bet.status === "voting" && (
          <div>Голосование до: {formatTimeLeft(bet.voting_deadline)}</div>
        )}
      </div>
    </div>
  );
}
