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
      <div className="card p-5 lg:p-6 h-72 flex items-center justify-center">
        <div className="flex items-center gap-2 text-txt-muted text-sm">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Загрузка графика...
        </div>
      </div>
    );
  }

  if (!history || history.length < 2) {
    return (
      <div className="card p-5 lg:p-6 h-72 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-8 h-8 text-txt-muted mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <p className="text-txt-muted text-sm">Недостаточно данных для графика</p>
        </div>
      </div>
    );
  }

  const chartData = history.map((p) => ({
    time: new Date(p.created_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }),
    yes: Math.round(p.price_yes * 100),
    no: Math.round(p.price_no * 100),
  }));

  return (
    <div className="card p-5 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display font-semibold text-base">История цены</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-yes rounded-full" />
            <span className="text-txt-muted">Да</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-no rounded-full opacity-60" />
            <span className="text-txt-muted">Нет</span>
          </span>
        </div>
      </div>
      <div className="h-64 lg:h-72">
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
              tick={{ fill: "#64748b", fontSize: 10, fontFamily: "IBM Plex Mono" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#64748b", fontSize: 10, fontFamily: "IBM Plex Mono" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "#111827",
                border: "1px solid #1e293b",
                borderRadius: 10,
                fontSize: 12,
                fontFamily: "IBM Plex Mono",
                color: "#e8eaed",
                padding: "8px 12px",
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
