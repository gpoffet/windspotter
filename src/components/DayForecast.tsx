import type { DayForecast as DayForecastType, NavigabilityConfig } from '../types/forecast';
import { NavigableBadge, NotNavigableBadge } from './NavigableBadge';
import { WindChart } from './WindChart';

interface DayForecastProps {
  day: DayForecastType;
  label: string;
  navigability: NavigabilityConfig;
  yAxisMax: number;
}

export function DayForecast({ day, label, navigability, yAxisMax }: DayForecastProps) {
  // Compute summary stats
  const maxSpeed = Math.max(...day.hourly.map((h) => h.speed));
  const maxGust = Math.max(...day.hourly.map((h) => h.gust));

  return (
    <div className="space-y-2">
      {/* Day header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize">
            {label}
          </span>
          <span className="text-xs text-slate-400">
            {day.sunshine > 0 && `☀️ ${day.sunshine}h`}
          </span>
        </div>

        <div className="flex gap-1 flex-wrap">
          {day.isNavigable ? (
            day.slots.map((slot, i) => <NavigableBadge key={i} slot={slot} />)
          ) : (
            <NotNavigableBadge />
          )}
        </div>
      </div>

      {/* Wind summary when not navigable */}
      {!day.isNavigable && day.hourly.length > 0 && (
        <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span>Max vent: {Math.round(maxSpeed)} km/h</span>
          <span>Max rafales: {Math.round(maxGust)} km/h</span>
        </div>
      )}

      {/* Wind chart */}
      {day.hourly.length > 0 && (
        <WindChart hourly={day.hourly} slots={day.slots} navigability={navigability} yAxisMax={yAxisMax} />
      )}
    </div>
  );
}
