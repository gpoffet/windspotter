import { useState } from 'react';
import { Modal } from './Modal';
import { useWebcams } from '../hooks/useWebcams';

interface WebcamModalProps {
  open: boolean;
  onClose: () => void;
  spotName: string;
  webcamIds: string[];
}

export function WebcamModal({ open, onClose, spotName, webcamIds }: WebcamModalProps) {
  const { webcams, loading, error } = useWebcams(open ? webcamIds : []);
  const [activeTab, setActiveTab] = useState(0);

  const current = webcams[activeTab];

  return (
    <Modal open={open} onClose={onClose} title={`Webcams — ${spotName}`}>
      <div className="space-y-3">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <svg className="w-6 h-6 text-teal-600 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Webcam tabs (if multiple) */}
        {!loading && !error && webcams.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {webcams.map((w, i) => (
              <button
                key={w.webcamId}
                onClick={() => setActiveTab(i)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  i === activeTab
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {w.title}
              </button>
            ))}
          </div>
        )}

        {/* Player iframe */}
        {!loading && !error && current && (
          <div className="space-y-3">
            <div className="w-full aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700">
              <iframe
                src={current.playerUrl}
                className="w-full h-full border-0"
                allowFullScreen
                title={current.title}
              />
            </div>

            {/* Windy page link */}
            <div className="flex items-center justify-between">
              <a
                href={current.windyPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-teal-600 dark:text-teal-400 hover:underline"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Voir sur Windy
              </a>

              {current.livePlayerUrl && (
                <button
                  onClick={() => {
                    const iframe = document.querySelector<HTMLIFrameElement>(`iframe[title="${current.title}"]`);
                    if (iframe) {
                      const isLive = iframe.src === current.livePlayerUrl;
                      iframe.src = isLive ? current.playerUrl : current.livePlayerUrl!;
                    }
                  }}
                  className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
                >
                  Live
                </button>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && webcams.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
            Aucune webcam disponible
          </p>
        )}

        {/* Windy credit */}
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center pt-2 border-t border-slate-200 dark:border-slate-700">
          Webcams provided by{' '}
          <a
            href="https://www.windy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 dark:text-teal-400 hover:underline"
          >
            Windy.com
          </a>
        </p>
      </div>
    </Modal>
  );
}
