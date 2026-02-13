import { useState } from "react";
import { useWebApp } from "@/hooks/useWebApp";

interface ShareInviteProps {
  inviteCode: string;
  botUsername?: string;
}

export function ShareInvite({ inviteCode, botUsername = "predskazu_bot" }: ShareInviteProps) {
  const { haptic, webApp } = useWebApp();
  const [copied, setCopied] = useState(false);

  const shareLink = `https://t.me/${botUsername}?start=bet_${inviteCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
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
        `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent("Присоединяйся к спору! Код: " + inviteCode)}`
      );
    }
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="text-xs text-tg-hint uppercase tracking-wider">Инвайт-код</div>

      <div className="flex items-center gap-2">
        <div className="flex-1 bg-white/10 rounded-lg px-4 py-3 text-center font-mono text-xl tracking-[0.3em] font-bold">
          {inviteCode}
        </div>
        <button
          onClick={handleCopy}
          className="shrink-0 bg-white/10 hover:bg-white/20 rounded-lg px-4 py-3 text-sm transition-colors"
        >
          {copied ? "OK" : "Копировать"}
        </button>
      </div>

      <button
        onClick={handleShare}
        className="w-full bg-[#2AABEE] hover:bg-[#229ED9] text-white rounded-lg py-3 text-sm font-medium transition-colors"
      >
        Поделиться в Telegram
      </button>
    </div>
  );
}
