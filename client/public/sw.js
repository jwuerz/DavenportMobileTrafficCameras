// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration - replace with your actual values
const firebaseConfig = {
  apiKey: "AIzaSyBGF6UqNmAFNb_5Ea3jQVhpwIVyQr9IYuE",
  authDomain: "davenport-camera-alerts.firebaseapp.com",
  projectId: "davenport-camera-alerts",
  storageBucket: "davenport-camera-alerts.firebasestorage.app",
  messagingSenderId: "139796009829",
  appId: "1:139796009829:web:4e50829265174476893100"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'Camera Location Update';
  const notificationOptions = {
    body: payload.notification?.body || 'Camera locations have been updated',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'camera-update',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View Locations'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  if (event.action === 'view') {
    // Open the app when notification is clicked
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('Service worker installed');
  self.skipWaiting();
});