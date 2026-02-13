import { useWebApp } from "@/hooks/useWebApp";

interface VotingPanelProps {
  yesVotes: number;
  noVotes: number;
  totalParticipants: number;
  myVote: string | null;
  isVoting: boolean;
  onVote: (vote: string) => void;
  isPending: boolean;
}

export function VotingPanel({
  yesVotes,
  noVotes,
  totalParticipants,
  myVote,
  isVoting,
  onVote,
  isPending,
}: VotingPanelProps) {
  const { haptic } = useWebApp();
  const totalVotes = yesVotes + noVotes;

  const handleVote = (vote: string) => {
    haptic?.impactOccurred("medium");
    onVote(vote);
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="text-sm font-medium">
        Голосование за реальный исход
      </div>
      <div className="text-xs text-tg-hint">
        Проголосовало: {totalVotes} из {totalParticipants}
      </div>

      {/* Vote progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-green-400">ДА: {yesVotes}</span>
          <span className="text-red-400">НЕТ: {noVotes}</span>
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden flex">
          {totalVotes > 0 && (
            <>
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${(yesVotes / totalVotes) * 100}%` }}
              />
              <div
                className="h-full bg-red-500 transition-all"
                style={{ width: `${(noVotes / totalVotes) * 100}%` }}
              />
            </>
          )}
        </div>
      </div>

      {/* Vote buttons */}
      {isVoting && !myVote && (
        <div className="flex gap-3">
          <button
            onClick={() => handleVote("yes")}
            disabled={isPending}
            className="flex-1 bg-green-500/20 border border-green-500/40 hover:bg-green-500/30 text-green-400 rounded-lg py-3 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isPending ? "..." : "Было ДА"}
          </button>
          <button
            onClick={() => handleVote("no")}
            disabled={isPending}
            className="flex-1 bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 text-red-400 rounded-lg py-3 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isPending ? "..." : "Было НЕТ"}
          </button>
        </div>
      )}

      {myVote && (
        <div className="text-center text-sm text-tg-hint">
          Вы проголосовали:{" "}
          <span className={myVote === "yes" ? "text-green-400" : "text-red-400"}>
            {myVote === "yes" ? "ДА" : "НЕТ"}
          </span>
        </div>
      )}
    </div>
  );
}
