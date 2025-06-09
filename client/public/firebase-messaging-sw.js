// Firebase Messaging Service Worker
// This file is required by Firebase Cloud Messaging

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Default configuration for development mode
let firebaseConfig = {
  apiKey: "development-mode",
  authDomain: "development-mode",
  projectId: "development-mode",
  storageBucket: "development-mode",
  messagingSenderId: "development-mode",
  appId: "development-mode"
};

// Listen for configuration from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    console.log('Received Firebase config in service worker');
    firebaseConfig = event.data.config;
    
    // Reinitialize Firebase with new config
    if (firebase.apps.length > 0) {
      firebase.app().delete().then(() => {
        firebase.initializeApp(firebaseConfig);
        console.log('Firebase reinitialized with production config');
      });
    } else {
      firebase.initializeApp(firebaseConfig);
      console.log('Firebase initialized with production config');
    }
  }
});

// Initialize Firebase with default config (will be updated if production config is received)
firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages when app is not in focus
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

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

// Handle notification click events
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);
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

// Service Worker lifecycle events
self.addEventListener('install', function(event) {
  console.log('[firebase-messaging-sw.js] Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[firebase-messaging-sw.js] Service Worker activating');
  event.waitUntil(self.clients.claim());
});

// Handle push events (fallback for browsers that don't support background messages)
self.addEventListener('push', function(event) {
  console.log('[firebase-messaging-sw.js] Push event received:', event);
  
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const notificationTitle = data.notification?.title || '🚦 Camera Location Update';
  const notificationOptions = {
    body: data.notification?.body || 'Traffic camera locations have been updated in Davenport',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'camera-update',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});