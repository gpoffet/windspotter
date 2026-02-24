import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForecast } from './hooks/useForecast';
import { useConfig } from './hooks/useConfig';
import { useCurrentWeather } from './hooks/useCurrentWeather';
import { useEffectiveConfig } from './hooks/useEffectiveConfig';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './hooks/useTheme';
import { useFavorites } from './hooks/useFavorites';
import { Header } from './components/Header';
import { SpotCard, SpotCardSkeleton } from './components/SpotCard';
import { ViewToggle } from './components/ViewToggle';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { AccountPromoModal } from './components/AccountPromoModal';
import { UpdatePrompt } from './components/UpdatePrompt';
import { InstallBanner } from './components/InstallBanner';
import { useAccountPromo } from './hooks/useAccountPromo';
import type { PromoTrigger } from './hooks/useAccountPromo';
import { calculateSlots } from './utils/navigability';
import type { SpotConfig, SpotForecast } from './types/forecast';

const SpotMap = lazy(() => import('./components/SpotMap'));

/** Check if a spot has any navigable slot in displayed days */
function isSpotNavigable(spot: SpotForecast, forecastDays: number): boolean {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return spot.days
    .filter((d) => d.date >= todayStr)
    .slice(0, forecastDays)
    .some((d) => d.isNavigable);
}

/** Get the best navigable slot (first slot of first navigable day) for a spot */
function getBestSlot(spot: SpotForecast, forecastDays: number) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const displayDays = spot.days.filter((d) => d.date >= todayStr).slice(0, forecastDays);
  for (const day of displayDays) {
    if (day.slots.length > 0) return day.slots[0];
  }
  return null;
}

function App() {
  const { data, loading, refreshing, error, refresh, dismissError } = useForecast();
  const { spots: spotConfigs, navigability: globalNavigability, loading: configLoading } = useConfig();
  const navigability = useEffectiveConfig(globalNavigability);
  const { user, loading: authLoading, preferences } = useAuth();
  useTheme(preferences?.themePreference);
  const forecastDays = preferences?.forecastDays ?? 2;
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const { isFavorite, toggleFavorite } = useFavorites();

  // Accordion state: which spots are expanded (spotPointId → boolean)
  const [expandedSpots, setExpandedSpots] = useState<Record<string, boolean>>({});
  const expandedInitializedRef = useRef(false);

  const updatedAt = data?.updatedAt?.toMillis() ?? null;
  const isLoading = loading || configLoading;

  // Auto-refresh forecast when config spots don't match forecast spots (max 3 retries per config change)
  const syncRetriesRef = useRef({ key: '', count: 0 });
  useEffect(() => {
    if (!data?.spots || refreshing) return;

    const forecastPointIds = new Set(data.spots.map((s) => s.pointId));
    const outOfSync = spotConfigs.some((s) => !forecastPointIds.has(s.pointId));
    if (!outOfSync) return;

    const configKey = spotConfigs.map((s) => s.pointId).sort().join(',');
    const retries = syncRetriesRef.current;
    const count = retries.key === configKey ? retries.count : 0;
    if (count >= 3) return;

    syncRetriesRef.current = { key: configKey, count: count + 1 };
    refresh({ force: true });
  }, [spotConfigs, data?.spots, refreshing, refresh]);

  // Compute navigable slots client-side with per-user thresholds
  const configPointIds = useMemo(() => new Set(spotConfigs.map((s) => s.pointId)), [spotConfigs]);
  const configByPointId = useMemo(() => {
    const map = new Map<string, SpotConfig>();
    for (const s of spotConfigs) map.set(s.pointId, s);
    return map;
  }, [spotConfigs]);
  const enrichedSpots = useMemo(() => {
    if (!data?.spots || !navigability) return [];
    return data.spots
      .filter((spot) => configPointIds.has(spot.pointId))
      .map((spot) => {
        const cfg = configByPointId.get(spot.pointId);
        return {
          ...spot,
          ...(cfg && { name: cfg.name, lat: cfg.lat, lon: cfg.lon, lake: cfg.lake }),
          days: spot.days.map((day) => {
            const slots = calculateSlots(day.hourly, navigability);
            return { ...day, slots, isNavigable: slots.length > 0 };
          }),
        };
      });
  }, [data?.spots, navigability, configPointIds, configByPointId]);

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

  // Initialize expanded state: navigable spots open, non-navigable closed
  useEffect(() => {
    if (expandedInitializedRef.current || enrichedSpots.length === 0) return;
    const defaults: Record<string, boolean> = {};
    for (const spot of enrichedSpots) {
      defaults[spot.pointId] = isSpotNavigable(spot, forecastDays);
    }
    setExpandedSpots(defaults);
    expandedInitializedRef.current = true;
  }, [enrichedSpots, forecastDays]);

  // Persist expanded state to sessionStorage (only after initialization)
  useEffect(() => {
    if (!expandedInitializedRef.current) return;
    sessionStorage.setItem('windspotter_expanded', JSON.stringify(expandedSpots));
  }, [expandedSpots]);

  const toggleSpot = useCallback((pointId: string) => {
    setExpandedSpots((prev) => ({ ...prev, [pointId]: !prev[pointId] }));
  }, []);

  // Filter spots based on user preference
  const visibleSpots = useMemo(() => {
    const sel = preferences?.selectedSpots;
    if (!sel || sel.length === 0) return enrichedSpots;
    return enrichedSpots.filter((s) => sel.includes(s.pointId));
  }, [enrichedSpots, preferences?.selectedSpots]);

  const allExpanded = visibleSpots.length > 0 && visibleSpots.every((s) => expandedSpots[s.pointId]);
  const toggleAll = useCallback(() => {
    const newVal = !allExpanded;
    setExpandedSpots((prev) => {
      const next = { ...prev };
      for (const s of visibleSpots) next[s.pointId] = newVal;
      return next;
    });
  }, [allExpanded, visibleSpots]);

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

  // Split visible spots into navigable / non-navigable, favorites first then alphabetical
  const favThenAlpha = useCallback(
    (a: SpotForecast, b: SpotForecast) => {
      const aFav = isFavorite(a.pointId) ? 0 : 1;
      const bFav = isFavorite(b.pointId) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return a.name.localeCompare(b.name, 'fr');
    },
    [isFavorite],
  );
  const navigableSpots = useMemo(
    () => [...visibleSpots].filter((s) => isSpotNavigable(s, forecastDays)).sort(favThenAlpha),
    [visibleSpots, forecastDays, favThenAlpha],
  );
  const nonNavigableSpots = useMemo(
    () => [...visibleSpots].filter((s) => !isSpotNavigable(s, forecastDays)).sort(favThenAlpha),
    [visibleSpots, forecastDays, favThenAlpha],
  );

  // Account promo flow (replaces separate auth modal states)
  const {
    isOpen: promoOpen,
    trigger: promoTrigger,
    promptAccountCreation,
    closePromo,
    shouldShowProactive,
  } = useAccountPromo({ user, hasNavigableSpots: navigableSpots.length > 0 });

  const [authView, setAuthView] = useState<'login' | 'signup' | null>(null);
  const [showSettingsAfterAuth, setShowSettingsAfterAuth] = useState(false);
  const authOriginTriggerRef = useRef<PromoTrigger | null>(null);

  // Proactive promo: show after 3s delay once data is ready
  const proactiveTriggeredRef = useRef(false);
  useEffect(() => {
    if (!shouldShowProactive || proactiveTriggeredRef.current) return;
    const timer = setTimeout(() => {
      proactiveTriggeredRef.current = true;
      promptAccountCreation('proactive');
    }, 3000);
    return () => clearTimeout(timer);
  }, [shouldShowProactive, promptAccountCreation]);

  function handlePromoCreateAccount() {
    authOriginTriggerRef.current = promoTrigger;
    closePromo();
    setAuthView('signup');
  }

  function handlePromoLogin() {
    authOriginTriggerRef.current = promoTrigger;
    closePromo();
    setAuthView('login');
  }

  function handleAuthSuccess() {
    setAuthView(null);
    if (authOriginTriggerRef.current === 'default' || authOriginTriggerRef.current === 'settings') {
      setShowSettingsAfterAuth(true);
    }
    authOriginTriggerRef.current = null;
  }

  function handleAuthClose() {
    setAuthView(null);
    authOriginTriggerRef.current = null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
      <Header updatedAt={updatedAt} refreshing={refreshing} onRefresh={() => refresh()} onSettingsAuthNeeded={() => promptAccountCreation('settings')} />

      <InstallBanner />

      {/* Signup banner for anonymous users */}
      {!authLoading && !user && (
        <div className="bg-gradient-to-r from-teal-500 to-emerald-500 dark:from-teal-600 dark:to-emerald-600">
          <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3">
            <p className="text-white text-sm">
              Crée ton compte gratuit et configure les prévisions à ton besoin
            </p>
            <button
              onClick={() => promptAccountCreation('default')}
              className="shrink-0 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors"
            >
              Créer un compte
            </button>
          </div>
        </div>
      )}

      <AccountPromoModal
        isOpen={promoOpen}
        onClose={closePromo}
        onCreateAccount={handlePromoCreateAccount}
        onLogin={handlePromoLogin}
        trigger={promoTrigger}
      />
      <AuthModal
        open={authView !== null}
        onClose={handleAuthClose}
        initialView={authView ?? 'login'}
        onAuthenticated={handleAuthSuccess}
      />
      <SettingsModal
        open={showSettingsAfterAuth}
        onClose={() => setShowSettingsAfterAuth(false)}
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
                onClick={() => refresh()}
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
              onClick={() => refresh()}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Charger les prévisions
            </button>
          </div>
        )}

        {!isLoading && data && navigability && (
          <>
            <ViewToggle mode={viewMode} onChange={setViewMode} />

            {viewMode === 'list' ? (
              <>
                <div className="flex justify-end mb-2">
                  <button
                    onClick={toggleAll}
                    className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    {allExpanded ? 'Tout fermer' : 'Tout ouvrir'}
                  </button>
                </div>
                {/* Navigable spots section */}
                {navigableSpots.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    {navigableSpots.map((spot) => (
                      <SpotCard
                        key={spot.pointId}
                        spot={spot}
                        navigability={navigability}
                        yAxisMax={globalMaxGust}
                        currentWeather={currentWeather.get(stationByPointId.get(spot.pointId) ?? '') ?? null}
                        stationId={stationByPointId.get(spot.pointId) ?? null}
                        forecastDays={forecastDays}
                        isExpanded={!!expandedSpots[spot.pointId]}
                        onToggle={() => toggleSpot(spot.pointId)}
                        bestSlot={getBestSlot(spot, forecastDays)}
                        isFavorite={isFavorite(spot.pointId)}
                        onToggleFavorite={() => toggleFavorite(spot.pointId, () => promptAccountCreation('favorites'))}
                        webcams={configByPointId.get(spot.pointId)?.webcams}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-4">
                    Aucun spot navigable sur la période
                  </p>
                )}

                {/* Separator */}
                {navigableSpots.length > 0 && nonNavigableSpots.length > 0 && (
                  <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    <span className="text-sm text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      Pas navigable ({nonNavigableSpots.length})
                    </span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  </div>
                )}

                {/* Non-navigable spots section */}
                {nonNavigableSpots.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    {nonNavigableSpots.map((spot) => (
                      <SpotCard
                        key={spot.pointId}
                        spot={spot}
                        navigability={navigability}
                        yAxisMax={globalMaxGust}
                        currentWeather={currentWeather.get(stationByPointId.get(spot.pointId) ?? '') ?? null}
                        stationId={stationByPointId.get(spot.pointId) ?? null}
                        forecastDays={forecastDays}
                        isExpanded={!!expandedSpots[spot.pointId]}
                        onToggle={() => toggleSpot(spot.pointId)}
                        bestSlot={getBestSlot(spot, forecastDays)}
                        isFavorite={isFavorite(spot.pointId)}
                        onToggleFavorite={() => toggleFavorite(spot.pointId, () => promptAccountCreation('favorites'))}
                        webcams={configByPointId.get(spot.pointId)?.webcams}
                      />
                    ))}
                  </div>
                )}

                {visibleSpots.length < enrichedSpots.length && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setShowSettingsAfterAuth(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                      </svg>
                      Configure tes spots
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Suspense fallback={<div className="h-[60vh] rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />}>
                <SpotMap
                  spots={visibleSpots}
                  currentWeather={currentWeather}
                  stationByPointId={stationByPointId}
                  forecastDays={forecastDays}
                  navigability={navigability}
                />
              </Suspense>
            )}
          </>
        )}
      </main>

      <UpdatePrompt />

      <div className="bg-[#1877F2] dark:bg-[#1877F2]/90">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-center gap-3">
          <svg className="w-5 h-5 text-white shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <p className="text-white text-sm">
            Suivez WindSpotter sur Facebook pour les dernières actus
          </p>
          <a
            href="https://www.facebook.com/windspotterapp"
            className="shrink-0 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors"
            target="_blank"
            rel="noreferrer"
          >
            Suivre
          </a>
        </div>
      </div>

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
