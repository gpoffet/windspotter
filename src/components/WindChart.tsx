import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import type { HourlyData, NavigableSlot, NavigabilityConfig } from '../types/forecast';

interface WindChartProps {
  hourly: HourlyData[];
  slots: NavigableSlot[];
  navigability: NavigabilityConfig;
}

interface ChartEntry {
  label: string;
  hour: number;
  wind: number;
  gustExtra: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartEntry }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const totalGust = data.wind + data.gustExtra;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 shadow-lg text-xs">
      <p className="font-medium text-slate-700 dark:text-slate-200">{data.hour}h</p>
      <p className="text-teal-600 dark:text-teal-400">Vent: {data.wind} km/h</p>
      <p className="text-orange-600 dark:text-orange-400">Rafales: {totalGust} km/h</p>
    </div>
  );
}

export function WindChart({ hourly, slots, navigability }: WindChartProps) {
  const chartData: ChartEntry[] = hourly.map((h) => ({
    label: `${h.hour}`,
    hour: h.hour,
    wind: Math.round(h.speed * 10) / 10,
    gustExtra: Math.max(0, Math.round((h.gust - h.speed) * 10) / 10),
  }));

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={chartData} margin={{ top: 5, right: 0, bottom: 0, left: -25 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          interval={1}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          domain={[0, 'auto']}
        />

        {/* Navigable zone highlights */}
        {slots.map((slot, i) => (
          <ReferenceArea
            key={i}
            x1={String(slot.start)}
            x2={String(slot.end - 1)}
            fill="#22c55e"
            fillOpacity={0.1}
          />
        ))}

        {/* Threshold lines */}
        <ReferenceLine
          y={navigability.windSpeedMin}
          stroke="#eab308"
          strokeDasharray="4 4"
          strokeOpacity={0.6}
        />
        <ReferenceLine
          y={navigability.gustMin}
          stroke="#ef4444"
          strokeDasharray="4 4"
          strokeOpacity={0.6}
        />

        {/* Stacked bars: wind + extra gust */}
        <Bar dataKey="wind" stackId="wind" fill="#14b8a6" radius={[0, 0, 0, 0]} />
        <Bar dataKey="gustExtra" stackId="wind" fill="#fb923c" fillOpacity={0.5} radius={[2, 2, 0, 0]} />

        <Tooltip content={<CustomTooltip />} cursor={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
