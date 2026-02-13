export function formatPRC(value: number | string): string {
  return `${Number(value).toFixed(2)} PRC`;
}

export function formatPercent(value: number | string): string {
  return `${(Number(value) * 100).toFixed(1)}%`;
}

export function formatTimeLeft(closesAt: string): string {
  const now = new Date();
  const end = new Date(closesAt);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return "Закрыт";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}д ${hours}ч`;
  if (hours > 0) return `${hours}ч ${minutes}м`;
  return `${minutes}м`;
}

export function formatNumber(value: number | string): string {
  const n = Number(value);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

const CATEGORY_MAP: Record<string, { icon: string; label: string }> = {
  politics: { icon: "🏛️", label: "Политика" },
  sports: { icon: "⚽", label: "Спорт" },
  crypto: { icon: "₿", label: "Крипто" },
  tech: { icon: "💻", label: "Технологии" },
  entertainment: { icon: "🎬", label: "Развлечения" },
  science: { icon: "🔬", label: "Наука" },
  economics: { icon: "📊", label: "Экономика" },
  general: { icon: "📌", label: "Общее" },
};

export function categoryIcon(category: string): string {
  return CATEGORY_MAP[category]?.icon ?? "📌";
}

export function categoryLabel(category: string): string {
  return CATEGORY_MAP[category]?.label ?? category;
}
