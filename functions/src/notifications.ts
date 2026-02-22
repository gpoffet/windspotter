import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import webpush from 'web-push';
import { calculateSlots } from './navigability.js';
import type {
  SpotConfig,
  NavigabilityConfig,
  SpotForecast,
  NavigableSlot,
} from './types.js';

const VAPID_PUBLIC_KEY = defineSecret('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = defineSecret('VAPID_PRIVATE_KEY');

const DEFAULT_NOTIFICATION_HOUR = 8;

interface UserPreferences {
  windSpeedMin: number;
  gustMin: number;
  selectedSpots?: string[];
}

interface PushSubscriptionDoc {
  subscription: webpush.PushSubscription;
  updatedAt: FirebaseFirestore.Timestamp;
}

interface NavigableSpotInfo {
  name: string;
  slots: NavigableSlot[];
}

/** Initialize web-push with VAPID credentials. */
function initWebPush() {
  webpush.setVapidDetails(
    'mailto:notifications@windspotter.app',
    VAPID_PUBLIC_KEY.value(),
    VAPID_PRIVATE_KEY.value(),
  );
}

/**
 * Scheduled function: sends daily morning push notifications.
 * Runs every hour from 6–9 AM Europe/Zurich.
 * Only proceeds if the current hour matches the configured notification hour.
 */
export const sendDailyNotifications = onSchedule(
  {
    schedule: '0 6,7,8,9 * * *',
    timeZone: 'Europe/Zurich',
    region: 'europe-west6',
    memory: '256MiB',
    timeoutSeconds: 60,
    secrets: [VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY],
  },
  async () => {
    const db = getFirestore();

    // Check if current hour matches configured notification hour
    const notifSnap = await db.doc('config/notifications').get();
    const configuredHour = notifSnap.exists
      ? (notifSnap.data()!.hour as number ?? DEFAULT_NOTIFICATION_HOUR)
      : DEFAULT_NOTIFICATION_HOUR;

    const currentHour = parseInt(
      new Date().toLocaleString('en-GB', {
        timeZone: 'Europe/Zurich',
        hour: '2-digit',
        hour12: false,
      }),
    );

    if (currentHour !== configuredHour) {
      console.log(`Current hour ${currentHour} != configured ${configuredHour}, skipping`);
      return;
    }

    initWebPush();
    await sendNotificationsToAll(db);
  },
);

/**
 * Callable function: sends a test notification to the calling user.
 * Admin only.
 */
export const sendTestNotification = onCall(
  {
    region: 'europe-west6',
    secrets: [VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY],
  },
  async (request) => {
    if (!request.auth?.token.admin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const uid = request.auth.uid;
    const db = getFirestore();

    const subSnap = await db.doc(`pushSubscriptions/${uid}`).get();
    if (!subSnap.exists) {
      throw new HttpsError(
        'failed-precondition',
        'Aucune souscription push trouvée. Active les notifications dans les paramètres.',
      );
    }

    const subData = subSnap.data() as PushSubscriptionDoc;
    const endpoint = subData.subscription?.endpoint ?? 'missing';

    // Reject obviously invalid endpoints before trying to send
    if (!endpoint.startsWith('https://') || endpoint.includes('invalid')) {
      console.error(`Invalid endpoint for user ${uid}: ${endpoint}`);
      await subSnap.ref.delete();
      throw new HttpsError(
        'failed-precondition',
        `Souscription invalide (${endpoint}). Désactive puis réactive les notifications.`,
      );
    }

    initWebPush();

    try {
      await webpush.sendNotification(
        subData.subscription,
        JSON.stringify({
          title: 'Test Windspotter',
          body: 'Si tu vois cette notification, tout fonctionne !',
        }),
      );
      return { success: true };
    } catch (err: unknown) {
      console.error(`sendTestNotification failed for ${uid} (endpoint: ${endpoint}):`, err);
      const statusCode = (err as { statusCode?: number }).statusCode;
      const body = (err as { body?: string }).body;
      if (statusCode === 410 || statusCode === 404) {
        await subSnap.ref.delete();
        throw new HttpsError(
          'failed-precondition',
          'Souscription expirée. Réactive les notifications dans les paramètres.',
        );
      }
      const detail = statusCode
        ? `HTTP ${statusCode}${body ? ': ' + body : ''}`
        : (err instanceof Error ? err.message : String(err));
      throw new HttpsError('internal', `Échec de l'envoi (${endpoint.slice(0, 60)}…): ${detail}`);
    }
  },
);

/**
 * Core logic: send notifications to all subscribed users.
 */
async function sendNotificationsToAll(db: FirebaseFirestore.Firestore) {
  const [navSnap, spotsSnap, forecastSnap, subsSnap] = await Promise.all([
    db.doc('config/navigability').get(),
    db.doc('config/spots').get(),
    db.doc('forecasts/latest').get(),
    db.collection('pushSubscriptions').get(),
  ]);

  if (!navSnap.exists || !spotsSnap.exists || !forecastSnap.exists) {
    console.log('Missing config or forecast data, skipping notifications');
    return;
  }

  if (subsSnap.empty) {
    console.log('No push subscriptions, skipping');
    return;
  }

  const globalNav = navSnap.data() as NavigabilityConfig;
  const spotsConfig = spotsSnap.data()!.spots as SpotConfig[];
  const forecastSpots = forecastSnap.data()!.spots as SpotForecast[];

  const forecastByPointId = new Map<string, SpotForecast>();
  for (const spot of forecastSpots) {
    forecastByPointId.set(spot.pointId, spot);
  }

  const spotNameByPointId = new Map<string, string>();
  const allPointIds = new Set<string>();
  for (const s of spotsConfig) {
    spotNameByPointId.set(s.pointId, s.name);
    allPointIds.add(s.pointId);
  }

  const todayStr = new Date().toLocaleDateString('sv-SE', {
    timeZone: globalNav.timezone,
  });

  const tasks = subsSnap.docs.map(async (subDoc) => {
    const uid = subDoc.id;
    const subData = subDoc.data() as PushSubscriptionDoc;

    try {
      const prefsSnap = await db
        .doc(`users/${uid}/settings/preferences`)
        .get();

      const prefs: UserPreferences = prefsSnap.exists
        ? (prefsSnap.data() as UserPreferences)
        : { windSpeedMin: 15, gustMin: 25 };

      const effectiveNav: NavigabilityConfig = {
        ...globalNav,
        windSpeedMin: prefs.windSpeedMin,
        gustMin: prefs.gustMin,
      };

      const selectedPointIds =
        prefs.selectedSpots && prefs.selectedSpots.length > 0
          ? prefs.selectedSpots
          : [...allPointIds];

      const navigableSpots: NavigableSpotInfo[] = [];

      for (const pointId of selectedPointIds) {
        const forecast = forecastByPointId.get(pointId);
        if (!forecast) continue;

        const todayForecast = forecast.days.find((d) => d.date === todayStr);
        if (!todayForecast) continue;

        const slots = calculateSlots(todayForecast.hourly, effectiveNav);
        if (slots.length > 0) {
          navigableSpots.push({
            name: spotNameByPointId.get(pointId) || forecast.name,
            slots,
          });
        }
      }

      if (navigableSpots.length === 0) return;

      const payload = buildNotificationPayload(navigableSpots);
      await webpush.sendNotification(
        subData.subscription,
        JSON.stringify(payload),
      );
      console.log(`Notification sent to user ${uid}: ${navigableSpots.length} spots`);
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 410 || statusCode === 404) {
        console.log(`Removing expired subscription for user ${uid}`);
        await subDoc.ref.delete();
      } else {
        console.error(`Failed to send notification to user ${uid}:`, err);
      }
    }
  });

  await Promise.all(tasks);
  console.log('Daily notifications processing complete');
}

function buildNotificationPayload(spots: NavigableSpotInfo[]): {
  title: string;
  body: string;
} {
  const MAX_SPOTS = 4;
  const displayed = spots.slice(0, MAX_SPOTS);
  const remaining = spots.length - MAX_SPOTS;

  const lines = displayed.map((spot) => {
    const slotTexts = spot.slots.map((s) =>
      `${s.avgSpeed}-${s.avgGust} km/h ${s.direction} (${s.start}h-${s.end}h)`,
    );
    return `${spot.name}: ${slotTexts.join(' / ')}`;
  });

  if (remaining > 0) {
    lines.push(`... et ${remaining} autre${remaining > 1 ? 's' : ''}`);
  }

  return {
    title: `Du vent aujourd'hui !`,
    body: lines.join('\n'),
  };
}
