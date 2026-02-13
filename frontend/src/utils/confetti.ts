import confetti from "canvas-confetti";

export function fireConfetti() {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.7 },
    colors: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"],
    disableForReducedMotion: true,
  });
}
