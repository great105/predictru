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
  politics: { icon: "\u{1F3DB}\uFE0F", label: "\u041F\u043E\u043B\u0438\u0442\u0438\u043A\u0430" },
  sports: { icon: "\u26BD", label: "\u0421\u043F\u043E\u0440\u0442" },
  crypto: { icon: "\u20BF", label: "\u041A\u0440\u0438\u043F\u0442\u043E" },
  tech: { icon: "\u{1F4BB}", label: "\u0422\u0435\u0445\u043D\u043E\u043B\u043E\u0433\u0438\u0438" },
  entertainment: { icon: "\u{1F3AC}", label: "\u0420\u0430\u0437\u0432\u043B\u0435\u0447\u0435\u043D\u0438\u044F" },
  science: { icon: "\u{1F52C}", label: "\u041D\u0430\u0443\u043A\u0430" },
  economics: { icon: "\u{1F4CA}", label: "\u042D\u043A\u043E\u043D\u043E\u043C\u0438\u043A\u0430" },
  general: { icon: "\u{1F4CC}", label: "\u041E\u0431\u0449\u0435\u0435" },
};

export function categoryIcon(category: string): string {
  return CATEGORY_MAP[category]?.icon ?? "\u{1F4CC}";
}

export function categoryLabel(category: string): string {
  return CATEGORY_MAP[category]?.label ?? category;
}
