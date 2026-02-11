import { categoryIcon } from "@/utils/format";

const CATEGORIES = [
  { key: "all", label: "Все" },
  { key: "politics", label: "Полит." },
  { key: "sports", label: "Спорт" },
  { key: "crypto", label: "Крипто" },
  { key: "tech", label: "Тех" },
  { key: "entertainment", label: "Шоу" },
  { key: "science", label: "Наука" },
  { key: "economics", label: "Эконом." },
  { key: "general", label: "Общее" },
];

interface CategoryFilterProps {
  selected: string;
  onSelect: (category: string) => void;
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2">
      {CATEGORIES.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
            selected === key
              ? "bg-tg-button text-tg-button-text"
              : "bg-tg-secondary text-tg-text"
          }`}
        >
          {key === "all" ? label : `${categoryIcon(key)} ${label}`}
        </button>
      ))}
    </div>
  );
}
