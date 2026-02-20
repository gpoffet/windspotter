import { useForecast } from './hooks/useForecast';
import { useConfig } from './hooks/useConfig';
import { Header } from './components/Header';
import { SpotCard, SpotCardSkeleton } from './components/SpotCard';
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
  const { data, loading, refreshing, refresh } = useForecast();
  const { navigability, loading: configLoading } = useConfig();

  const updatedAt = data?.updatedAt?.toMillis() ?? null;
  const isLoading = loading || configLoading;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
      <Header updatedAt={updatedAt} refreshing={refreshing} onRefresh={refresh} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SpotCardSkeleton key={i} />
            ))}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sortByNavigability(data.spots).map((spot) => (
              <SpotCard key={spot.pointId} spot={spot} navigability={navigability} />
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
