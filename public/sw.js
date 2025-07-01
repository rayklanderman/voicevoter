// Voice Voter Service Worker
const CACHE_NAME = "voice-voter-v4";
const STATIC_CACHE = "voice-voter-static-v4";
const DYNAMIC_CACHE = "voice-voter-dynamic-v4";

// Assets to cache immediately
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker: Installing...");

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("📦 Service Worker: Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("✅ Service Worker: Installation complete");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("❌ Service Worker: Installation failed", error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("🚀 Service Worker: Activating...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log("🗑️ Service Worker: Deleting old cache", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("✅ Service Worker: Activation complete");
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip external API calls (let them go to network)
  if (
    url.origin !== location.origin &&
    !url.hostname.includes("supabase") &&
    !url.hostname.includes("elevenlabs") &&
    !url.hostname.includes("together")
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) {
        console.log("📱 Service Worker: Serving from cache", request.url);
        return cachedResponse;
      }

      // Otherwise fetch from network
      return fetch(request)
        .then((networkResponse) => {
          // Don't cache API responses or non-successful responses
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic" ||
            url.pathname.includes("/api/") ||
            url.hostname.includes("supabase") ||
            url.hostname.includes("elevenlabs") ||
            url.hostname.includes("together")
          ) {
            return networkResponse;
          }

          // Cache successful responses
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            console.log("💾 Service Worker: Caching new resource", request.url);
            cache.put(request, responseToCache);
          });

          return networkResponse;
        })
        .catch((error) => {
          console.error("🌐 Service Worker: Network request failed", error);

          // Return offline page for navigation requests
          if (request.destination === "document") {
            return caches.match("/index.html");
          }

          throw error;
        });
    })
  );
});

// Background sync for offline voting
self.addEventListener("sync", (event) => {
  if (event.tag === "background-vote") {
    console.log("🔄 Service Worker: Background sync for votes");
    event.waitUntil(syncVotes());
  }
});

// Push notifications for new questions
self.addEventListener("push", (event) => {
  console.log("📢 Service Worker: Push notification received");

  const options = {
    body: event.data ? event.data.text() : "New question available for voting!",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200],
    data: {
      url: "/",
    },
    actions: [
      {
        action: "vote",
        title: "Vote Now",
        icon: "/icon-192.png",
      },
      {
        action: "dismiss",
        title: "Later",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification("Voice Voter", options));
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("🔔 Service Worker: Notification clicked");

  event.notification.close();

  if (event.action === "vote") {
    event.waitUntil(clients.openWindow("/"));
  }
});

// Sync offline votes when back online
async function syncVotes() {
  try {
    // This would sync any offline votes stored in IndexedDB
    console.log("🔄 Service Worker: Syncing offline votes...");
    // Implementation would depend on offline storage strategy
  } catch (error) {
    console.error("❌ Service Worker: Vote sync failed", error);
  }
}
