import { useAuthStore } from "@/stores/authStore";
import { useWebApp } from "@/hooks/useWebApp";

export function ReferralCard() {
  const user = useAuthStore((s) => s.user);
  const { webApp } = useWebApp();

  if (!user) return null;

  const referralLink = `https://t.me/${import.meta.env.VITE_BOT_USERNAME || "predictru_bot"}?start=ref_${user.referral_code}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
  };

  const handleShare = () => {
    const text = "Join PredictRu - predict the future and earn PRC tokens!";
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`;
    webApp?.openTelegramLink(shareUrl);
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold mb-2">Invite Friends</h3>
      <p className="text-xs text-tg-hint mb-3">
        Get 100 PRC for each friend who joins. They get 50 PRC too!
      </p>

      <div className="flex items-center gap-2 mb-3">
        <code className="flex-1 bg-tg-secondary rounded px-3 py-2 text-xs font-mono truncate">
          {referralLink}
        </code>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 py-2 bg-tg-secondary rounded-lg text-sm font-medium"
        >
          Copy Link
        </button>
        <button
          onClick={handleShare}
          className="flex-1 py-2 bg-tg-button text-tg-button-text rounded-lg text-sm font-medium"
        >
          Share
        </button>
      </div>

      <div className="text-xs text-tg-hint mt-2 text-center">
        {user.referral_count} friends invited
      </div>
    </div>
  );
}
