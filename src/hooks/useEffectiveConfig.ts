import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { NavigabilityConfig } from '../types/forecast';

export function useEffectiveConfig(
  globalConfig: NavigabilityConfig | null,
): NavigabilityConfig | null {
  const { preferences } = useAuth();

  return useMemo(() => {
    if (!globalConfig) return null;
    if (!preferences) return globalConfig;

    return {
      ...globalConfig,
      windSpeedMin: preferences.windSpeedMin,
      gustMin: preferences.gustMin,
    };
  }, [globalConfig, preferences]);
}
