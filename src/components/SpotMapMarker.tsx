import { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { SpotForecast, CurrentWeather, NavigabilityConfig, HourlyData } from '../types/forecast';
import { lakeName } from '../utils/format';

interface SpotMapMarkerProps {
  spot: SpotForecast;
  currentWeather: CurrentWeather | null;
  selectedDate: string;
  selectedHour: number;
  navigability: NavigabilityConfig;
}

type NavStatus = 'navigable' | 'not-navigable';

const STATUS_COLORS: Record<NavStatus, { bg: string; ring: string }> = {
  navigable: { bg: '#22c55e', ring: '#16a34a' },
  'not-navigable': { bg: '#94a3b8', ring: '#64748b' },
};

function isHourNavigable(h: HourlyData, config: NavigabilityConfig): boolean {
  return h.speed >= config.windSpeedMin && h.gust >= config.gustMin;
}

function findHourly(spot: SpotForecast, date: string, hour: number): HourlyData | undefined {
  const day = spot.days.find((d) => d.date === date);
  return day?.hourly.find((h) => h.hour === hour);
}

function makeIcon(letter: string, status: NavStatus) {
  const { bg, ring } = STATUS_COLORS[status];
  return L.divIcon({
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
    html: `<div style="
      width:32px;height:32px;border-radius:50%;
      background:${bg};border:3px solid ${ring};
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-weight:700;font-size:14px;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
      font-family:system-ui,sans-serif;
      transition:background 0.2s,border-color 0.2s;
    ">${letter}</div>`,
  });
}

export function SpotMapMarker({ spot, currentWeather, selectedDate, selectedHour, navigability }: SpotMapMarkerProps) {
  const hourly = findHourly(spot, selectedDate, selectedHour);
  const navigable = hourly ? isHourNavigable(hourly, navigability) : false;
  const status: NavStatus = navigable ? 'navigable' : 'not-navigable';

  const icon = useMemo(
    () => makeIcon(spot.name.charAt(0).toUpperCase(), status),
    [spot.name, status],
  );

  return (
    <Marker position={[spot.lat, spot.lon]} icon={icon}>
      <Popup>
        <div className="min-w-[180px] text-sm">
          {/* Name + lake */}
          <div className="font-bold text-slate-900 text-base">{spot.name}</div>
          <div className="text-slate-500 text-xs mb-2">{lakeName(spot.lake)}</div>

          {/* Water temp */}
          {spot.waterTemp.current != null && (
            <div className="mb-2 text-xs text-blue-600 font-medium">
              💧 {spot.waterTemp.current.toFixed(1)}°C
            </div>
          )}

          {/* Forecast at selected hour */}
          {hourly ? (
            <div className={`mb-2 px-2 py-1.5 rounded-md text-xs ${navigable ? 'bg-green-50' : 'bg-slate-100'}`}>
              <div className="font-medium text-slate-700 mb-0.5">
                Prévision {selectedHour}h
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <span className={navigable ? 'text-green-700 font-semibold' : ''}>
                  {Math.round(hourly.speed)} km/h
                </span>
                <span className={`${navigable ? 'text-orange-600 font-semibold' : 'text-orange-600'}`}>
                  raf. {Math.round(hourly.gust)}
                </span>
                <span className="ml-auto text-slate-500">{hourly.dirText}</span>
              </div>
              <div className={`mt-1 text-xs font-medium ${navigable ? 'text-green-600' : 'text-slate-400'}`}>
                {navigable ? 'Navigable' : 'Pas navigable'}
              </div>
            </div>
          ) : (
            <div className="mb-2 px-2 py-1.5 rounded-md bg-slate-100 text-xs text-slate-400">
              Pas de données pour {selectedHour}h
            </div>
          )}

          {/* Current weather */}
          {currentWeather && currentWeather.windSpeed != null && (
            <div className="px-2 py-1.5 rounded-md bg-slate-50 text-xs">
              <div className="font-medium text-slate-500 mb-0.5">Mesure actuelle</div>
              <div className="flex items-center gap-2 text-slate-600">
                <span>{Math.round(currentWeather.windSpeed)} km/h</span>
                {currentWeather.windGust != null && (
                  <span className="text-orange-600">raf. {Math.round(currentWeather.windGust)}</span>
                )}
                {currentWeather.temp != null && (
                  <span className="ml-auto">{currentWeather.temp.toFixed(1)}°C</span>
                )}
              </div>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
