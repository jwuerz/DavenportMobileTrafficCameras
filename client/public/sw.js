
// Firebase Service Worker for handling push notifications
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Get Firebase config from environment or use defaults
const firebaseConfig = {
  apiKey: self.VITE_FIREBASE_API_KEY || "AIzaSyCapElwmFaE0C8ADqawdTePBaUYrgmTuKw",
  authDomain: self.VITE_FIREBASE_AUTH_DOMAIN || "davenport-camera-alerts.firebaseapp.com",
  projectId: self.VITE_FIREBASE_PROJECT_ID || "davenport-camera-alerts",
  storageBucket: self.VITE_FIREBASE_STORAGE_BUCKET || "davenport-camera-alerts.firebasestorage.app",
  messagingSenderId: self.VITE_FIREBASE_MESSAGING_SENDER_ID || "339062561251",
  appId: self.VITE_FIREBASE_APP_ID || "1:339062561251:web:0913ec30efe9de699928d6"
};

// Check if Firebase is already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

// Handle background messages (works on all platforms)
messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification?.title || '🚦 Camera Location Update';
  const notificationOptions = {
    body: payload.notification?.body || 'Traffic camera locations have been updated in Davenport',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'camera-update',
    requireInteraction: true,
    silent: false,
    vibrate: [200, 100, 200], // Android vibration pattern
    data: {
      url: payload.data?.url || '/',
      clickAction: payload.data?.clickAction || 'open_app',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'view_locations',
        title: 'View Locations',
        icon: '/favicon.ico'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/favicon.ico'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Service Worker lifecycle events
self.addEventListener('install', function(event) {
  console.log('Firebase Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Firebase Service Worker activating');
  event.waitUntil(self.clients.claim());
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  if (action === 'dismiss') {
    return;
  }

  let targetUrl = '/';
  if (action === 'view_locations') {
    targetUrl = '/#locations';
  } else if (data.url) {
    targetUrl = data.url;
  }

  // Focus existing window or open new one
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            action: action,
            url: targetUrl
          });
          return client.focus();
        }
      }
      
      // No existing window found, open new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle push events (fallback for browsers that don't support background messages)
self.addEventListener('push', function(event) {
  console.log('Push event received:', event);
  
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const notificationTitle = data.title || 'Camera Location Update';
  const notificationOptions = {
    body: data.body || 'Traffic camera locations have been updated',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'camera-update',
    requireInteraction: false, // Changed to false for better Android compatibility
    data: data.data || {},
    actions: [
      {
        action: 'view_locations',
        title: 'View Locations'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});
