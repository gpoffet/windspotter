import { spots } from './data/spots';
import { SpotCard } from './components/SpotCard';

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-emerald-400">
            <path d="M4 12C4 8 8 4 12 4s8 4 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M4 18c0-3 3-6 8-6s8 3 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
          <h1 className="text-xl font-bold tracking-tight">Windspotter</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <p className="text-slate-400 mb-6">
          Real-time wind forecasts for wingfoil spots
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {spots.map((spot) => (
            <SpotCard key={spot.id} spot={spot} />
          ))}
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-slate-600">
        Data from <a href="https://open-meteo.com/" className="text-slate-400 hover:text-white transition-colors" target="_blank" rel="noreferrer">Open-Meteo</a>
      </footer>
    </div>
  );
}

export default App;
