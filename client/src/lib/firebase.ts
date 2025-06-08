import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

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
      console.error('VAPID key not configured');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: vapidKey
    });

    if (token) {
      console.log('FCM token generated:', token);
      return token;
    } else {
      console.log('No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
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