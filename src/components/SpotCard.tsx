import type { SpotForecast, NavigabilityConfig, CurrentWeather } from '../types/forecast';
import { DayForecast } from './DayForecast';
import { dayLabel, lakeName } from '../utils/format';

interface SpotCardProps {
  spot: SpotForecast;
  navigability: NavigabilityConfig;
  yAxisMax: number;
  currentWeather: CurrentWeather | null;
  stationId: string | null;
}

/** SMN station metadata for tooltip display */
const STATIONS: Record<string, { name: string; location: string; lat: number; lon: number }> = {
  PUY: { name: 'Pully', location: 'Pully, VD', lat: 46.5106, lon: 6.6667 },
  CGI: { name: 'Changins', location: 'Nyon, VD', lat: 46.4011, lon: 6.2277 },
  CHB: { name: 'Les Charbonnières', location: 'Vallée de Joux, VD', lat: 46.6702, lon: 6.3124 },
  PAY: { name: 'Payerne', location: 'Payerne, FR', lat: 46.8116, lon: 6.9426 },
  MAH: { name: 'Mathod', location: 'Mathod, VD', lat: 46.7370, lon: 6.5680 },
  NEU: { name: 'Neuchâtel', location: 'Neuchâtel, NE', lat: 47.0000, lon: 6.9500 },
  FRE: { name: 'La Frêtaz', location: 'Bullet, VD', lat: 46.8406, lon: 6.5764 },
  BIE: { name: 'Bière', location: 'Bière, VD', lat: 46.5249, lon: 6.3424 },
};

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function WindArrow({ dir }: { dir: number }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      className="inline-block shrink-0"
      style={{ transform: `rotate(${dir + 180}deg)` }}
    >
      <path d="M7 1L10.5 11L7 8.5L3.5 11Z" fill="currentColor" />
    </svg>
  );
}

export function SpotCard({ spot, navigability, yAxisMax, currentWeather, stationId }: SpotCardProps) {
  // Show today + future days only
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const displayDays = spot.days.filter((d) => d.date >= todayStr);
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
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {spot.name}
            </h3>
            {currentWeather && currentWeather.windSpeed !== null && (() => {
              const station = stationId ? STATIONS[stationId] : null;
              const dist = station
                ? Math.round(distanceKm(spot.lat, spot.lon, station.lat, station.lon))
                : null;
              const tooltip = station
                ? `Station ${station.name} (${station.location}) — ~${dist} km`
                : undefined;
              return (
              <span
                className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 cursor-default"
                title={tooltip}
              >
                {currentWeather.windDir !== null && (
                  <WindArrow dir={currentWeather.windDir} />
                )}
                <span className="font-medium">{Math.round(currentWeather.windSpeed)}</span>
                <span className="text-[10px]">km/h</span>
                {currentWeather.temp !== null && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <span className="font-medium">{currentWeather.temp.toFixed(1)}°</span>
                  </>
                )}
              </span>
              );
            })()}
          </div>
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
            yAxisMax={yAxisMax}
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
