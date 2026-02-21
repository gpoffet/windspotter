import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { fetchAllMeteoData, type MergedData } from './meteo.js';
import { fetchAllWaterTemps } from './alplakes.js';
import { parseCsvTimestamp, toZurichDateStr, toLocalHour, dirText } from './utils.js';
import type {
  SpotConfig,
  NavigabilityConfig,
  SpotForecast,
  DayForecast,
  HourlyData,
} from './types.js';

// Admin functions
export { listUsers, deleteUser } from './admin.js';

// Notifications
export { sendDailyNotifications, sendTestNotification } from './notifications.js';

initializeApp();
const db = getFirestore();

const LOCK_DOC = 'forecasts/_lock';
const FORECAST_DOC = 'forecasts/latest';
const LOCK_TTL_MS = 2 * 60 * 1000; // 2 minutes
const LOCK_WAIT_MS = 5000; // 5 seconds
const DATA_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Callable Cloud Function: refreshForecast
 * Fetches MétéoSuisse CSVs + Alplakes water temps, computes navigability,
 * and writes the result to Firestore.
 */
export const refreshForecast = onCall(
  {
    region: 'europe-west6',
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (request) => {
    const force = request.data?.force === true;

    // Step 0: Read config from Firestore
    const [spotsSnap, navSnap] = await Promise.all([
      db.doc('config/spots').get(),
      db.doc('config/navigability').get(),
    ]);

    if (!spotsSnap.exists || !navSnap.exists) {
      throw new HttpsError('failed-precondition', 'Config documents missing in Firestore');
    }

    const spotsConfig = spotsSnap.data()!.spots as SpotConfig[];
    const navConfig = navSnap.data() as NavigabilityConfig;

    // Step 1: Check if current data is still fresh (skip if forced)
    if (!force) {
      const existingSnap = await db.doc(FORECAST_DOC).get();
      if (existingSnap.exists) {
        const data = existingSnap.data()!;
        const updatedAt = data.updatedAt as Timestamp;
        if (Date.now() - updatedAt.toMillis() < DATA_TTL_MS) {
          return { status: 'fresh', message: 'Data is still fresh' };
        }
      }
    }

    // Step 2: Acquire lock
    const lockAcquired = await acquireLock();
    if (!lockAcquired) {
      // Another function is refreshing — wait and return existing data
      await sleep(LOCK_WAIT_MS);
      const snap = await db.doc(FORECAST_DOC).get();
      if (snap.exists) {
        return { status: 'waited', message: 'Another refresh was in progress' };
      }
      throw new HttpsError('unavailable', 'Refresh in progress, please retry');
    }

    try {
      // Step 3: Fetch all data
      const targetPointIds = new Set(spotsConfig.map((s) => s.pointId));
      const uniqueLakes = [...new Set(spotsConfig.map((s) => s.alplakesKey))];

      const [meteoResult, waterTemps] = await Promise.all([
        fetchAllMeteoData(targetPointIds),
        fetchAllWaterTemps(uniqueLakes),
      ]);

      // Step 4: Build forecast for each spot
      const spots: SpotForecast[] = spotsConfig.map((spot) =>
        buildSpotForecast(spot, meteoResult.data, waterTemps, navConfig),
      );

      // Step 5: Write to Firestore
      await db.doc(FORECAST_DOC).set({
        updatedAt: FieldValue.serverTimestamp(),
        csvTimestamp: meteoResult.csvTimestamp,
        spots,
      });

      return { status: 'refreshed', message: 'Forecast data updated' };
    } finally {
      // Step 6: Release lock
      await releaseLock();
    }
  },
);

/**
 * Build the SpotForecast object for a single spot.
 */
function buildSpotForecast(
  spot: SpotConfig,
  meteoData: MergedData,
  waterTemps: Map<string, { current: number | null; depth: number }>,
  navConfig: NavigabilityConfig,
): SpotForecast {
  const spotData = meteoData.get(spot.pointId);
  const waterTemp = waterTemps.get(spot.alplakesKey) ?? { current: null, depth: 1 };

  // Group hourly data by local date
  const dayMap = new Map<string, HourlyData[]>();

  if (spotData) {
    for (const [ts, values] of spotData) {
      const utcDate = parseCsvTimestamp(ts);
      const localDate = toZurichDateStr(utcDate, navConfig.timezone);
      const localHour = toLocalHour(utcDate, navConfig.timezone);

      const hourly: HourlyData = {
        hour: localHour,
        speed: Math.round(values.speed * 10) / 10,
        gust: Math.round(values.gust * 10) / 10,
        dir: Math.round(values.dir),
        dirText: dirText(values.dir),
        sun: Math.round(values.sun),
      };

      let dayHours = dayMap.get(localDate);
      if (!dayHours) {
        dayHours = [];
        dayMap.set(localDate, dayHours);
      }
      dayHours.push(hourly);
    }
  }

  // Sort dates and build DayForecast objects
  const sortedDates = [...dayMap.keys()].sort();
  const days: DayForecast[] = sortedDates.map((date) => {
    const hourly = dayMap.get(date)!.sort((a, b) => a.hour - b.hour);

    // Filter to display window
    const dayWindowHours = hourly.filter(
      (h) => h.hour >= navConfig.dayStartHour && h.hour < navConfig.dayEndHour,
    );

    // Sum sunshine (minutes) for hours in the day window, convert to hours
    const sunshineMinutes = dayWindowHours.reduce((sum, h) => sum + h.sun, 0);
    const sunshine = Math.round((sunshineMinutes / 60) * 10) / 10;

    return {
      date,
      sunshine,
      isNavigable: false,
      slots: [],
      hourly: dayWindowHours,
    };
  });

  return {
    name: spot.name,
    pointId: spot.pointId,
    npa: spot.npa,
    lat: spot.lat,
    lon: spot.lon,
    lake: spot.lake,
    waterTemp,
    days,
  };
}

/**
 * Try to acquire a Firestore lock. Returns true if lock acquired.
 */
async function acquireLock(): Promise<boolean> {
  try {
    const lockRef = db.doc(LOCK_DOC);
    const lockSnap = await lockRef.get();

    if (lockSnap.exists) {
      const lockData = lockSnap.data()!;
      const lockedAt = lockData.lockedAt as Timestamp;

      if (Date.now() - lockedAt.toMillis() < LOCK_TTL_MS) {
        // Lock is still valid — another function is working
        return false;
      }

      // Lock is stale — delete it and try again
      await lockRef.delete();
    }

    // Try to create the lock
    await lockRef.create({
      lockedAt: FieldValue.serverTimestamp(),
    });
    return true;
  } catch {
    // create() throws if doc already exists (race condition)
    return false;
  }
}

/**
 * Release the Firestore lock.
 */
async function releaseLock(): Promise<void> {
  try {
    await db.doc(LOCK_DOC).delete();
  } catch {
    // Ignore errors during lock release
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
