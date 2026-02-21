/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

// Workbox precaching — vite-plugin-pwa injects the manifest here
precacheAndRoute(self.__WB_MANIFEST);

// Runtime caching for Firestore API
registerRoute(
  /^https:\/\/firestore\.googleapis\.com/,
  new NetworkFirst({
    cacheName: 'firestore-cache',
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 3600 })],
    networkTimeoutSeconds: 10,
  }),
);

// Claim clients immediately on activate (replaces workbox clientsClaim option)
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Support skipWaiting from the client (used by UpdatePrompt via workbox-window)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// --- Push Notifications ---

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'Windspotter';
    const options: NotificationOptions = {
      body: payload.body || '',
      icon: '/pwa-192x192.png',
      badge: '/favicon-32.png',
      data: payload.data,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    // Fallback for plain text push
    event.waitUntil(
      self.registration.showNotification('Windspotter', {
        body: event.data.text(),
        icon: '/pwa-192x192.png',
        badge: '/favicon-32.png',
      }),
    );
  }
});

// Open app when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if any
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow('/');
    }),
  );
});
