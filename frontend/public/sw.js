// Pocket Market Service Worker

// ── Install & activate ──────────────────────────────────────────────────────
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(clients.claim()));

// ── Fetch handler (required for PWA installability) ─────────────────────────
// Strategy: network-first for everything, skip non-GET and API calls.
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/api/")) return;
  // Let the browser handle normally — just having this handler satisfies Chrome's PWA requirement
  // without breaking anything. Cache-heavy strategies can be added later.
  event.respondWith(fetch(event.request));
});

// ── Push notifications ───────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const options = {
      body: data.body || "",
      icon: "/pocketmarket_favicon_transparent_128x128.png",
      badge: "/pocketmarket_favicon_transparent_32x32.png",
      tag: data.tag || "default",
      data: { url: data.url || "/" },
    };
    event.waitUntil(self.registration.showNotification(data.title || "Pocket Market", options));
  } catch {}
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
