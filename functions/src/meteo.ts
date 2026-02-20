import { buildMeteoUrl, getCsvCandidateDates } from './utils.js';
import type { MeteoParam } from './types.js';

const METEO_PARAMS: { key: 'speed' | 'gust' | 'dir' | 'sun'; param: MeteoParam }[] = [
  { key: 'speed', param: 'fu3010h0' },
  { key: 'gust', param: 'fu3010h1' },
  { key: 'dir', param: 'dkl010h0' },
  { key: 'sun', param: 'sre000h0' },
];

/**
 * Parsed data from a single CSV: Map<pointId, Map<timestamp, value>>
 */
type ParamData = Map<string, Map<string, number>>;

/**
 * Merged data for all params: Map<pointId, Map<timestamp, { speed, gust, dir, sun }>>
 */
export type MergedData = Map<string, Map<string, { speed: number; gust: number; dir: number; sun: number }>>;

/**
 * Fetch a single CSV with retry on 404 (tries now-2h, now-3h, now-4h).
 * Returns the CSV text and the UTC date that worked.
 */
async function fetchCsvWithRetry(param: MeteoParam): Promise<{ text: string; usedDate: Date }> {
  const candidates = getCsvCandidateDates();

  for (const candidateDate of candidates) {
    const url = buildMeteoUrl(param, candidateDate);
    const response = await fetch(url);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      // CSV is Latin1 encoded — decode via Node.js Buffer
      const text = Buffer.from(buffer).toString('latin1');
      return { text, usedDate: candidateDate };
    }
    if (response.status !== 404) {
      throw new Error(`MeteoSuisse CSV fetch failed for ${param}: HTTP ${response.status}`);
    }
  }

  throw new Error(`MeteoSuisse CSV not available for ${param} (tried 3 timestamps)`);
}

/**
 * Parse a single CSV text, filtering only the given point IDs.
 * Returns Map<pointId, Map<timestamp, value>>.
 */
function parseCsv(csvText: string, targetPointIds: Set<string>): ParamData {
  const result: ParamData = new Map();
  const lines = csvText.split('\n');

  // Skip header (line 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Fast check: extract point_id before first semicolon
    const s1 = line.indexOf(';');
    if (s1 === -1) continue;
    const pointId = line.substring(0, s1);
    if (!targetPointIds.has(pointId)) continue;

    // Parse remaining columns
    const s2 = line.indexOf(';', s1 + 1);
    const s3 = line.indexOf(';', s2 + 1);
    const timestamp = line.substring(s2 + 1, s3);
    const value = parseFloat(line.substring(s3 + 1)) || 0;

    let spotMap = result.get(pointId);
    if (!spotMap) {
      spotMap = new Map();
      result.set(pointId, spotMap);
    }
    spotMap.set(timestamp, value);
  }

  return result;
}

/**
 * Fetch and parse all 4 MétéoSuisse CSV parameters in parallel.
 * Returns merged data per spot per timestamp, and the CSV timestamp used.
 */
export async function fetchAllMeteoData(
  targetPointIds: Set<string>,
): Promise<{ data: MergedData; csvTimestamp: string }> {
  // Fetch all 4 CSVs in parallel
  const results = await Promise.all(
    METEO_PARAMS.map(async ({ key, param }) => {
      const { text, usedDate } = await fetchCsvWithRetry(param);
      const parsed = parseCsv(text, targetPointIds);
      return { key, parsed, usedDate };
    }),
  );

  // Use the first CSV's timestamp as the canonical one
  const csvTimestamp = results[0].usedDate;

  // Merge: for each pointId, for each timestamp, combine all 4 values
  const merged: MergedData = new Map();

  for (const { key, parsed } of results) {
    for (const [pointId, timestampMap] of parsed) {
      let spotMerged = merged.get(pointId);
      if (!spotMerged) {
        spotMerged = new Map();
        merged.set(pointId, spotMerged);
      }
      for (const [ts, value] of timestampMap) {
        let entry = spotMerged.get(ts);
        if (!entry) {
          entry = { speed: 0, gust: 0, dir: 0, sun: 0 };
          spotMerged.set(ts, entry);
        }
        entry[key] = value;
      }
    }
  }

  return {
    data: merged,
    csvTimestamp: `${csvTimestamp.getUTCFullYear()}${String(csvTimestamp.getUTCMonth() + 1).padStart(2, '0')}${String(csvTimestamp.getUTCDate()).padStart(2, '0')}${String(csvTimestamp.getUTCHours()).padStart(2, '0')}00`,
  };
}
