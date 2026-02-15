// Pocket Market Service Worker — handles push notifications

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
