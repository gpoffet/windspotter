interface WindDirectionArrowProps {
  degrees: number;
  className?: string;
}

export function WindDirectionArrow({ degrees, className = '' }: WindDirectionArrowProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      className={className}
      style={{ transform: `rotate(${degrees}deg)` }}
    >
      <path
        d="M12 2L8 12h3v8h2v-8h3L12 2z"
        fill="currentColor"
      />
    </svg>
  );
}
