import { onSchedule } from 'firebase-functions/v2/scheduler';
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

/**
 * Scheduled function: sends daily morning push notifications.
 * Runs at 08:00 Europe/Zurich every day.
 */
export const sendDailyNotifications = onSchedule(
  {
    schedule: '0 8 * * *',
    timeZone: 'Europe/Zurich',
    region: 'europe-west6',
    memory: '256MiB',
    timeoutSeconds: 60,
    secrets: [VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY],
  },
  async () => {
    const db = getFirestore();

    // Step 1: Read all required data in parallel
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
    const spotsConfig = (spotsSnap.data()!.spots as SpotConfig[]);
    const forecastSpots = forecastSnap.data()!.spots as SpotForecast[];

    // Build a map of pointId → SpotForecast for quick lookup
    const forecastByPointId = new Map<string, SpotForecast>();
    for (const spot of forecastSpots) {
      forecastByPointId.set(spot.pointId, spot);
    }

    // Build a map of pointId → SpotConfig name
    const spotNameByPointId = new Map<string, string>();
    const allPointIds = new Set<string>();
    for (const s of spotsConfig) {
      spotNameByPointId.set(s.pointId, s.name);
      allPointIds.add(s.pointId);
    }

    // Identify today's date in Zurich timezone
    const todayStr = new Date().toLocaleDateString('sv-SE', {
      timeZone: globalNav.timezone,
    });

    // Configure web-push
    webpush.setVapidDetails(
      'mailto:notifications@windspotter.app',
      VAPID_PUBLIC_KEY.value(),
      VAPID_PRIVATE_KEY.value(),
    );

    // Step 2: Process each subscription
    const tasks = subsSnap.docs.map(async (subDoc) => {
      const uid = subDoc.id;
      const subData = subDoc.data() as PushSubscriptionDoc;

      try {
        // Read user preferences
        const prefsSnap = await db
          .doc(`users/${uid}/settings/preferences`)
          .get();

        const prefs: UserPreferences = prefsSnap.exists
          ? (prefsSnap.data() as UserPreferences)
          : { windSpeedMin: 15, gustMin: 25 };

        // Build effective navigability config with user overrides
        const effectiveNav: NavigabilityConfig = {
          ...globalNav,
          windSpeedMin: prefs.windSpeedMin,
          gustMin: prefs.gustMin,
        };

        // Determine which spots to check
        const selectedPointIds =
          prefs.selectedSpots && prefs.selectedSpots.length > 0
            ? prefs.selectedSpots
            : [...allPointIds];

        // Check navigability for each selected spot today
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

        // Only send if there are navigable spots
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
          // Subscription expired or invalid — clean up
          console.log(`Removing expired subscription for user ${uid}`);
          await subDoc.ref.delete();
        } else {
          console.error(`Failed to send notification to user ${uid}:`, err);
        }
      }
    });

    await Promise.all(tasks);
    console.log('Daily notifications processing complete');
  },
);

/**
 * Build the notification payload from navigable spots.
 */
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
