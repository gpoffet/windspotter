import { useMemo, useState } from 'react';
import { useForecast } from './hooks/useForecast';
import { useConfig } from './hooks/useConfig';
import { useCurrentWeather } from './hooks/useCurrentWeather';
import { useEffectiveConfig } from './hooks/useEffectiveConfig';
import { useAuth } from './contexts/AuthContext';
import { Header } from './components/Header';
import { SpotCard, SpotCardSkeleton } from './components/SpotCard';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { calculateSlots } from './utils/navigability';
import type { SpotForecast } from './types/forecast';

/**
 * Sort spots by navigability score (navigable spots first).
 * Today weighs 4x, tomorrow 2x, day after 1x.
 */
function sortByNavigability(spots: SpotForecast[]): SpotForecast[] {
  return [...spots].sort((a, b) => {
    const score = (s: SpotForecast) =>
      (s.days[0]?.isNavigable ? 4 : 0) +
      (s.days[1]?.isNavigable ? 2 : 0) +
      (s.days[2]?.isNavigable ? 1 : 0);
    return score(b) - score(a);
  });
}

function App() {
  const { data, loading, refreshing, error, refresh, dismissError } = useForecast();
  const { spots: spotConfigs, navigability: globalNavigability, loading: configLoading } = useConfig();
  const navigability = useEffectiveConfig(globalNavigability);
  const { user, loading: authLoading, preferences } = useAuth();
  const forecastDays = preferences?.forecastDays ?? 2;
  const [showAuthFromBanner, setShowAuthFromBanner] = useState(false);
  const [showSettingsFromBanner, setShowSettingsFromBanner] = useState(false);

  const updatedAt = data?.updatedAt?.toMillis() ?? null;
  const isLoading = loading || configLoading;

  // Compute navigable slots client-side with per-user thresholds
  const enrichedSpots = useMemo(() => {
    if (!data?.spots || !navigability) return [];
    return data.spots.map((spot) => ({
      ...spot,
      days: spot.days.map((day) => {
        const slots = calculateSlots(day.hourly, navigability);
        return { ...day, slots, isNavigable: slots.length > 0 };
      }),
    }));
  }, [data?.spots, navigability]);

  // Map pointId → stationId from config so we can look up current weather per spot
  const stationByPointId = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of spotConfigs) map.set(s.pointId, s.stationId);
    return map;
  }, [spotConfigs]);

  // Unique station IDs for the current weather hook
  const stationIds = useMemo(
    () => [...new Set(spotConfigs.map((s) => s.stationId))],
    [spotConfigs],
  );

  const currentWeather = useCurrentWeather(stationIds);

  // Global max gust across all spots/days so every chart shares the same Y scale
  const globalMaxGust = useMemo(() => {
    let max = 0;
    for (const spot of enrichedSpots) {
      for (const day of spot.days) {
        for (const h of day.hourly) {
          if (h.gust > max) max = h.gust;
        }
      }
    }
    // Round up to next multiple of 10 for a clean axis
    return Math.ceil(max / 10) * 10;
  }, [enrichedSpots]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
      <Header updatedAt={updatedAt} refreshing={refreshing} onRefresh={refresh} />

      {/* Signup banner for anonymous users */}
      {!authLoading && !user && (
        <div className="bg-gradient-to-r from-teal-500 to-emerald-500 dark:from-teal-600 dark:to-emerald-600">
          <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3">
            <p className="text-white text-sm">
              Crée ton compte gratuit et configure les prévisions à ton besoin
            </p>
            <button
              onClick={() => setShowAuthFromBanner(true)}
              className="shrink-0 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors"
            >
              Créer un compte
            </button>
          </div>
        </div>
      )}

      <AuthModal
        open={showAuthFromBanner}
        onClose={() => setShowAuthFromBanner(false)}
        initialView="signup"
        onAuthenticated={() => {
          setShowAuthFromBanner(false);
          setShowSettingsFromBanner(true);
        }}
      />
      <SettingsModal
        open={showSettingsFromBanner}
        onClose={() => setShowSettingsFromBanner(false)}
      />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Refresh banner */}
        {refreshing && data && (
          <div className="mb-4 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 text-sm">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-3-6.7" strokeLinecap="round" />
            </svg>
            Mise à jour des prévisions en cours...
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-center justify-between gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 text-sm">
            <span>{error}</span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={refresh}
                className="px-3 py-1 rounded-md bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors text-xs font-medium"
              >
                Réessayer
              </button>
              <button
                onClick={dismissError}
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                aria-label="Fermer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <div>
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-4">
              Chargement des prévisions...
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SpotCardSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {!isLoading && !data && (
          <div className="text-center py-16">
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Aucune donnée disponible
            </p>
            <button
              onClick={refresh}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Charger les prévisions
            </button>
          </div>
        )}

        {!isLoading && data && navigability && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sortByNavigability(enrichedSpots).map((spot) => (
              <SpotCard
                key={spot.pointId}
                spot={spot}
                navigability={navigability}
                yAxisMax={globalMaxGust}
                currentWeather={currentWeather.get(stationByPointId.get(spot.pointId) ?? '') ?? null}
                stationId={stationByPointId.get(spot.pointId) ?? null}
                forecastDays={forecastDays}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
        Données{' '}
        <a
          href="https://www.meteosuisse.admin.ch/"
          className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          target="_blank"
          rel="noreferrer"
        >
          MétéoSuisse
        </a>
        {' & '}
        <a
          href="https://www.alplakes.eawag.ch/"
          className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          target="_blank"
          rel="noreferrer"
        >
          Alplakes
        </a>
      </footer>
    </div>
  );
}

export default App;
