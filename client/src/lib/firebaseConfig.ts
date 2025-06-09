// Firebase configuration helper that can be shared between main app and service workers
export const getFirebaseConfig = () => {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };
};

// Helper to inject Firebase config into service worker
export const injectFirebaseConfigIntoServiceWorker = async () => {
  const config = getFirebaseConfig();
  
  // Check if we have a valid configuration
  if (!config.apiKey || config.apiKey === 'undefined') {
    console.log('Firebase configuration not available - running in development mode');
    return false;
  }

  try {
    // Create a script that will set the Firebase config in the service worker global scope
    const configScript = `
      self.VITE_FIREBASE_API_KEY = "${config.apiKey}";
      self.VITE_FIREBASE_AUTH_DOMAIN = "${config.authDomain}";
      self.VITE_FIREBASE_PROJECT_ID = "${config.projectId}";
      self.VITE_FIREBASE_STORAGE_BUCKET = "${config.storageBucket}";
      self.VITE_FIREBASE_MESSAGING_SENDER_ID = "${config.messagingSenderId}";
      self.VITE_FIREBASE_APP_ID = "${config.appId}";
    `;

    // Register service worker with config injection
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      
      // Send config to service worker
      if (registration.active) {
        registration.active.postMessage({
          type: 'FIREBASE_CONFIG',
          config: config
        });
      }
      
      console.log('Firebase config injected into service worker');
      return true;
    }
  } catch (error) {
    console.error('Failed to inject Firebase config into service worker:', error);
    return false;
  }
  
  return false;
};