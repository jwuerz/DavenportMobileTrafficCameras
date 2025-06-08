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
  private serverKey: string | null = null;
  private projectId: string | null = null;

  constructor() {
    this.serverKey = process.env.FIREBASE_SERVER_KEY || null;
    this.projectId = process.env.FIREBASE_PROJECT_ID || null;
  }

  isConfigured(): boolean {
    return !!(this.serverKey && this.projectId);
  }

  async sendNotification(fcmToken: string, message: FCMMessage): Promise<FCMResponse> {
    if (!this.isConfigured()) {
      console.log('[DEVELOPMENT MODE] FCM would send notification:', message);
      return { success: true, message: "FCM sent in development mode" };
    }

    try {
      const payload = {
        to: fcmToken,
        notification: {
          title: message.title,
          body: message.body,
          icon: '/favicon.ico',
          click_action: '/',
          tag: 'camera-update'
        },
        data: {
          ...message.data,
          clickAction: 'open_app'
        },
        webpush: {
          headers: {
            'TTL': '86400' // 24 hours
          },
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
          }
        }
      };

      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${this.serverKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.success !== 0) {
        console.log('FCM notification sent successfully:', result.results?.[0]?.message_id);
        return { success: true, message: 'Notification sent successfully' };
      } else {
        console.error('FCM notification failed:', result);
        return { 
          success: false, 
          error: result.results?.[0]?.error || result.error || 'Unknown FCM error' 
        };
      }
    } catch (error) {
      console.error('FCM service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'FCM service error' 
      };
    }
  }

  async sendNotificationToMultipleTokens(fcmTokens: string[], message: FCMMessage): Promise<FCMResponse[]> {
    const results: FCMResponse[] = [];
    
    for (const token of fcmTokens) {
      try {
        const result = await this.sendNotification(token, message);
        results.push(result);
        
        // Add small delay between notifications to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.push({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    return results;
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