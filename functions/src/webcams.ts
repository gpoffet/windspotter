import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

const WINDY_API_KEY = defineSecret('WINDY_API_KEY');
const WINDY_API_BASE = 'https://api.windy.com/webcams/api/v3/webcams';

interface SearchWebcamsInput {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}

interface WebcamSearchResult {
  webcamId: string;
  title: string;
  city: string;
  latitude: number;
  longitude: number;
  thumbnailUrl: string;
  previewUrl: string;
  categories: string[];
  hasLive: boolean;
}

interface GetWebcamPlayerInput {
  webcamIds: string[];
}

interface WebcamPlayerResult {
  webcamId: string;
  title: string;
  playerUrl: string;
  livePlayerUrl?: string;
  previewUrl: string;
  windyPageUrl: string;
}

/**
 * Callable Cloud Function: searchWebcams
 * Searches for webcams near a location using the Windy Webcams API. Admin only.
 */
export const searchWebcams = onCall(
  {
    region: 'europe-west6',
    secrets: [WINDY_API_KEY],
  },
  async (request) => {
    if (!request.auth?.token.admin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { latitude, longitude, radiusKm = 15 } = request.data as SearchWebcamsInput;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new HttpsError('invalid-argument', 'latitude and longitude are required numbers');
    }

    const url = `${WINDY_API_BASE}?nearby=${latitude},${longitude},${radiusKm}&include=images,location,categories&limit=10&lang=fr`;

    const res = await fetch(url, {
      headers: { 'x-windy-api-key': WINDY_API_KEY.value() },
    });

    if (!res.ok) {
      throw new HttpsError('internal', `Windy API error: ${res.status}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const rawWebcams = (data.webcams ?? []) as Array<Record<string, unknown>>;
    const webcams: WebcamSearchResult[] = rawWebcams.map((w) => {
      const images = w.images as Record<string, Record<string, string>> | undefined;
      const location = w.location as Record<string, unknown> | undefined;
      const categories = w.categories as Array<Record<string, string>> | undefined;
      const player = w.player as Record<string, unknown> | undefined;

      return {
        webcamId: String(w.webcamId ?? w.id ?? ''),
        title: String(w.title ?? ''),
        city: String(location?.city ?? ''),
        latitude: Number(location?.latitude ?? 0),
        longitude: Number(location?.longitude ?? 0),
        thumbnailUrl: images?.current?.thumbnail ?? '',
        previewUrl: images?.current?.preview ?? '',
        categories: categories?.map((c) => c.name) ?? [],
        hasLive: !!player?.live,
      };
    });

    return { webcams };
  },
);

/**
 * Callable Cloud Function: getWebcamPlayer
 * Returns player URLs for given webcam IDs. Requires authentication.
 */
export const getWebcamPlayer = onCall(
  {
    region: 'europe-west6',
    secrets: [WINDY_API_KEY],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { webcamIds } = request.data as GetWebcamPlayerInput;

    if (!Array.isArray(webcamIds) || webcamIds.length === 0 || webcamIds.length > 3) {
      throw new HttpsError('invalid-argument', 'webcamIds must be an array of 1-3 IDs');
    }

    const url = `${WINDY_API_BASE}?webcamIds=${webcamIds.join(',')}&include=images,player,urls`;

    const res = await fetch(url, {
      headers: { 'x-windy-api-key': WINDY_API_KEY.value() },
    });

    if (!res.ok) {
      throw new HttpsError('internal', `Windy API error: ${res.status}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const rawWebcams = (data.webcams ?? []) as Array<Record<string, unknown>>;
    const webcams: WebcamPlayerResult[] = rawWebcams.map((w) => {
      const player = w.player as Record<string, Record<string, string>> | undefined;
      const images = w.images as Record<string, Record<string, string>> | undefined;
      const urls = w.urls as Record<string, string> | undefined;

      return {
        webcamId: String(w.webcamId ?? w.id ?? ''),
        title: String(w.title ?? ''),
        playerUrl: player?.day?.embed ?? `https://webcams.windy.com/webcams/public/embed/player/${w.webcamId ?? w.id}/day`,
        livePlayerUrl: player?.live?.embed || undefined,
        previewUrl: images?.current?.preview ?? '',
        windyPageUrl: urls?.detail ?? `https://www.windy.com/webcams/${w.webcamId ?? w.id}`,
      };
    });

    return { webcams };
  },
);
