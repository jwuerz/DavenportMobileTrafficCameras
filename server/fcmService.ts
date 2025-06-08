import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

interface FCMMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface FCMResponse {
  success: boolean;
  message?: string;
  error?: any;
}

export class FCMService {
  private projectId: string | null = null;
  private messaging: any = null;
  private isInitialized: boolean = false;

  constructor() {
    this.projectId = process.env.FIREBASE_PROJECT_ID || null;
    this.initializeFirebaseAdmin();
  }

  private initializeFirebaseAdmin(): void {
    try {
      // Check if Firebase Admin is already initialized
      if (getApps().length === 0) {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        
        if (serviceAccountKey && this.projectId) {
          try {
            // Parse the service account key from environment variable
            const serviceAccount = JSON.parse(serviceAccountKey);
            
            // Validate it's a proper service account object
            if (serviceAccount.type === 'service_account' && serviceAccount.private_key && serviceAccount.client_email) {
              const app = initializeApp({
                credential: cert(serviceAccount),
                projectId: this.projectId,
              });
              
              this.messaging = getMessaging(app);
              this.isInitialized = true;
              console.log('Firebase Admin initialized with service account for project:', this.projectId);
              return;
            } else {
              console.log('Invalid service account format, falling back to development mode');
            }
          } catch (parseError) {
            console.log('Service account parsing failed, falling back to development mode:', parseError);
          }
        }
        
        // Development mode - Firebase Admin SDK not fully initialized
        console.log('Firebase Admin running in development mode - notifications will be simulated');
        this.isInitialized = false;
      } else {
        // Use existing app
        this.messaging = getMessaging();
        this.isInitialized = true;
        console.log('Using existing Firebase Admin app');
      }
    } catch (error) {
      console.log('Firebase Admin initialization failed, using development mode:', error);
      this.isInitialized = false;
    }
  }

  isConfigured(): boolean {
    return this.isInitialized && !!this.projectId;
  }

  async sendNotification(fcmToken: string, message: FCMMessage): Promise<FCMResponse> {
    if (!this.isConfigured()) {
      console.log('[DEVELOPMENT MODE] FCM would send notification:', message);
      return { success: true, message: "FCM sent in development mode" };
    }

    try {
      const payload = {
        token: fcmToken,
        notification: {
          title: message.title,
          body: message.body,
        },
        data: {
          ...message.data,
          clickAction: 'open_app',
          url: message.data?.url || '/'
        },
        webpush: {
          notification: {
            title: message.title,
            body: message.body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'camera-update',
            requireInteraction: true,
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
          },
          headers: {
            'TTL': '86400'
          }
        }
      };

      const result = await this.messaging.send(payload);
      console.log('FCM notification sent successfully:', result);
      return { success: true, message: 'Notification sent successfully' };

    } catch (error) {
      console.error('FCM service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'FCM service error' 
      };
    }
  }

  async sendNotificationToMultipleTokens(fcmTokens: string[], message: FCMMessage): Promise<FCMResponse[]> {
    if (!this.isConfigured()) {
      console.log('[DEVELOPMENT MODE] FCM would send to multiple tokens:', fcmTokens.length);
      return fcmTokens.map(() => ({ success: true, message: "FCM sent in development mode" }));
    }

    try {
      // Use multicast for efficiency
      const payload = {
        tokens: fcmTokens,
        notification: {
          title: message.title,
          body: message.body,
        },
        data: {
          ...message.data,
          clickAction: 'open_app',
          url: message.data?.url || '/'
        },
        webpush: {
          notification: {
            title: message.title,
            body: message.body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'camera-update',
            requireInteraction: true,
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
          },
          headers: {
            'TTL': '86400'
          }
        }
      };

      const result = await this.messaging.sendEachForMulticast(payload);
      console.log(`FCM multicast sent: ${result.successCount} successful, ${result.failureCount} failed`);
      
      return result.responses.map((response, index) => ({
        success: response.success,
        message: response.success ? 'Notification sent successfully' : response.error?.message,
        error: response.success ? undefined : response.error
      }));

    } catch (error) {
      console.error('FCM multicast error:', error);
      const errorResult = { 
        success: false, 
        error: error instanceof Error ? error.message : 'FCM multicast error' 
      };
      return fcmTokens.map(() => errorResult);
    }
  }

  async sendCameraUpdateNotification(fcmTokens: string[], locationCount: number): Promise<FCMResponse[]> {
    const message: FCMMessage = {
      title: '🚦 Camera Locations Updated!',
      body: `${locationCount} camera locations have been updated for this week. Tap to view details.`,
      data: {
        type: 'camera_update',
        locationCount: locationCount.toString(),
        url: '/#locations'
      }
    };

    return this.sendNotificationToMultipleTokens(fcmTokens, message);
  }

  async testNotification(fcmToken: string): Promise<FCMResponse> {
    const message: FCMMessage = {
      title: '🧪 Test Notification',
      body: 'Firebase push notifications are working correctly!',
      data: {
        type: 'test',
        url: '/'
      }
    };

    return this.sendNotification(fcmToken, message);
  }
}

export const fcmService = new FCMService();