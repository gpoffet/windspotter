/**
 * Format a day label in French.
 * Returns "Aujourd'hui", "Demain", or the day name (e.g., "Lundi").
 */
export function dayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Demain';

  return date.toLocaleDateString('fr-CH', { weekday: 'long' });
}

/**
 * Format a relative time string in French (e.g., "il y a 23 min").
 */
export function relativeTime(timestampMs: number): string {
  const diffMs = Date.now() - timestampMs;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `il y a ${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `il y a ${diffDays}j`;
}

/**
 * Format a lake name for display.
 */
export function lakeName(key: string): string {
  const names: Record<string, string> = {
    geneva: 'Lac Léman',
    neuchatel: 'Lac de Neuchâtel',
    joux: 'Lac de Joux',
    bret: 'Lac de Bret',
  };
  return names[key] ?? key;
}
