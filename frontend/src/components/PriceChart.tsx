import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { PricePoint } from "@/types";

interface PriceChartProps {
  data: PricePoint[];
}

export function PriceChart({ data }: PriceChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-tg-hint text-sm">
        Пока нет истории цен
      </div>
    );
  }

  const chartData = data.map((p) => ({
    time: new Date(p.created_at).toLocaleTimeString("ru", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    yes: Math.round(p.price_yes * 100),
    no: Math.round(p.price_no * 100),
  }));

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="yesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="noGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            formatter={(value: number) => `${value}%`}
            labelStyle={{ fontSize: 12 }}
          />
          <Area
            type="monotone"
            dataKey="yes"
            stroke="#22c55e"
            fill="url(#yesGradient)"
            strokeWidth={2}
            name="ДА"
          />
          <Area
            type="monotone"
            dataKey="no"
            stroke="#ef4444"
            fill="url(#noGradient)"
            strokeWidth={2}
            name="НЕТ"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
