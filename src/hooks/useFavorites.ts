import { useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useFavorites() {
  const { user, preferences, updatePreferences } = useAuth();

  const favorites = useMemo(
    () => new Set(preferences?.favoriteSpots ?? []),
    [preferences?.favoriteSpots],
  );

  const isFavorite = useCallback(
    (pointId: string) => favorites.has(pointId),
    [favorites],
  );

  const toggleFavorite = useCallback(
    (pointId: string, onAuthNeeded?: () => void) => {
      if (!user) {
        onAuthNeeded?.();
        return;
      }
      const current = preferences?.favoriteSpots ?? [];
      const next = current.includes(pointId)
        ? current.filter((id) => id !== pointId)
        : [...current, pointId];
      updatePreferences({ favoriteSpots: next });
    },
    [user, preferences?.favoriteSpots, updatePreferences],
  );

  return { favorites, isFavorite, toggleFavorite };
}
