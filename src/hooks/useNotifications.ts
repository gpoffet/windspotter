import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

/**
 * Key used to track an in-progress subscription attempt across component
 * unmount/remount cycles (happens on mobile when the OS permission dialog
 * takes focus away from the PWA).
 */
const PENDING_SUBSCRIBE_KEY = 'windspotter_push_pending';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/** Get the active SW registration, with a timeout to avoid hanging forever. */
function getRegistration(timeoutMs = 8000): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

/**
 * Subscribe to push and persist in Firestore.
 * Extracted so it can be called both from enable() and from the "resume" path.
 * Returns an error message on failure, or null on success.
 */
async function subscribePush(uid: string): Promise<string | null> {
  if (!VAPID_PUBLIC_KEY) return 'Clé VAPID manquante.';

  const registration = await getRegistration();
  if (!registration) return 'Service worker non disponible.';

  // Check if already subscribed
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    // Already subscribed — just make sure Firestore has the subscription
    try {
      await setDoc(doc(db, 'pushSubscriptions', uid), {
        subscription: existing.toJSON(),
        updatedAt: new Date(),
      });
    } catch {
      // Not critical — subscription works even if Firestore write fails here
    }
    return null;
  }

  let subscription: PushSubscription;
  try {
    const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appServerKey.buffer as ArrayBuffer,
    });
  } catch (err) {
    console.error('pushManager.subscribe failed:', err);
    return `Échec de l'abonnement push: ${err instanceof Error ? err.message : String(err)}`;
  }

  try {
    await setDoc(doc(db, 'pushSubscriptions', uid), {
      subscription: subscription.toJSON(),
      updatedAt: new Date(),
    });
  } catch (err) {
    console.error('Firestore write failed:', err);
    return "Impossible de sauvegarder l'abonnement.";
  }

  return null;
}

interface UseNotificationsResult {
  supported: boolean;
  permission: NotificationPermission | null;
  enabled: boolean;
  loading: boolean;
  error: string | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

export function useNotifications(): UseNotificationsResult {
  const { user } = useAuth();
  const [supported] = useState(
    () =>
      typeof window !== 'undefined' &&
      'PushManager' in window &&
      'serviceWorker' in navigator &&
      'Notification' in window &&
      !!VAPID_PUBLIC_KEY,
  );
  const [permission, setPermission] = useState<NotificationPermission | null>(
    () => (typeof Notification !== 'undefined' ? Notification.permission : null),
  );
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Check existing subscription on mount — and resume interrupted enable() if needed
  useEffect(() => {
    if (!supported || !user) {
      setLoading(false);
      setEnabled(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const hasPending = localStorage.getItem(PENDING_SUBSCRIBE_KEY) === 'true';

        // If permission was granted while the component was unmounted (mobile flow),
        // complete the subscription now.
        if (hasPending && Notification.permission === 'granted') {
          localStorage.removeItem(PENDING_SUBSCRIBE_KEY);
          const err = await subscribePush(user.uid);
          if (!cancelled) {
            if (err) {
              setError(err);
              setEnabled(false);
            } else {
              setEnabled(true);
            }
          }
        } else {
          if (hasPending) localStorage.removeItem(PENDING_SUBSCRIBE_KEY);
          // Normal check: see if a push subscription already exists
          const reg = await getRegistration();
          const sub = reg ? await reg.pushManager.getSubscription() : null;
          if (!cancelled) setEnabled(sub !== null);
        }
      } catch {
        if (!cancelled) setEnabled(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [supported, user]);

  const enable = useCallback(async () => {
    if (!supported || !user || !VAPID_PUBLIC_KEY) return;
    setError(null);

    // Mark the subscription attempt as pending BEFORE requesting permission.
    // If the mobile OS permission dialog causes the component to unmount,
    // the next mount will resume the flow.
    localStorage.setItem(PENDING_SUBSCRIBE_KEY, 'true');

    // Step 1: Request permission
    let perm: NotificationPermission;
    try {
      perm = await Notification.requestPermission();
    } catch {
      localStorage.removeItem(PENDING_SUBSCRIBE_KEY);
      if (mountedRef.current) setError('Impossible de demander la permission.');
      return;
    }

    if (mountedRef.current) setPermission(perm);
    if (perm !== 'granted') {
      localStorage.removeItem(PENDING_SUBSCRIBE_KEY);
      if (mountedRef.current) setError('Permission refusée.');
      return;
    }

    // Step 2-4: Subscribe and store
    const err = await subscribePush(user.uid);
    localStorage.removeItem(PENDING_SUBSCRIBE_KEY);

    if (mountedRef.current) {
      if (err) {
        setError(err);
      } else {
        setEnabled(true);
      }
    }
  }, [supported, user]);

  const disable = useCallback(async () => {
    if (!supported || !user) return;
    setError(null);

    try {
      const registration = await getRegistration();
      const subscription = registration
        ? await registration.pushManager.getSubscription()
        : null;
      if (subscription) {
        await subscription.unsubscribe();
      }
    } catch {
      // Ignore unsubscribe errors
    }

    try {
      await deleteDoc(doc(db, 'pushSubscriptions', user.uid));
    } catch {
      // Ignore delete errors
    }

    setEnabled(false);
  }, [supported, user]);

  return { supported, permission, enabled, loading, error, enable, disable };
}
