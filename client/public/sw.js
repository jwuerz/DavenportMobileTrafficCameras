// Import Firebase scripts
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