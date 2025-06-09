import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { getFirebaseConfig, injectFirebaseConfigIntoServiceWorker } from './firebaseConfig';

const firebaseConfig = getFirebaseConfig();

let app: any = null;
let messaging: any = null;

export const initializeFirebase = async () => {
  try {
    // Check if Firebase messaging is supported
    const supported = await isSupported();
    if (!supported) {
      console.log('Firebase messaging is not supported in this browser');
      return null;
    }

    // Only initialize if we have the required config
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.log('Firebase configuration not found. Push notifications will be disabled.');
      return null;
    }

    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    
    console.log('Firebase initialized successfully');
    return messaging;
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    return null;
  }
};

export const requestNotificationPermission = async () => {
  try {
    // First check if notifications are supported
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    // Check current permission status
    let permission = Notification.permission;
    console.log('Current permission status:', permission);

    // If permission is already granted, return true
    if (permission === 'granted') {
      console.log('Notification permission already granted');
      return true;
    }

    // If permission is denied, we can't request again
    if (permission === 'denied') {
      console.log('Notification permission was previously denied');
      return false;
    }

    // Request permission if it's default
    if (permission === 'default') {
      console.log('Requesting notification permission...');
      permission = await Notification.requestPermission();
    }

    if (permission === 'granted') {
      console.log('Notification permission granted');
      
      // Initialize Firebase messaging after permission is granted
      if (!messaging) {
        await initializeFirebase();
      }
      
      return true;
    } else {
      console.log('Notification permission denied');
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

export const getFirebaseToken = async () => {
  try {
    if (!messaging) {
      await initializeFirebase();
    }

    if (!messaging) {
      throw new Error('Firebase messaging not available');
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error('VAPID key not configured - check VITE_FIREBASE_VAPID_KEY environment variable');
      throw new Error('VAPID key not configured. Push notifications require a VAPID key.');
    }

    // Register the Firebase messaging service worker with config injection
    let registration = null;
    if ('serviceWorker' in navigator) {
      try {
        // Inject Firebase config into service worker
        const configInjected = await injectFirebaseConfigIntoServiceWorker();
        
        // First check for existing registration
        registration = await navigator.serviceWorker.getRegistration('/');
        
        if (!registration) {
          registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/'
          });
          console.log('Firebase service worker registered successfully');
        } else {
          console.log('Using existing service worker registration');
        }
        
        // Send config to service worker
        if (registration.active && configInjected) {
          registration.active.postMessage({
            type: 'FIREBASE_CONFIG',
            config: firebaseConfig
          });
        }
        
        // Ensure service worker is ready
        await navigator.serviceWorker.ready;
      } catch (swError) {
        console.error('Firebase service worker registration failed:', swError);
        console.log('Continuing without service worker - some browsers support FCM without it');
      }
    }

    console.log('Requesting FCM token with VAPID key...');
    
    // Try multiple token generation strategies
    let token = null;
    let lastError = null;
    
    // Strategy 1: With service worker registration
    if (registration) {
      try {
        console.log('Attempting FCM token generation with service worker...');
        token = await getToken(messaging, {
          vapidKey: vapidKey,
          serviceWorkerRegistration: registration
        });
      } catch (swTokenError) {
        console.warn('FCM token with service worker failed:', swTokenError);
        lastError = swTokenError;
      }
    }
    
    // Strategy 2: Without explicit service worker registration
    if (!token) {
      try {
        console.log('Attempting FCM token generation without explicit service worker...');
        token = await getToken(messaging, { vapidKey: vapidKey });
      } catch (directError) {
        console.warn('Direct FCM token generation failed:', directError);
        lastError = directError;
      }
    }
    
    // Strategy 3: Force new service worker registration
    if (!token && 'serviceWorker' in navigator) {
      try {
        console.log('Attempting to force new service worker registration...');
        await navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(reg => reg.unregister());
        });
        
        const newRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        await navigator.serviceWorker.ready;
        
        token = await getToken(messaging, {
          vapidKey: vapidKey,
          serviceWorkerRegistration: newRegistration
        });
      } catch (forceError) {
        console.warn('Forced service worker token generation failed:', forceError);
        lastError = forceError;
      }
    }

    if (token) {
      console.log('FCM token generated successfully:', token.substring(0, 20) + '...');
      return token;
    } else {
      const errorMessage = lastError instanceof Error ? lastError.message : String(lastError || 'Unknown error');
      throw new Error('Failed to generate FCM token after trying multiple strategies. Last error: ' + errorMessage);
    }
  } catch (error: unknown) {
    const errorObj = error as any;
    console.error('Error getting FCM token:', errorObj);
    
    if (errorObj?.code === 'messaging/unsupported-browser') {
      throw new Error('Your browser does not support push notifications.');
    } else if (errorObj?.code === 'messaging/permission-blocked') {
      throw new Error('Notification permission was blocked. Please allow notifications in your browser settings.');
    } else if (errorObj?.code === 'messaging/no-sw-in-reg') {
      throw new Error('Service worker not found. Please refresh the page and try again.');
    } else if (errorObj?.code === 'messaging/failed-service-worker-registration') {
      throw new Error('Service worker registration failed. Please check your browser settings.');
    }
    
    const errorMessage = (errorObj as Error)?.message || 'Unknown Firebase error occurred';
    throw new Error(`FCM token generation failed: ${errorMessage}`);
  }
};

export const onMessageReceived = (callback: (payload: any) => void) => {
  if (!messaging) {
    console.error('Firebase messaging not initialized');
    return;
  }

  return onMessage(messaging, (payload) => {
    console.log('Message received in foreground:', payload);
    callback(payload);
  });
};

export { messaging };