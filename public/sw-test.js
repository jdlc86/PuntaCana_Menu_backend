self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data?.json?.() || {}; } catch (e) {}
  const title = data.title || "Alerta";
  const options = {
    body: data.body || "",
    tag: data.tag || "alert-test",
    data: data.data || {},
    // icon/badge opcionales: deben ser URLs válidas de tu dominio
    // icon: "/icons/icon-192.png",
    // badge: "/icons/badge.png",
    requireInteraction: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Enfoca pestaña si ya está abierta
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      // O abre nueva
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
