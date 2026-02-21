import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/** Get the active SW registration, with a timeout to avoid hanging forever (e.g. in dev mode). */
function getRegistration(timeoutMs = 3000): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

interface UseNotificationsResult {
  /** Browser supports push notifications */
  supported: boolean;
  /** Current Notification permission state */
  permission: NotificationPermission | null;
  /** User has an active push subscription */
  enabled: boolean;
  /** Loading initial state */
  loading: boolean;
  /** Enable push notifications */
  enable: () => Promise<void>;
  /** Disable push notifications */
  disable: () => Promise<void>;
}

export function useNotifications(): UseNotificationsResult {
  const { user } = useAuth();
  const [supported] = useState(
    () => typeof window !== 'undefined' && 'PushManager' in window && 'serviceWorker' in navigator,
  );
  const [permission, setPermission] = useState<NotificationPermission | null>(
    () => (typeof Notification !== 'undefined' ? Notification.permission : null),
  );
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check existing subscription on mount
  useEffect(() => {
    if (!supported || !user) {
      setLoading(false);
      setEnabled(false);
      return;
    }

    getRegistration()
      .then((reg) => (reg ? reg.pushManager.getSubscription() : null))
      .then((sub) => setEnabled(sub !== null))
      .catch(() => setEnabled(false))
      .finally(() => setLoading(false));
  }, [supported, user]);

  const enable = useCallback(async () => {
    if (!supported || !user) return;

    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== 'granted') return;

    const registration = await getRegistration();
    if (!registration) {
      console.error('useNotifications: no active service worker');
      return;
    }

    const keyArray = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyArray.buffer as ArrayBuffer,
    });

    // Store subscription in Firestore
    await setDoc(doc(db, 'pushSubscriptions', user.uid), {
      subscription: subscription.toJSON(),
      updatedAt: new Date(),
    });

    setEnabled(true);
  }, [supported, user]);

  const disable = useCallback(async () => {
    if (!supported || !user) return;

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

    // Remove from Firestore
    try {
      await deleteDoc(doc(db, 'pushSubscriptions', user.uid));
    } catch {
      // Ignore delete errors
    }

    setEnabled(false);
  }, [supported, user]);

  return { supported, permission, enabled, loading, enable, disable };
}
