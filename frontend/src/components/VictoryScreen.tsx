import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fireConfetti } from "@/utils/confetti";
import { formatPRC } from "@/utils/format";
import { useWebApp } from "@/hooks/useWebApp";

interface VictoryScreenProps {
  profit: number;
  marketTitle: string;
  onClose: () => void;
}

export function VictoryScreen({ profit, marketTitle, onClose }: VictoryScreenProps) {
  const [visible, setVisible] = useState(true);
  const { haptic } = useWebApp();

  useEffect(() => {
    fireConfetti();
    haptic?.notificationOccurred("success");
    const timer = setTimeout(() => fireConfetti(), 600);
    return () => clearTimeout(timer);
  }, [haptic]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleShare = () => {
    const text = `Угадал на Предскажи! Заработал ${formatPRC(profit)} на вопросе "${marketTitle}"`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
    }
    haptic?.notificationOccurred("success");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: "rgba(10, 14, 26, 0.95)" }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="text-center p-8 max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">Ты угадал!</h2>
            <p className="text-tg-hint text-sm mb-4 line-clamp-2">{marketTitle}</p>
            <div className="text-4xl font-bold text-green-400 mb-6">
              +{formatPRC(profit)}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleShare}
                className="flex-1 py-3 rounded-xl font-semibold text-sm bg-tg-button text-tg-button-text"
              >
                Поделиться
              </button>
              <button
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl font-semibold text-sm bg-white/10 text-tg-text"
              >
                Закрыть
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
