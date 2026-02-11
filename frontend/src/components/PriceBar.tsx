import { formatPercent } from "@/utils/format";

interface PriceBarProps {
  priceYes: number;
  priceNo: number;
}

export function PriceBar({ priceYes, priceNo }: PriceBarProps) {
  const yesPercent = Math.round(priceYes * 100);

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-yes-dark font-medium">
          ДА {formatPercent(priceYes)}
        </span>
        <span className="text-no-dark font-medium">
          НЕТ {formatPercent(priceNo)}
        </span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden">
        <div
          className="bg-yes transition-all duration-300"
          style={{ width: `${yesPercent}%` }}
        />
        <div
          className="bg-no transition-all duration-300"
          style={{ width: `${100 - yesPercent}%` }}
        />
      </div>
    </div>
  );
}
