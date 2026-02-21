interface ViewToggleProps {
  mode: 'list' | 'map';
  onChange: (mode: 'list' | 'map') => void;
}

const btnClass = (active: boolean) =>
  `inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
    active
      ? 'bg-teal-600 text-white'
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
  }`;

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex justify-center gap-1 mb-4">
      <button className={btnClass(mode === 'list')} onClick={() => onChange('list')}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
        Liste
      </button>
      <button className={btnClass(mode === 'map')} onClick={() => onChange('map')}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        Carte
      </button>
    </div>
  );
}
