import 'leaflet/dist/leaflet.css';
import { useMemo, useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import type { SpotForecast, CurrentWeather, NavigabilityConfig } from '../types/forecast';
import { SpotMapMarker } from './SpotMapMarker';
import { TimeSlider, type TimeStep } from './TimeSlider';

interface SpotMapProps {
  spots: SpotForecast[];
  currentWeather: Map<string, CurrentWeather>;
  stationByPointId: Map<string, string>;
  forecastDays: number;
  navigability: NavigabilityConfig;
}

/** Build a flat timeline of {date, hour} steps from the forecast data, filtered to [dayStart, dayEnd). */
function buildTimeline(spots: SpotForecast[], forecastDays: number, config: NavigabilityConfig): TimeStep[] {
  // Collect all unique date+hour pairs from all spots
  const seen = new Set<string>();
  const steps: TimeStep[] = [];

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  for (const spot of spots) {
    const days = spot.days.filter((d) => d.date >= todayStr).slice(0, forecastDays);
    for (const day of days) {
      for (const h of day.hourly) {
        if (h.hour < config.dayStartHour || h.hour >= config.dayEndHour) continue;
        const key = `${day.date}-${h.hour}`;
        if (!seen.has(key)) {
          seen.add(key);
          steps.push({ date: day.date, hour: h.hour });
        }
      }
    }
  }

  // Sort chronologically
  steps.sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour);
  return steps;
}

/** Find the index closest to "now" in the timeline. */
function currentIndex(steps: TimeStep[]): number {
  if (steps.length === 0) return 0;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentHour = now.getHours();

  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    // Simple distance: days * 24 + hour diff
    const dayDiff = s.date.localeCompare(todayStr);
    if (dayDiff < 0) continue; // past day, skip
    const dist = dayDiff === 0 ? Math.abs(s.hour - currentHour) : 24 + s.hour - currentHour;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

export default function SpotMap({ spots, currentWeather, stationByPointId, forecastDays, navigability }: SpotMapProps) {
  const bounds = useMemo(() => {
    if (spots.length === 0) return undefined;
    if (spots.length === 1) {
      return L.latLngBounds(
        [spots[0].lat - 0.05, spots[0].lon - 0.1],
        [spots[0].lat + 0.05, spots[0].lon + 0.1],
      );
    }
    return L.latLngBounds(spots.map((s) => [s.lat, s.lon] as L.LatLngTuple));
  }, [spots]);

  const timeline = useMemo(
    () => buildTimeline(spots, forecastDays, navigability),
    [spots, forecastDays, navigability],
  );

  const defaultIndex = useMemo(() => currentIndex(timeline), [timeline]);
  const [sliderIndex, setSliderIndex] = useState<number | null>(null);
  const index = sliderIndex ?? defaultIndex;
  const selected = timeline[index];

  if (spots.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm">
        Aucun spot à afficher
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden [&_.leaflet-tile-pane]:dark:brightness-[0.8] [&_.leaflet-tile-pane]:dark:contrast-[1.1]">
        <MapContainer
          bounds={bounds}
          boundsOptions={{ padding: [40, 40] }}
          scrollWheelZoom
          className="h-[calc(100dvh-280px)] min-h-[350px] w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {selected && spots.map((spot) => (
            <SpotMapMarker
              key={spot.pointId}
              spot={spot}
              currentWeather={currentWeather.get(stationByPointId.get(spot.pointId) ?? '') ?? null}
              selectedDate={selected.date}
              selectedHour={selected.hour}
              navigability={navigability}
            />
          ))}
        </MapContainer>
      </div>

      <TimeSlider steps={timeline} index={index} onChange={setSliderIndex} />
    </div>
  );
}
