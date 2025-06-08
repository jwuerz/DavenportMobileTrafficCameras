import { initializeFirebase, requestNotificationPermission, getFirebaseToken, onMessageReceived } from './firebase';
import { useToast } from '@/hooks/use-toast';

export interface NotificationPermissionResult {
  granted: boolean;
  token?: string;
  error?: string;
}

export class NotificationService {
  private messaging: any = null;
  private token: string | null = null;
  private initialized: boolean = false;

  async initialize(): Promise<boolean> {
    try {
      this.messaging = await initializeFirebase();
      if (this.messaging) {
        this.setupForegroundListener();
        this.initialized = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      return false;
    }
  }

  async requestPermissionAndGetToken(): Promise<NotificationPermissionResult> {
    try {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        return { 
          granted: false, 
          error: 'Your browser does not support notifications. Please use a modern browser like Chrome, Firefox, or Safari.' 
        };
      }

      // Check service worker support
      if (!('serviceWorker' in navigator)) {
        return { 
          granted: false, 
          error: 'Your browser does not support service workers, which are required for push notifications.' 
        };
      }

      // Check current permission status
      const currentPermission = Notification.permission;
      console.log('Current notification permission:', currentPermission);

      if (currentPermission === 'denied') {
        return { 
          granted: false, 
          error: 'Notifications are blocked. Please click the notification icon in your browser\'s address bar and allow notifications, then try again.' 
        };
      }

      // Ensure service worker is registered before initializing Firebase
      try {
        console.log('Checking service worker registration...');
        let swRegistration = await navigator.serviceWorker.getRegistration('/sw.js');
        if (!swRegistration) {
          console.log('Registering service worker...');
          swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          await navigator.serviceWorker.ready;
          console.log('Service worker registered successfully');
        } else {
          console.log('Service worker already registered');
        }
      } catch (swError) {
        console.error('Service worker registration failed:', swError);
        return { 
          granted: false, 
          error: 'Failed to register service worker. Please refresh the page and try again.' 
        };
      }

      if (!this.initialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          console.log('Firebase not configured, using browser notifications only');
          // Continue with browser-only notifications
        }
      }

      const permissionGranted = await requestNotificationPermission();
      if (!permissionGranted) {
        const finalPermission = Notification.permission;
        if (finalPermission === 'denied') {
          return { 
            granted: false, 
            error: 'Notifications were blocked. To receive alerts, please allow notifications in your browser settings and refresh the page.' 
          };
        } else {
          return { 
            granted: false, 
            error: 'Notification permission was not granted. Please try again.' 
          };
        }
      }

      // Try to get Firebase token if available
      try {
        console.log('Attempting to get Firebase token...');
        const token = await getFirebaseToken();
        if (token) {
          this.token = token;
          console.log('Firebase token obtained successfully');
          return { granted: true, token };
        }
      } catch (firebaseError) {
        console.error('Firebase token error:', firebaseError);
        return { 
          granted: false, 
          error: `Registration failed: ${firebaseError.message}` 
        };
      }
      
      // Return success for browser notifications even without Firebase token
      return { 
        granted: true, 
        error: undefined // No error, just no advanced push features
      };
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return { 
        granted: false, 
        error: `Registration failed: ${error instanceof Error ? error.message : 'An unexpected error occurred while setting up notifications.'}` 
      };
    }
  }

  async subscribeToNotifications(userEmail: string): Promise<boolean> {
    try {
      const result = await this.requestPermissionAndGetToken();
      
      if (!result.granted || !result.token) {
        console.error('Cannot subscribe without valid token:', result.error);
        return false;
      }

      // Send token to backend to associate with user
      const response = await fetch('/api/fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          fcmToken: result.token
        })
      });

      if (response.ok) {
        console.log('FCM token registered successfully');
        return true;
      } else {
        console.error('Failed to register FCM token');
        return false;
      }
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      return false;
    }
  }

  private setupForegroundListener() {
    if (!this.messaging) return;

    // Handle messages when app is in foreground
    onMessageReceived((payload) => {
      console.log('Foreground message received:', payload);
      
      // Show toast notification for foreground messages
      const title = payload.notification?.title || 'Camera Location Update';
      const body = payload.notification?.body || 'Camera locations have been updated';
      
      // Create a custom notification toast or use browser notification
      this.showForegroundNotification(title, body);
    });
  }

  private showForegroundNotification(title: string, body: string) {
    // For foreground notifications, we can show a toast or custom notification
    // This will be handled by the component using the service
    console.log('Showing foreground notification:', title, body);
    
    // If browser notification API is available, show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'camera-update-foreground'
      });
    }
  }

  getToken(): string | null {
    return this.token;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // Test notification functionality
  async testNotification(): Promise<boolean> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('🚦 Test Notification', {
          body: 'Firebase push notifications are working correctly!',
          icon: '/favicon.ico',
          tag: 'test-notification'
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        return true;
      }
      return false;
    } catch (error) {
      console.error('Error testing notification:', error);
      return false;
    }
  }
}

// Create singleton instance
export const notificationService = new NotificationService();

// Legacy Chrome notification support (fallback)
export const requestChromeNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('Browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.log('Notifications are blocked');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

export const showChromeNotification = (title: string, body: string): boolean => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'camera-update'
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (error) {
    console.error('Error showing notification:', error);
    return false;
  }
};