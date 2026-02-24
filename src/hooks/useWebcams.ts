import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

interface WebcamPlayer {
  webcamId: string;
  title: string;
  playerUrl: string;
  livePlayerUrl?: string;
  previewUrl: string;
  windyPageUrl: string;
}

interface UseWebcamsResult {
  webcams: WebcamPlayer[];
  loading: boolean;
  error: string | null;
}

export function useWebcams(webcamIds: string[]): UseWebcamsResult {
  const [webcams, setWebcams] = useState<WebcamPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (webcamIds.length === 0) {
      setWebcams([]);
      return;
    }

    setLoading(true);
    setError(null);

    const fn = httpsCallable<{ webcamIds: string[] }, { webcams: WebcamPlayer[] }>(
      functions,
      'getWebcamPlayer',
    );

    fn({ webcamIds })
      .then((result) => {
        setWebcams(result.data.webcams);
      })
      .catch((err) => {
        console.error('Failed to load webcams:', err);
        setError('Impossible de charger les webcams.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [webcamIds.join(',')]);

  return { webcams, loading, error };
}
