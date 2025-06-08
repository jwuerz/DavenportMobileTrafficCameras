
// Firebase Service Worker for handling push notifications
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in service worker
const firebaseConfig = {
  apiKey: "AIzaSyCapElwmFaE0C8ADqawdTePBaUYrgmTuKw",
  authDomain: "davenport-camera-alerts.firebaseapp.com",
  projectId: "davenport-camera-alerts",
  storageBucket: "davenport-camera-alerts.firebasestorage.app",
  messagingSenderId: "339062561251",
  appId: "1:339062561251:web:0913ec30efe9de699928d6"
};

// Check if Firebase is already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Camera Location Update';
  const notificationOptions = {
    body: payload.notification?.body || 'Traffic camera locations have been updated',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'camera-update',
    requireInteraction: true,
    data: {
      url: payload.data?.url || '/',
      clickAction: payload.data?.clickAction || 'open_app'
    },
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
    requireInteraction: true,
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});
