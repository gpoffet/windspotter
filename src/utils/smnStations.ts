export interface SmnStation {
  name: string;
  location: string; // "Name, Canton"
  lat: number;
  lon: number;
}

/** Minimal fallback used before async load completes or on fetch failure */
export const SMN_STATIONS_FALLBACK: Record<string, SmnStation> = {
  PUY: { name: 'Pully', location: 'Pully, VD', lat: 46.5106, lon: 6.6667 },
  CGI: { name: 'Changins', location: 'Nyon, VD', lat: 46.4011, lon: 6.2277 },
  CHB: { name: 'Les Charbonnières', location: 'Vallée de Joux, VD', lat: 46.6702, lon: 6.3124 },
  PAY: { name: 'Payerne', location: 'Payerne, FR', lat: 46.8116, lon: 6.9426 },
  MAH: { name: 'Mathod', location: 'Mathod, VD', lat: 46.7370, lon: 6.5680 },
  NEU: { name: 'Neuchâtel', location: 'Neuchâtel, NE', lat: 47.0000, lon: 6.9500 },
  FRE: { name: 'La Frêtaz', location: 'Bullet, VD', lat: 46.8406, lon: 6.5764 },
  BIE: { name: 'Bière', location: 'Bière, VD', lat: 46.5249, lon: 6.3424 },
};

const STATIONS_CSV_URL =
  'https://data.geo.admin.ch/ch.meteoschweiz.messnetz-automatisch/ch.meteoschweiz.messnetz-automatisch_de.csv';

/**
 * Fetches the complete list of SMN automatic stations from MeteoSuisse open data.
 * Only returns stations that measure wind.
 * CSV columns (semicolon-separated, double-quoted):
 *   0: Station name, 1: Abbreviation, 3: Type, 10: Latitude, 11: Longitude,
 *   13: Canton, 14: Measurements
 */
export async function fetchSmnStations(): Promise<Record<string, SmnStation>> {
  const res = await fetch(STATIONS_CSV_URL);
  if (!res.ok) throw new Error(`Failed to fetch SMN stations: ${res.status}`);
  const csv = await res.text();

  const stations: Record<string, SmnStation> = {};
  const lines = csv.split('\n');

  // Skip header row (index 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(';').map((c) => c.replace(/^"|"$/g, ''));
    const stationName = cols[0];
    const id = cols[1];
    const measurements = cols[14] ?? '';
    const canton = cols[13] ?? '';

    if (!id || !stationName) continue;

    const lat = parseFloat(cols[10]);
    const lon = parseFloat(cols[11]);
    if (!isFinite(lat) || !isFinite(lon)) continue;

    // Only include stations that measure wind (Wetterstationen)
    if (!measurements.includes('Wind')) continue;

    stations[id] = {
      name: stationName,
      location: canton ? `${stationName}, ${canton}` : stationName,
      lat,
      lon,
    };
  }

  return stations;
}
