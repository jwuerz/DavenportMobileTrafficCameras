// Multi-strategy notification system for cross-platform support
export interface NotificationStrategy {
  name: string;
  isSupported(): boolean;
  requestPermission(): Promise<boolean>;
  sendNotification(title: string, body: string, options?: any): Promise<boolean>;
  getCapabilities(): string[];
}

// Strategy 1: Native Browser Notifications (Web Notifications API)
export class BrowserNotificationStrategy implements NotificationStrategy {
  name = "Browser Notifications";

  isSupported(): boolean {
    return 'Notification' in window;
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async sendNotification(title: string, body: string, options: any = {}): Promise<boolean> {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    try {
      const notificationOptions: NotificationOptions = {
        body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        tag: options.tag || 'camera-update',
        requireInteraction: options.requireInteraction !== false,
        silent: options.silent || false,
        data: options.data || {}
      };

      // Add vibrate for Android support (not in standard NotificationOptions type)
      if (options.vibrate && 'vibrate' in navigator) {
        (notificationOptions as any).vibrate = options.vibrate;
      }

      const notification = new Notification(title, notificationOptions);

      // Auto-close after 10 seconds if not interactive
      if (!options.requireInteraction) {
        setTimeout(() => notification.close(), 10000);
      }

      notification.onclick = () => {
        window.focus();
        if (options.onClick) options.onClick();
        notification.close();
      };

      return true;
    } catch (error) {
      console.error('Browser notification failed:', error);
      return false;
    }
  }

  getCapabilities(): string[] {
    return [
      'Desktop notifications',
      'Android notification shade',
      'Icon and badge support',
      'Click actions',
      'Auto-close timing'
    ];
  }
}

// Strategy 2: Service Worker Push Notifications
export class ServiceWorkerPushStrategy implements NotificationStrategy {
  name = "Service Worker Push";
  private registration: ServiceWorkerRegistration | null = null;

  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      // Register our custom service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service worker registered successfully');
      
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return false;
    }
  }

  async sendNotification(title: string, body: string, options: any = {}): Promise<boolean> {
    if (!this.registration || Notification.permission !== 'granted') {
      return false;
    }

    try {
      await this.registration.showNotification(title, {
        body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        tag: options.tag || 'camera-update',
        requireInteraction: options.requireInteraction !== false,
        silent: options.silent || false,
        vibrate: options.vibrate || [200, 100, 200],
        data: options.data || {},
        actions: options.actions || [
          { action: 'view', title: 'View Details' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      });

      return true;
    } catch (error) {
      console.error('Service worker notification failed:', error);
      return false;
    }
  }

  getCapabilities(): string[] {
    return [
      'Background notifications',
      'Persistent notifications',
      'Action buttons',
      'Offline support',
      'Enhanced Android integration'
    ];
  }
}

// Strategy 3: Progressive Web App (PWA) Notifications
export class PWANotificationStrategy implements NotificationStrategy {
  name = "PWA Notifications";

  isSupported(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async sendNotification(title: string, body: string, options: any = {}): Promise<boolean> {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    try {
      // Enhanced PWA notification with app badge
      const notification = new Notification(title, {
        body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        tag: options.tag || 'camera-update',
        requireInteraction: true, // PWA notifications should be persistent
        silent: options.silent || false,
        vibrate: options.vibrate || [200, 100, 200, 100, 200],
        data: { ...options.data, pwa: true }
      });

      // Set app badge (if supported)
      if ('setAppBadge' in navigator) {
        (navigator as any).setAppBadge(1);
      }

      notification.onclick = () => {
        // Clear app badge when notification is clicked
        if ('clearAppBadge' in navigator) {
          (navigator as any).clearAppBadge();
        }
        window.focus();
        if (options.onClick) options.onClick();
        notification.close();
      };

      return true;
    } catch (error) {
      console.error('PWA notification failed:', error);
      return false;
    }
  }

  getCapabilities(): string[] {
    return [
      'App badge support',
      'Enhanced mobile integration',
      'Persistent notifications',
      'Full-screen app experience',
      'iOS home screen support'
    ];
  }
}

// Strategy 4: Fallback In-App Notifications
export class InAppNotificationStrategy implements NotificationStrategy {
  name = "In-App Notifications";

  isSupported(): boolean {
    return true; // Always supported as fallback
  }

  async requestPermission(): Promise<boolean> {
    return true; // No permission needed for in-app
  }

  async sendNotification(title: string, body: string, options: any = {}): Promise<boolean> {
    try {
      // Create in-app notification element
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm';
      notification.innerHTML = `
        <div class="flex items-start">
          <div class="flex-1">
            <h4 class="font-bold text-sm">${title}</h4>
            <p class="text-sm mt-1">${body}</p>
          </div>
          <button class="ml-2 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
            ×
          </button>
        </div>
      `;

      document.body.appendChild(notification);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 5000);

      // Add click handler
      notification.addEventListener('click', () => {
        if (options.onClick) options.onClick();
        notification.remove();
      });

      return true;
    } catch (error) {
      console.error('In-app notification failed:', error);
      return false;
    }
  }

  getCapabilities(): string[] {
    return [
      'Always available',
      'No permissions required',
      'Customizable styling',
      'Immediate display',
      'Cross-platform compatibility'
    ];
  }
}

// Notification Manager - Handles multiple strategies
export class NotificationManager {
  private strategies: NotificationStrategy[] = [];
  private activeStrategy: NotificationStrategy | null = null;

  constructor() {
    this.strategies = [
      new PWANotificationStrategy(),
      new ServiceWorkerPushStrategy(),
      new BrowserNotificationStrategy(),
      new InAppNotificationStrategy()
    ];
  }

  async initialize(): Promise<{ strategy: string; success: boolean }> {
    // Try strategies in order of preference
    for (const strategy of this.strategies) {
      if (strategy.isSupported()) {
        console.log(`Trying notification strategy: ${strategy.name}`);
        
        const success = await strategy.requestPermission();
        if (success) {
          this.activeStrategy = strategy;
          console.log(`Successfully initialized: ${strategy.name}`);
          return { strategy: strategy.name, success: true };
        }
      }
    }

    // Fallback to in-app notifications
    this.activeStrategy = this.strategies[this.strategies.length - 1];
    return { strategy: this.activeStrategy.name, success: true };
  }

  async sendNotification(title: string, body: string, options: any = {}): Promise<boolean> {
    if (!this.activeStrategy) {
      await this.initialize();
    }

    return this.activeStrategy?.sendNotification(title, body, options) || false;
  }

  getActiveStrategy(): string {
    return this.activeStrategy?.name || 'None';
  }

  getAllStrategies(): Array<{ name: string; supported: boolean; capabilities: string[] }> {
    return this.strategies.map(strategy => ({
      name: strategy.name,
      supported: strategy.isSupported(),
      capabilities: strategy.getCapabilities()
    }));
  }

  async testNotification(): Promise<boolean> {
    return this.sendNotification(
      '🚦 Test Notification',
      'Cross-platform notification system is working correctly!',
      {
        tag: 'test-notification',
        requireInteraction: false,
        onClick: () => console.log('Test notification clicked')
      }
    );
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager();