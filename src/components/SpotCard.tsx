import type { SpotForecast, NavigabilityConfig } from '../types/forecast';
import { DayForecast } from './DayForecast';
import { dayLabel, lakeName } from '../utils/format';

interface SpotCardProps {
  spot: SpotForecast;
  navigability: NavigabilityConfig;
}

export function SpotCard({ spot, navigability }: SpotCardProps) {
  // Show first 3 days
  const displayDays = spot.days.slice(0, 3);
  const hasNavigableDay = displayDays.some((d) => d.isNavigable);

  return (
    <div
      className={`
        bg-white dark:bg-slate-800 rounded-xl border transition-colors
        ${hasNavigableDay
          ? 'border-green-200 dark:border-green-500/30'
          : 'border-slate-200 dark:border-slate-700'
        }
      `}
    >
      {/* Spot header */}
      <div className="px-4 pt-4 pb-2 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {spot.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lakeName(spot.lake)}
          </p>
        </div>
        {spot.waterTemp.current !== null && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10">
            <span className="text-sm">🌊</span>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {spot.waterTemp.current}°C
            </span>
          </div>
        )}
      </div>

      {/* Day forecasts */}
      <div className="px-4 pb-4 space-y-4">
        {displayDays.map((day) => (
          <DayForecast
            key={day.date}
            day={day}
            label={dayLabel(day.date)}
            navigability={navigability}
          />
        ))}

        {displayDays.length === 0 && (
          <p className="text-sm text-slate-400 py-4 text-center">
            Aucune donnée disponible
          </p>
        )}
      </div>
    </div>
  );
}

export function SpotCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 animate-pulse">
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-2" />
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
      <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
      <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
      <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded" />
    </div>
  );
}
