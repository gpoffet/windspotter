import type { SpotForecast, NavigabilityConfig, NavigableSlot, CurrentWeather } from '../types/forecast';
import { DayForecast } from './DayForecast';
import { StarButton } from './StarButton';
import { dayLabel, lakeName } from '../utils/format';
import { SMN_STATIONS_FALLBACK as STATIONS } from '../utils/smnStations';

interface SpotCardProps {
  spot: SpotForecast;
  navigability: NavigabilityConfig;
  yAxisMax: number;
  currentWeather: CurrentWeather | null;
  stationId: string | null;
  forecastDays: number;
  isExpanded: boolean;
  onToggle: () => void;
  bestSlot: NavigableSlot | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}


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

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-5 h-5 text-slate-400 dark:text-slate-500 transition-transform duration-300 ${expanded ? 'rotate-90' : ''}`}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
    </svg>
  );
}

export function SpotCard({ spot, navigability, yAxisMax, currentWeather, stationId, forecastDays, isExpanded, onToggle, bestSlot, isFavorite, onToggleFavorite }: SpotCardProps) {
  // Show today + future days only
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const displayDays = spot.days.filter((d) => d.date >= todayStr).slice(0, forecastDays);
  const hasNavigableDay = displayDays.some((d) => d.isNavigable);
  const cardId = `spot-body-${spot.pointId}`;

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
      {/* Clickable header / summary — always visible */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={cardId}
        className="w-full text-left px-4 py-3 flex items-center gap-3 cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-xl"
      >
        {/* Navigability dot */}
        <span
          className={`shrink-0 w-2.5 h-2.5 rounded-full ${
            hasNavigableDay
              ? 'bg-green-500 dark:bg-green-400'
              : 'bg-slate-300 dark:bg-slate-600'
          }`}
        />

        {/* Favorite star */}
        <StarButton active={isFavorite} onClick={onToggleFavorite} />

        {/* Spot name + lake */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
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
                className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 shrink-0"
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
          {(spot.waterBodyName || spot.lake) && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {spot.waterBodyName ?? lakeName(spot.lake)}
            </p>
          )}
        </div>

        {/* Best slot summary (collapsed only) */}
        {!isExpanded && bestSlot && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 shrink-0">
            {bestSlot.avgSpeed}–{bestSlot.avgGust} km/h {bestSlot.direction} · {bestSlot.start}h–{bestSlot.end}h
          </span>
        )}

        {/* Water temp badge */}
        {spot.waterTemp.current !== null && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-sm font-semibold text-blue-600 dark:text-blue-400 shrink-0">
            🌊 {spot.waterTemp.current}°C
          </span>
        )}

        {/* Chevron */}
        <Chevron expanded={isExpanded} />
      </button>

      {/* Collapsible body */}
      <div
        id={cardId}
        role="region"
        aria-hidden={!isExpanded}
        className={`overflow-hidden transition-[max-height] duration-300 ease-out ${
          isExpanded ? 'max-h-[2000px]' : 'max-h-0'
        }`}
      >
        {/* Only render heavy content (charts) when expanded for performance */}
        {isExpanded && (
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
