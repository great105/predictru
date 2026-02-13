import { useState } from "react";
import { useWebApp } from "@/hooks/useWebApp";

interface ShareInviteProps {
  inviteCode: string;
  title: string;
  botUsername?: string;
}

export function ShareInvite({ inviteCode, title, botUsername = "predskazu_bot" }: ShareInviteProps) {
  const { haptic, webApp } = useWebApp();
  const [copied, setCopied] = useState(false);

  // Direct Mini App link — one tap opens the bet join page
  const directLink = `https://t.me/${botUsername}?start=bet_${inviteCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(directLink);
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
      const text = `${title}\n\nПрисоединяйся к спору!`;
      webApp.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(directLink)}&text=${encodeURIComponent(text)}`
      );
    }
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="text-xs text-tg-hint uppercase tracking-wider">Пригласить друзей</div>

      {/* Direct link */}
      <div
        onClick={handleCopy}
        className="bg-white/10 rounded-lg px-4 py-3 text-center text-sm text-tg-link break-all cursor-pointer active:bg-white/20 transition-colors"
      >
        {directLink}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 bg-white/10 hover:bg-white/20 rounded-lg py-3 text-sm font-medium transition-colors"
        >
          {copied ? "Скопировано!" : "Копировать ссылку"}
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
