import type { Spot } from '../types/spot';
import { useSpotForecast } from '../hooks/useSpotForecast';
import { WindDirectionArrow } from './WindDirectionArrow';

interface SpotCardProps {
  spot: Spot;
}

function getWindColor(speed: number): string {
  if (speed < 10) return 'text-gray-400';
  if (speed < 15) return 'text-green-400';
  if (speed < 25) return 'text-emerald-400';
  if (speed < 35) return 'text-yellow-400';
  if (speed < 45) return 'text-orange-400';
  return 'text-red-400';
}

function getCurrentForecast(forecasts: { timestamp: string }[]) {
  const now = new Date();
  return forecasts.reduce((closest, f) => {
    const diff = Math.abs(new Date(f.timestamp).getTime() - now.getTime());
    const closestDiff = Math.abs(new Date(closest.timestamp).getTime() - now.getTime());
    return diff < closestDiff ? f : closest;
  }, forecasts[0]);
}

export function SpotCard({ spot }: SpotCardProps) {
  const { forecasts, loading, error } = useSpotForecast(spot);

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl p-5 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-2/3 mb-3" />
        <div className="h-4 bg-slate-700 rounded w-1/2 mb-4" />
        <div className="h-16 bg-slate-700 rounded" />
      </div>
    );
  }

  if (error || forecasts.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white">{spot.name}</h3>
        <p className="text-sm text-slate-400">{spot.location}</p>
        <p className="text-red-400 mt-3 text-sm">
          {error || 'No forecast data available'}
        </p>
      </div>
    );
  }

  const current = getCurrentForecast(forecasts);
  const typedCurrent = current as (typeof forecasts)[0];

  return (
    <div className="bg-slate-800 rounded-xl p-5 hover:bg-slate-750 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{spot.name}</h3>
          <p className="text-sm text-slate-400">{spot.location}</p>
        </div>
        <WindDirectionArrow
          degrees={typedCurrent.windDirection}
          className={getWindColor(typedCurrent.windSpeed)}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Vent</p>
          <p className={`text-2xl font-bold ${getWindColor(typedCurrent.windSpeed)}`}>
            {Math.round(typedCurrent.windSpeed)}
          </p>
          <p className="text-xs text-slate-500">km/h</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Rafales</p>
          <p className={`text-2xl font-bold ${getWindColor(typedCurrent.windGust)}`}>
            {Math.round(typedCurrent.windGust)}
          </p>
          <p className="text-xs text-slate-500">km/h</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Temp</p>
          <p className="text-2xl font-bold text-blue-300">
            {Math.round(typedCurrent.temperature)}°
          </p>
          <p className="text-xs text-slate-500">°C</p>
        </div>
      </div>

      {spot.description && (
        <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-700">
          {spot.description}
        </p>
      )}
    </div>
  );
}
