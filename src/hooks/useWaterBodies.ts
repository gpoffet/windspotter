import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { WaterBody } from '../types/forecast';

interface UseWaterBodiesResult {
  waterBodies: WaterBody[];
  loading: boolean;
}

export function useWaterBodies(): UseWaterBodiesResult {
  const [waterBodies, setWaterBodies] = useState<WaterBody[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'waterBodies'), orderBy('name'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as WaterBody[];
        setWaterBodies(items);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load water bodies:', err);
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  return { waterBodies, loading };
}
