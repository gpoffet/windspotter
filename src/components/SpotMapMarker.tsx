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

const PIN_PATH = 'M28 3 C40 3 49 13 49 25 C49 37 28 53 28 53 C28 53 7 37 7 25 C7 13 16 3 28 3Z';

function isHourNavigable(h: HourlyData, config: NavigabilityConfig): boolean {
  return h.speed >= config.windSpeedMin && h.gust >= config.gustMin;
}

function findHourly(spot: SpotForecast, date: string, hour: number): HourlyData | undefined {
  const day = spot.days.find((d) => d.date === date);
  return day?.hourly.find((h) => h.hour === hour);
}

function makeIcon(status: NavStatus) {
  const isNav = status === 'navigable';
  const gradId = isNav ? 'wsPinNav' : 'wsPinDef';
  const clipId = isNav ? 'wsClipNav' : 'wsClipDef';
  const gradStops = isNav
    ? ['#2dd4bf', '#14b8a6', '#0d9488']
    : ['#b0bec5', '#94a3b8', '#78909c'];
  const waveOpacities = isNav ? [0.85, 0.6, 0.4] : [0.5, 0.35, 0.25];
  const markerClass = isNav ? 'marker-navigable' : 'marker-default';
  const greenRing = isNav
    ? `<path d="${PIN_PATH}" fill="none" stroke="#22c55e" stroke-width="5" opacity="0.8"/>`
    : '';

  const html = `<svg class="${markerClass}" width="40" height="48" viewBox="2 -1 52 58" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${gradId}" x1="8" y1="0" x2="48" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${gradStops[0]}"/>
        <stop offset="50%" stop-color="${gradStops[1]}"/>
        <stop offset="100%" stop-color="${gradStops[2]}"/>
      </linearGradient>
      <clipPath id="${clipId}">
        <path d="${PIN_PATH}"/>
      </clipPath>
    </defs>
    ${greenRing}
    <path d="${PIN_PATH}" fill="url(#${gradId})"/>
    <g clip-path="url(#${clipId})">
      <path d="M10 16 C16 13,24 16,30 13 C36 10,42 14,48 12" stroke="rgba(255,255,255,${waveOpacities[0]})" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <path d="M8 23 C16 26,24 21,32 23 C40 25,44 20,50 22" stroke="rgba(255,255,255,${waveOpacities[1]})" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      <path d="M10 30 C18 27,26 31,34 28 C40 26,46 29,50 28" stroke="rgba(255,255,255,${waveOpacities[2]})" stroke-width="2" stroke-linecap="round" fill="none"/>
    </g>
    <circle cx="28" cy="23" r="3" fill="rgba(255,255,255,0.25)"/>
    <circle cx="28" cy="23" r="1.5" fill="rgba(255,255,255,0.85)"/>
  </svg>`;

  return L.divIcon({
    className: '',
    iconSize: [40, 48],
    iconAnchor: [20, 45],
    popupAnchor: [0, -45],
    html,
  });
}

export function SpotMapMarker({ spot, currentWeather, selectedDate, selectedHour, navigability }: SpotMapMarkerProps) {
  const hourly = findHourly(spot, selectedDate, selectedHour);
  const navigable = hourly ? isHourNavigable(hourly, navigability) : false;
  const status: NavStatus = navigable ? 'navigable' : 'not-navigable';

  const icon = useMemo(
    () => makeIcon(status),
    [status],
  );

  return (
    <Marker position={[spot.lat, spot.lon]} icon={icon}>
      <Popup>
        <div className="min-w-[180px] text-sm">
          {/* Name + lake */}
          <div className="font-bold text-slate-900 text-base">{spot.name}</div>
          {(spot.waterBodyName || spot.lake) && (
            <div className="text-slate-500 text-xs mb-2">{spot.waterBodyName ?? lakeName(spot.lake)}</div>
          )}

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
