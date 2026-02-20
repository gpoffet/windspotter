import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { NavigabilityConfig, SpotConfig } from '../types/forecast';

interface UseConfigResult {
  spots: SpotConfig[];
  navigability: NavigabilityConfig | null;
  loading: boolean;
}

const DEFAULT_NAVIGABILITY: NavigabilityConfig = {
  windSpeedMin: 15,
  windSpeedMax: 20,
  gustMin: 25,
  minConsecutiveHours: 2,
  dayStartHour: 7,
  dayEndHour: 20,
  timezone: 'Europe/Zurich',
};

export function useConfig(): UseConfigResult {
  const [spots, setSpots] = useState<SpotConfig[]>([]);
  const [navigability, setNavigability] = useState<NavigabilityConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const [spotsSnap, navSnap] = await Promise.all([
          getDoc(doc(db, 'config', 'spots')),
          getDoc(doc(db, 'config', 'navigability')),
        ]);

        if (spotsSnap.exists()) {
          setSpots(spotsSnap.data().spots as SpotConfig[]);
        }

        if (navSnap.exists()) {
          setNavigability(navSnap.data() as NavigabilityConfig);
        } else {
          setNavigability(DEFAULT_NAVIGABILITY);
        }
      } catch (err) {
        console.error('Failed to load config:', err);
        setNavigability(DEFAULT_NAVIGABILITY);
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  return { spots, navigability, loading };
}
