import type { NavigableSlot } from '../types/forecast';

interface NavigableBadgeProps {
  slot: NavigableSlot;
}

export function NavigableBadge({ slot }: NavigableBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400" />
      {slot.start}h–{slot.end}h
      <span className="text-green-600/70 dark:text-green-400/70">
        {slot.direction}
      </span>
    </span>
  );
}

export function NotNavigableBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
      Pas navigable
    </span>
  );
}
