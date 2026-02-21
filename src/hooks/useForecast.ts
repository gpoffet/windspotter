import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import type { ForecastData } from '../types/forecast';

const DATA_TTL_MS = 60 * 60 * 1000; // 1 hour

interface UseForecastResult {
  data: ForecastData | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: (options?: { force?: boolean }) => Promise<void>;
  dismissError: () => void;
}

export function useForecast(): UseForecastResult {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dismissError = useCallback(() => setError(null), []);

  const triggerRefresh = useCallback(async (options?: { force?: boolean }) => {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      const refreshFn = httpsCallable(functions, 'refreshForecast');
      await refreshFn({ force: options?.force ?? false });
    } catch (err) {
      console.error('Failed to refresh forecast:', err);
      const age = data?.updatedAt ? Date.now() - data.updatedAt.toMillis() : null;
      const ageText = age !== null
        ? age < 60 * 60 * 1000
          ? `${Math.round(age / 60000)} min`
          : `${Math.round(age / 3600000)}h`
        : null;
      setError(
        ageText
          ? `Erreur de mise à jour — les données affichées datent de ${ageText}`
          : 'Erreur de mise à jour des prévisions',
      );
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, data]);

  useEffect(() => {
    const docRef = doc(db, 'forecasts', 'latest');

    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const forecastData = snap.data() as ForecastData;
          setData(forecastData);
          setLoading(false);

          // Check if data is stale
          const age = Date.now() - forecastData.updatedAt.toMillis();
          if (age >= DATA_TTL_MS) {
            setNeedsRefresh(true);
          }
        } else {
          // No data yet — trigger refresh
          setLoading(false);
          setNeedsRefresh(true);
        }
      },
      (error) => {
        console.error('Firestore onSnapshot error:', error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  // Auto-refresh when needed
  useEffect(() => {
    if (needsRefresh && !refreshing) {
      setNeedsRefresh(false);
      triggerRefresh();
    }
  }, [needsRefresh, refreshing, triggerRefresh]);

  return { data, loading, refreshing, error, refresh: triggerRefresh, dismissError };
}
