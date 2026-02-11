import { usePriceHistory } from "../hooks";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function PriceChart({ marketId }: { marketId: string }) {
  const { data: history, isLoading } = usePriceHistory(marketId);

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-5 h-64 flex items-center justify-center">
        <div className="animate-pulse text-muted text-sm">Загрузка графика...</div>
      </div>
    );
  }

  if (!history || history.length < 2) {
    return (
      <div className="glass rounded-2xl p-5 h-64 flex items-center justify-center">
        <p className="text-muted text-sm">Недостаточно данных для графика</p>
      </div>
    );
  }

  const chartData = history.map((p) => ({
    time: new Date(p.created_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }),
    yes: Math.round(p.price_yes * 100),
    no: Math.round(p.price_no * 100),
  }));

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="font-semibold text-sm mb-4">История цены</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="gYes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gNo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tick={{ fill: "#64748b", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#64748b", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "#131829",
                border: "1px solid #1e293b",
                borderRadius: 12,
                fontSize: 12,
                color: "#fff",
              }}
              formatter={(value: number, name: string) => [
                `${value}%`,
                name === "yes" ? "Да" : "Нет",
              ]}
            />
            <Area
              type="monotone"
              dataKey="yes"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#gYes)"
            />
            <Area
              type="monotone"
              dataKey="no"
              stroke="#f43f5e"
              strokeWidth={1.5}
              fill="url(#gNo)"
              strokeDasharray="4 2"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
