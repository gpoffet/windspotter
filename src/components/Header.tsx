import { relativeTime } from '../utils/format';
import logoLight from '../assets/logo-full-light.svg';
import logoDark from '../assets/logo-full-dark.svg';
import { SettingsButton } from './SettingsButton';

interface HeaderProps {
  updatedAt: number | null; // timestamp in ms
  refreshing: boolean;
  onRefresh: () => void;
  onSettingsAuthNeeded?: () => void;
}

export function Header({ updatedAt, refreshing, onRefresh, onSettingsAuthNeeded }: HeaderProps) {
  return (
    <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <h1>
          <img src={logoLight} alt="Windspotter" className="h-9 dark:hidden" />
          <img src={logoDark} alt="Windspotter" className="h-9 hidden dark:block" />
        </h1>

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
          <SettingsButton onAuthNeeded={onSettingsAuthNeeded} />
        </div>
      </div>
    </header>
  );
}
