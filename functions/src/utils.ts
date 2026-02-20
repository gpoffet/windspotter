/**
 * Convert degrees to 16-point compass direction text.
 */
export function dirText(deg: number): string {
  const dirs = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO',
  ];
  return dirs[Math.round(deg / 22.5) % 16];
}

/**
 * Parse a MétéoSuisse CSV timestamp (YYYYMMDDHHmm UTC) into a Date object.
 */
export function parseCsvTimestamp(ts: string): Date {
  return new Date(Date.UTC(
    parseInt(ts.slice(0, 4)),
    parseInt(ts.slice(4, 6)) - 1,
    parseInt(ts.slice(6, 8)),
    parseInt(ts.slice(8, 10)),
    parseInt(ts.slice(10, 12)),
  ));
}

/**
 * Convert a UTC Date to a local date string in Europe/Zurich.
 * Returns "YYYY-MM-DD".
 */
export function toZurichDateStr(utcDate: Date, timezone: string): string {
  return utcDate.toLocaleDateString('sv-SE', { timeZone: timezone });
}

/**
 * Get the local hour (0-23) for a UTC Date in a given timezone.
 */
export function toLocalHour(utcDate: Date, timezone: string): number {
  return parseInt(
    utcDate.toLocaleString('en-GB', { timeZone: timezone, hour: '2-digit', hour12: false }),
  );
}

/**
 * Build the MétéoSuisse CSV URL for a given parameter and UTC date.
 */
export function buildMeteoUrl(param: string, utcDate: Date): string {
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
  const y = utcDate.getUTCFullYear();
  const m = pad(utcDate.getUTCMonth() + 1);
  const d = pad(utcDate.getUTCDate());
  const h = pad(utcDate.getUTCHours());
  const dateStr = `${y}${m}${d}`;
  const dateTimeStr = `${dateStr}${h}00`;
  return `https://data.geo.admin.ch/ch.meteoschweiz.ogd-local-forecasting/${dateStr}-ch/vnut12.lssw.${dateTimeStr}.${param}.csv`;
}

/**
 * Get candidate UTC dates for CSV fetching: now-2h, now-3h, now-4h (all rounded to the hour).
 */
export function getCsvCandidateDates(): Date[] {
  const now = Date.now();
  return [2, 3, 4].map((hoursBack) => {
    const d = new Date(now - hoursBack * 3600_000);
    d.setUTCMinutes(0, 0, 0);
    return d;
  });
}

/**
 * Format a date as YYYYMMDDHHMM for the csvTimestamp field.
 */
export function formatCsvTimestamp(d: Date): string {
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
}
