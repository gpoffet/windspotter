import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/** Get the active SW registration, with a timeout to avoid hanging forever. */
function getRegistration(timeoutMs = 5000): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
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

  // Check existing subscription on mount
  useEffect(() => {
    if (!supported || !user) {
      setLoading(false);
      setEnabled(false);
      return;
    }

    getRegistration()
      .then((reg) => (reg ? reg.pushManager.getSubscription() : null))
      .then((sub) => {
        setEnabled(sub !== null);
      })
      .catch(() => setEnabled(false))
      .finally(() => setLoading(false));
  }, [supported, user]);

  const enable = useCallback(async () => {
    if (!supported || !user || !VAPID_PUBLIC_KEY) return;
    setError(null);

    // Step 1: Request permission
    let perm: NotificationPermission;
    try {
      perm = await Notification.requestPermission();
    } catch {
      setError('Impossible de demander la permission.');
      return;
    }

    setPermission(perm);
    if (perm !== 'granted') {
      setError('Permission refusée.');
      return;
    }

    // Step 2: Get service worker
    const registration = await getRegistration();
    if (!registration) {
      setError('Service worker non disponible.');
      return;
    }

    // Step 3: Subscribe to push
    let subscription: PushSubscription;
    try {
      const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer as ArrayBuffer,
      });
    } catch (err) {
      console.error('pushManager.subscribe failed:', err);
      setError(`Échec de l'abonnement push: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    // Step 4: Store in Firestore
    try {
      await setDoc(doc(db, 'pushSubscriptions', user.uid), {
        subscription: subscription.toJSON(),
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error('Firestore write failed:', err);
      setError('Impossible de sauvegarder l\'abonnement.');
      return;
    }

    setEnabled(true);
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
