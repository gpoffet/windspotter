import { useMemo } from 'react';

export interface TimeStep {
  date: string;
  hour: number;
}

interface TimeSliderProps {
  steps: TimeStep[];
  index: number;
  onChange: (index: number) => void;
}

/** Format "Auj.", "Dem.", or weekday name for a date string */
function shortDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Auj.";
  if (diff === 1) return 'Dem.';
  return d.toLocaleDateString('fr-CH', { weekday: 'short' });
}

export function TimeSlider({ steps, index, onChange }: TimeSliderProps) {
  // Find indices where the day changes to render day labels
  const dayBreaks = useMemo(() => {
    const breaks: { index: number; label: string }[] = [];
    let prevDate = '';
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].date !== prevDate) {
        breaks.push({ index: i, label: shortDay(steps[i].date) });
        prevDate = steps[i].date;
      }
    }
    return breaks;
  }, [steps]);

  if (steps.length === 0) return null;

  const current = steps[index];

  return (
    <div className="mt-3 px-2">
      {/* Current time label */}
      <div className="text-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {shortDay(current.date)} {current.hour}h
      </div>

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={steps.length - 1}
        value={index}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-600
          [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-teal-600 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md
          [&::-moz-range-thumb]:cursor-pointer"
      />

      {/* Day labels beneath the slider */}
      <div className="relative h-5 mt-1">
        {dayBreaks.map(({ index: breakIdx, label }) => (
          <span
            key={breakIdx}
            className="absolute text-[10px] text-slate-500 dark:text-slate-400 -translate-x-1/2"
            style={{ left: `${(breakIdx / Math.max(steps.length - 1, 1)) * 100}%` }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
