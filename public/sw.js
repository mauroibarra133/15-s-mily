const CACHE_NAME = "mily-invitation-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/?skipEnvelope=true",
  "/favicon.ico",
  "/pwa-icon.png",
  "/assets/camera.png",
  "/assets/ig-fondo.png",
  "/assets/mily-portrait.png",
  "/assets/sobre-cerrado.png",
  "/assets/tulipanes-azules.png",
  "/assets/upload.png",
  "/assets/wand-sparkles-solid-full.svg",
  "/assets/song.mp3",
  "/assets/dress-code-damas.jpeg",
  "/assets/dress-code-damas-2.jpeg",
  "/assets/dress-code-hombres.jpeg",
  "/assets/dress-code-hombres-2.jpeg",
];

// Install: pre-cache critical assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Exclude non-GET, Next.js build chunks/HMR, Supabase database endpoints, and /admin route
  if (
    event.request.method !== "GET" ||
    url.pathname.startsWith("/api") ||
    url.pathname.includes("/_next/") ||
    url.pathname.startsWith("/admin") ||
    url.hostname.includes("supabase")
  ) {
    return;
  }

  // Check if it's a static asset
  const isAsset =
    url.pathname.startsWith("/assets/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".mp3") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".ico");

  if (isAsset) {
    // Cache First, fallback to Network
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Silence fetch errors for offline
          });
      })
    );
  } else {
    // Network First, fallback to Cache (pages like / or /pagar)
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }
});

// Push event listener: receive push notification payloads
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "Nuevo Pago", body: event.data.text() };
    }
  }

  const options = {
    body: data.body || "Se ha recibido un nuevo comprobante.",
    icon: "/pwa-icon.png",
    badge: "/pwa-icon.png",
    vibrate: [100, 50, 100],
    data: {
      url: "/admin",
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Notificación de Pago", options)
  );
});

// Notification click event listener: open admin panel
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      // If an admin window is already open, focus it
      for (const client of clientList) {
        const url = new URL(client.url);
        if (url.pathname === "/admin" && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow("/admin");
      }
    })
  );
});

