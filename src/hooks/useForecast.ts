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
  refresh: () => Promise<void>;
}

export function useForecast(): UseForecastResult {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  const triggerRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const refreshFn = httpsCallable(functions, 'refreshForecast');
      await refreshFn();
      // onSnapshot will automatically pick up the new data
    } catch (err) {
      console.error('Failed to refresh forecast:', err);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

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

  return { data, loading, refreshing, refresh: triggerRefresh };
}
