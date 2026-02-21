import { useState, useEffect, useCallback, useRef } from 'react';
import type { CurrentWeather } from '../types/forecast';

const VQHA80_URL =
  'https://data.geo.admin.ch/ch.meteoschweiz.messwerte-aktuell/VQHA80.csv';
const POLL_INTERVAL_MS = 10 * 60_000; // aligned with MeteoSuisse update frequency

// CSV column indices (semicolon-separated)
const COL_STATION = 0;
const COL_TEMP = 2; // tre200s0
const COL_WIND_DIR = 8; // dkl010z0
const COL_WIND_SPEED = 9; // fu3010z0
const COL_WIND_GUST = 10; // fu3010z1

function parseFloat_(v: string): number | null {
  if (!v || v === '-') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function parseCsv(
  csv: string,
  targetStations: Set<string>,
): Map<string, CurrentWeather> {
  const result = new Map<string, CurrentWeather>();
  const lines = csv.split('\n');

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';');
    const stationId = cols[COL_STATION];
    if (!stationId || !targetStations.has(stationId)) continue;

    result.set(stationId, {
      temp: parseFloat_(cols[COL_TEMP]),
      windSpeed: parseFloat_(cols[COL_WIND_SPEED]),
      windGust: parseFloat_(cols[COL_WIND_GUST]),
      windDir: parseFloat_(cols[COL_WIND_DIR]),
    });
  }

  return result;
}

export function useCurrentWeather(
  stationIds: string[],
): Map<string, CurrentWeather> {
  const [data, setData] = useState<Map<string, CurrentWeather>>(new Map());
  const targetSet = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep target set in sync without triggering re-renders
  useEffect(() => {
    targetSet.current = new Set(stationIds);
  }, [stationIds]);

  const fetchWeather = useCallback(async () => {
    if (targetSet.current.size === 0) return;
    try {
      const res = await fetch(VQHA80_URL);
      if (!res.ok) return;
      const csv = await res.text();
      const parsed = parseCsv(csv, targetSet.current);
      setData(parsed);
    } catch {
      // Silently ignore network errors — keep stale data
    }
  }, []);

  useEffect(() => {
    if (stationIds.length === 0) return;

    // Initial fetch
    fetchWeather();

    // Poll every 30s while page is visible
    function startPolling() {
      stopPolling();
      intervalRef.current = setInterval(fetchWeather, POLL_INTERVAL_MS);
    }

    function stopPolling() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        fetchWeather();
        startPolling();
      } else {
        stopPolling();
      }
    }

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [stationIds, fetchWeather]);

  return data;
}
