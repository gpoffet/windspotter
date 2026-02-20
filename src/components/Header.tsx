import { relativeTime } from '../utils/format';

interface HeaderProps {
  updatedAt: number | null; // timestamp in ms
  refreshing: boolean;
  onRefresh: () => void;
}

export function Header({ updatedAt, refreshing, onRefresh }: HeaderProps) {
  return (
    <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-teal-500">
            <path d="M4 12C4 8 8 4 12 4s8 4 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M4 18c0-3 3-6 8-6s8 3 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Windspotter
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {updatedAt && (
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              Mis à jour {relativeTime(updatedAt)}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            aria-label="Rafraîchir"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={refreshing ? 'animate-spin' : ''}
            >
              <path d="M21 12a9 9 0 11-3-6.7" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
