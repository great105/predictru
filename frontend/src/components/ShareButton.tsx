import { useWebApp } from "@/hooks/useWebApp";

interface ShareButtonProps {
  text: string;
  url: string;
}

export function ShareButton({ text, url }: ShareButtonProps) {
  const { webApp } = useWebApp();

  const handleShare = () => {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    webApp?.openTelegramLink(shareUrl);
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2 bg-tg-button text-tg-button-text rounded-lg text-sm font-medium"
    >
      Share
    </button>
  );
}
