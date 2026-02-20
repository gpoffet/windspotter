import { useState, useEffect } from 'react';
import type { Spot, WindForecast } from '../types/spot';
import { fetchSpotForecast } from '../services/weatherService';

interface UseSpotForecastResult {
  forecasts: WindForecast[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSpotForecast(spot: Spot): UseSpotForecastResult {
  const [forecasts, setForecasts] = useState<WindForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSpotForecast(spot)
      .then((data) => {
        if (!cancelled) {
          setForecasts(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [spot.id, fetchKey]);

  const refetch = () => setFetchKey((k) => k + 1);

  return { forecasts, loading, error, refetch };
}
