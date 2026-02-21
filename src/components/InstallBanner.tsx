import { useInstallPrompt } from '../hooks/useInstallPrompt';

export function InstallBanner() {
  const { canShow, install, dismiss } = useInstallPrompt();

  if (!canShow) return null;

  return (
    <div className="bg-slate-800 dark:bg-slate-700 border-b border-slate-700 dark:border-slate-600">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3">
        <svg className="w-4 h-4 shrink-0 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <p className="text-white text-sm">
          Installe Windspotter pour un accès rapide
        </p>
        <button
          onClick={install}
          className="shrink-0 px-3 py-1 rounded-md bg-teal-500 hover:bg-teal-400 text-white text-xs font-semibold transition-colors"
        >
          Installer
        </button>
        <button
          onClick={dismiss}
          className="shrink-0 p-1 rounded text-slate-400 hover:text-white transition-colors"
          aria-label="Fermer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
