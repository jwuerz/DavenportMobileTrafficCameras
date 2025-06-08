// Service Worker: client/public/sw.js

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  console.log(`[Service Worker] Push had this data: "${event.data ? event.data.text() : 'No data'}"`);

  let title = 'Davenport Camera Alert';
  let options = {
    body: 'A new camera location update is available.',
    icon: '/logo.png', // Replace with your actual icon path e.g., /icons/icon-192x192.png
    badge: '/badge.png', // Replace with your actual badge path e.g., /icons/badge-72x72.png
    // image: '/some-image.png',
    // actions: [
    //   { action: 'explore', title: 'Explore new locations' },
    //   { action: 'close', title: 'Close' }
    // ]
  };

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options.body = data.body || options.body;
      options.icon = data.icon || options.icon;
      // You can add more properties from data to options if needed
      // options.data = data; // Pass along the data to the notification click event
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
      // Use default body if parsing fails but data exists
      options.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();

  // Example: Focus an existing tab or open a new one
  // This part needs to be customized based on your app's routing and desired behavior
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If a window/tab matching the app is already open, focus it
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        // Adjust the URL to match your application's URL
        if (client.url === '/' && 'focus' in client) { // Or a more specific URL like '/#locations'
          return client.focus();
        }
      }
      // If no window/tab is open, open a new one
      if (clients.openWindow) {
        // Adjust the URL to the page you want to open
        return clients.openWindow('/'); // Or '/#locations'
      }
    })
  );
});

// Optional: Listen for subscription change events (e.g., if the subscription expires)
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('[Service Worker]: 'pushsubscriptionchange' event fired.');
  // TODO: Re-subscribe the user and send the new subscription to your server.
  // event.waitUntil(
  //   self.registration.pushManager.subscribe(event.oldSubscription.options)
  //   .then(subscription => {
  //     // Send the new subscription to your server
  //   })
  // );
});

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installed');
  // event.waitUntil(self.skipWaiting()); // Optional: activate new SW immediately
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated');
  // event.waitUntil(clients.claim()); // Optional: take control of clients immediately
});
