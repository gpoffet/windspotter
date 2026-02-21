import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
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
    const unsubSpots = onSnapshot(
      doc(db, 'config', 'spots'),
      (snap) => {
        if (snap.exists()) {
          setSpots(snap.data().spots as SpotConfig[]);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load spots config:', err);
        setLoading(false);
      },
    );

    const unsubNav = onSnapshot(
      doc(db, 'config', 'navigability'),
      (snap) => {
        if (snap.exists()) {
          setNavigability(snap.data() as NavigabilityConfig);
        } else {
          setNavigability(DEFAULT_NAVIGABILITY);
        }
      },
      (err) => {
        console.error('Failed to load navigability config:', err);
        setNavigability(DEFAULT_NAVIGABILITY);
      },
    );

    return () => {
      unsubSpots();
      unsubNav();
    };
  }, []);

  return { spots, navigability, loading };
}
