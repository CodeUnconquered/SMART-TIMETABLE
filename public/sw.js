/**
 * Service Worker for Smart Remind — Automated Background Reminders & Offline Support
 */

const CACHE_NAME = 'smart-remind-v5';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png'
];

const IDB_NAME = 'SmartRemindBackgroundDB';
const IDB_STORE = 'scheduled_reminders';
const IDB_VERSION = 1;

// Helper to open IndexedDB in Service Worker
function openRemindersDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get all scheduled reminders from IndexedDB
async function getAllScheduledReminders() {
  try {
    const db = await openRemindersDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn('[SW-IDB] Failed to read reminders:', err);
    return [];
  }
}

// Save all scheduled reminders (replacing current set, preserving already-triggered states)
async function saveScheduledReminders(reminders) {
  try {
    const db = await openRemindersDB();
    const existing = await getAllScheduledReminders();
    const triggeredIds = new Set(existing.filter((e) => e.triggered).map((e) => e.id));

    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.clear();
      reminders.forEach((r) => {
        if (triggeredIds.has(r.id)) {
          r.triggered = true;
        }
        store.put(r);
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('[SW-IDB] Failed to save reminders:', err);
    return false;
  }
}

// Mark a reminder as triggered to avoid duplicate notifications
async function markReminderTriggered(reminderId) {
  try {
    const db = await openRemindersDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const getReq = store.get(reminderId);
      getReq.onsuccess = () => {
        if (getReq.result) {
          const item = getReq.result;
          item.triggered = true;
          item.triggeredAt = Date.now();
          store.put(item);
        }
      };
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    // ignore
  }
}

// Check and trigger any due background reminders
async function checkDueReminders() {
  const now = Date.now();
  const reminders = await getAllScheduledReminders();

  for (const reminder of reminders) {
    // Only fire if not triggered, target time is in the past, and not older than 30 minutes
    if (
      !reminder.triggered &&
      reminder.triggerAtTime <= now &&
      now - reminder.triggerAtTime < 30 * 60 * 1000
    ) {
      console.log('[SW] Firing background reminder for:', reminder.title);

      const notificationOptions = {
        body: reminder.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: reminder.id, // Enforces deduplication on OS level
        renotify: true,
        vibrate: [300, 150, 300, 150, 400],
        data: {
          url: '/',
          reminderId: reminder.id
        },
        actions: [
          { action: 'view', title: 'Open Schedule' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      };

      try {
        await self.registration.showNotification(reminder.title, notificationOptions);
        await markReminderTriggered(reminder.id);
      } catch (err) {
        console.warn('[SW] showNotification error:', err);
      }
    }
  }
}

// Install: Cache critical static shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-caching some assets failed:', err);
      });
    })
  );
});

// Activate: Evict older caches immediately and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purging outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()).then(() => checkDueReminders())
  );
});

// Periodic background check timer inside Service Worker
setInterval(() => {
  checkDueReminders();
}, 15000);

// Fetch: Strategy for API is Network-first with Cache fallback; for static is Cache-first
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // CRITICAL: NEVER intercept or cache development Vite scripts or module requests
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.includes('vite') ||
    url.search.includes('v=') ||
    url.search.includes('__aistudio') ||
    url.search.includes('token=') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Check reminders on active fetch requests as well
  checkDueReminders();

  // API calls: Network first, save to cache if successful, fallback to cached JSON
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response(
            JSON.stringify({
              offline: true,
              message: 'Offline mode: You are viewing locally cached Smart Remind schedule data.'
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // Navigation (HTML document requests): Network first, fallback to cached shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return networkRes;
        })
        .catch(() => {
          return caches.match('/') || caches.match('/index.html');
        })
    );
    return;
  }

  // Static assets: Cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((networkRes) => {
        if (
          networkRes &&
          networkRes.status === 200 &&
          !url.protocol.startsWith('chrome-extension')
        ) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return networkRes;
      });
    })
  );
});

// Listen for message events from client (Schedule Sync, Cancel, etc.)
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SYNC_SCHEDULED_REMINDERS') {
    const reminders = event.data.reminders || [];
    saveScheduledReminders(reminders).then(() => {
      console.log('[SW] Synced', reminders.length, 'scheduled reminders to IndexedDB');
      checkDueReminders();
    });
  }

  if (event.data.type === 'TRIGGER_CHECK') {
    checkDueReminders();
  }
});

// Periodic Background Sync if available on modern Chromium/Android
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'smart-remind-sync') {
    event.waitUntil(checkDueReminders());
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'smart-remind-sync') {
    event.waitUntil(checkDueReminders());
  }
});

// Web Push Notification Handling
self.addEventListener('push', (event) => {
  let data = {
    title: 'Smart Remind Notification',
    body: 'Your scheduled academic session is starting soon.',
    tag: 'smart-remind-alert',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'smart-remind-alert',
    renotify: true,
    vibrate: [300, 150, 300, 150, 300],
    data: data.data || { url: '/' },
    actions: [
      { action: 'view', title: 'Open Schedule' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
