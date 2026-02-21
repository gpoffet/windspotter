import { useRegisterSW } from 'virtual:pwa-register/react';
import { useState } from 'react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const [updating, setUpdating] = useState(false);

  const handleUpdate = () => {
    setUpdating(true);
    // Listen for controller change directly on the native API
    // This is more reliable than workbox-window's "controlling" event
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
    updateServiceWorker(true);
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 dark:bg-slate-700 shadow-lg border border-slate-700 dark:border-slate-600 text-white text-sm max-w-md w-full">
        <svg className="w-5 h-5 shrink-0 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M16 21h5v-5" />
        </svg>
        <span className="flex-1">{updating ? 'Mise à jour...' : 'Nouvelle version disponible'}</span>
        <button
          onClick={handleUpdate}
          disabled={updating}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
        >
          Mettre à jour
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
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
