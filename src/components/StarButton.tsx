interface StarButtonProps {
  active: boolean;
  onClick: () => void;
}

export function StarButton({ active, onClick }: StarButtonProps) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
      }}
      className={`shrink-0 w-8 h-8 -m-1 flex items-center justify-center transition-colors duration-150 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 ${
        active ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'
      }`}
      aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      aria-pressed={active}
    >
      <svg
        className="w-4.5 h-4.5"
        viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </span>
  );
}
