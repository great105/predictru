import { useState } from "react";
import { useWebApp } from "@/hooks/useWebApp";
import { formatPRC } from "@/utils/format";

interface ShareInviteProps {
  inviteCode: string;
  title: string;
  stakeAmount: number;
  totalPool: number;
  yesCount: number;
  noCount: number;
  closesAt: string;
  creatorName: string;
  botUsername?: string;
  isClosed?: boolean;
  allowedUsernames?: string[];
}

export function ShareInvite({
  inviteCode,
  title,
  stakeAmount,
  totalPool,
  yesCount,
  noCount,
  closesAt,
  creatorName,
  botUsername = "predskazu_bot",
  isClosed = false,
  allowedUsernames = [],
}: ShareInviteProps) {
  const { haptic, webApp } = useWebApp();
  const [copied, setCopied] = useState(false);

  const directLink = `https://t.me/${botUsername}?start=bet_${inviteCode}`;
  const total = yesCount + noCount;

  const closesDate = new Date(closesAt);
  const closesStr = closesDate.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const shareText = [
    `\u{1F91D} Спор: "${title}"`,
    "",
    `\u{1F4B0} Ставка: ${formatPRC(stakeAmount)}`,
    `\u{1F3E6} Банк: ${formatPRC(totalPool)}`,
    `\u{1F465} Участников: ${total} (\u{2705} ДА: ${yesCount} / \u{274C} НЕТ: ${noCount})`,
    `\u{23F0} Приём ставок до: ${closesStr}`,
    `\u{1F464} Создал: ${creatorName}`,
    "",
    "Присоединяйся! Выбери сторону и испытай удачу \u{1F525}",
  ].join("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${directLink}`);
      setCopied(true);
      haptic?.notificationOccurred("success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleShare = () => {
    haptic?.impactOccurred("medium");
    if (webApp) {
      webApp.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(directLink)}&text=${encodeURIComponent(shareText)}`
      );
    }
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="text-xs text-tg-hint uppercase tracking-wider">Пригласить друзей</div>

      {/* Share preview */}
      <div className="bg-white/5 rounded-lg p-3 space-y-1 text-xs text-tg-hint">
        <div className="font-medium text-white/90 text-sm">{title}</div>
        <div>Ставка: {formatPRC(stakeAmount)} &middot; Банк: {formatPRC(totalPool)}</div>
        <div>Участников: {total} (ДА: {yesCount} / НЕТ: {noCount})</div>
        <div>До: {closesStr}</div>
      </div>

      {isClosed && allowedUsernames.length > 0 && (
        <div className="bg-amber-500/10 rounded-lg p-3 space-y-1">
          <div className="text-xs text-amber-400 font-medium">Приглашённые участники:</div>
          <div className="flex flex-wrap gap-1.5">
            {allowedUsernames.map((u) => (
              <span key={u} className="text-xs bg-white/10 rounded-full px-2 py-0.5">
                @{u}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 bg-white/10 hover:bg-white/20 rounded-lg py-3 text-sm font-medium transition-colors"
        >
          {copied ? "Скопировано!" : "Копировать"}
        </button>
        <button
          onClick={handleShare}
          className="flex-1 bg-[#2AABEE] hover:bg-[#229ED9] text-white rounded-lg py-3 text-sm font-medium transition-colors"
        >
          Отправить другу
        </button>
      </div>

      {/* Invite code as fallback */}
      <div className="text-center text-xs text-tg-hint">
        или код: <span className="font-mono font-bold tracking-wider">{inviteCode}</span>
      </div>
    </div>
  );
}
