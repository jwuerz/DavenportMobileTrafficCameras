import * as cheerio from 'cheerio';
import webpush from 'web-push';
import { storage } from './storage';
import { sendCameraUpdateNotification } from './emailService';

interface ScrapedLocation {
  address: string;
  type: string;
  description: string;
  schedule: string;
}

export class DavenportScraper {
  private readonly url = 'https://www.davenportiowa.com/government/departments/police/automated_traffic_enforcement';
  private lastScrapedContent: string = '';

  async scrapeCurrentLocations(): Promise<ScrapedLocation[]> {
    try {
      console.log('Scraping Davenport camera locations...');
      
      const response = await fetch(this.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const locations: ScrapedLocation[] = [];

      // First, try to find the Mobile Camera Locations section
      const mobileSection = $('p:contains("Mobile Camera Locations:")').parent();
      if (mobileSection.length > 0) {
        console.log('Found Mobile Camera Locations section');
        
        // Look for the date range
        let dateRange = '';
        const dateElement = mobileSection.find('p.MsoNormal, p:contains("June"), b:contains("June")').first();
        if (dateElement.length > 0) {
          dateRange = dateElement.text().trim();
          console.log('Found date range:', dateRange);
        }

        // Look for the daily schedule in list items
        const listItems = mobileSection.find('li.MsoNormal, li');
        console.log('Found', listItems.length, 'list items');
        
        listItems.each((_, item) => {
          const text = $(item).text().trim();
          console.log('Processing list item:', text);
          
          if (this.isDailyScheduleItem(text)) {
            const parsedLocations = this.parseDailyScheduleItem(text, dateRange);
            locations.push(...parsedLocations);
          }
        });
      }

      // If no mobile locations found, try alternative parsing
      if (locations.length === 0) {
        console.log('No mobile locations found, trying alternative parsing...');
        
        // Look for text containing day patterns
        const bodyText = $('body').text();
        const dailyLocations = this.extractDailyScheduleFromText(bodyText);
        locations.push(...dailyLocations);
      }

      console.log(`Found ${locations.length} camera locations`);
      return locations;

    } catch (error) {
      console.error('Error scraping camera locations:', error);
      throw error;
    }
  }

  private isDailyScheduleItem(text: string): boolean {
    const dayPattern = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday):/i;
    return dayPattern.test(text.trim());
  }

  private parseDailyScheduleItem(text: string, dateRange: string): ScrapedLocation[] {
    const locations: ScrapedLocation[] = [];
    
    // Extract day of week
    const dayMatch = text.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday):/i);
    if (!dayMatch) return locations;
    
    const day = dayMatch[1];
    
    // Extract locations after the colon
    const locationsPart = text.substring(text.indexOf(':') + 1).trim();
    
    // The dash represents an intersection range, not separate locations
    // Convert "5800 Eastern Ave – 1900 Brady St." to "5800 Eastern Ave & 1900 Brady St."
    const intersectionAddress = locationsPart.replace(/\s*[–-]\s*/, ' & ');
    
    if (intersectionAddress && intersectionAddress.length > 5) {
      locations.push({
        address: intersectionAddress,
        type: 'mobile',
        description: `Mobile camera intersection for ${day}`,
        schedule: `${day} (${dateRange})`
      });
    }
    
    return locations;
  }

  private extractDailyScheduleFromText(text: string): ScrapedLocation[] {
    const locations: ScrapedLocation[] = [];
    
    // Look for patterns like "Monday: 5800 Eastern Ave – 1900 Brady St."
    const dayPattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday):\s*([^.]+)/gi;
    let match;
    
    while ((match = dayPattern.exec(text)) !== null) {
      const day = match[1];
      const locationsPart = match[2].trim();
      
      // Convert dash to intersection (&) format
      const intersectionAddress = locationsPart.replace(/\s*[–-]\s*/, ' & ');
      
      if (intersectionAddress && intersectionAddress.length > 5) {
        locations.push({
          address: intersectionAddress,
          type: 'mobile',
          description: `Mobile camera intersection for ${day}`,
          schedule: day
        });
      }
    }
    
    return locations;
  }

  private isLocationText(text: string): boolean {
    const locationIndicators = [
      'camera',
      'enforcement',
      'speed',
      'red light',
      'intersection',
      'street',
      'avenue',
      'road',
      'boulevard',
      'mobile'
    ];

    const lowerText = text.toLowerCase();
    return locationIndicators.some(indicator => lowerText.includes(indicator)) &&
           text.length > 10 && text.length < 200;
  }

  private parseLocationText(text: string): ScrapedLocation | null {
    try {
      // Extract address (look for street patterns)
      const addressMatch = text.match(/([A-Za-z0-9\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Way|Dr|Drive)[A-Za-z0-9\s]*)/i);
      const address = addressMatch ? addressMatch[1].trim() : text.substring(0, 50);

      // Determine type based on keywords
      let type = 'mobile';
      if (text.toLowerCase().includes('red light')) type = 'red_light';
      else if (text.toLowerCase().includes('fixed')) type = 'fixed';

      // Extract description
      const description = text.length > 100 ? text.substring(0, 100) + '...' : text;

      // Extract schedule if present
      const scheduleMatch = text.match(/(mon|tue|wed|thu|fri|sat|sun|daily|24\/7|[0-9]{1,2}:[0-9]{2})/i);
      const schedule = scheduleMatch ? this.extractScheduleFromText(text) : 'Check city website';

      return {
        address,
        type,
        description,
        schedule
      };
    } catch (error) {
      console.error('Error parsing location text:', error);
      return null;
    }
  }

  private extractLocationsFromText(text: string): ScrapedLocation[] {
    const locations: ScrapedLocation[] = [];
    
    // Common Davenport street patterns
    const streetPatterns = [
      /([0-9]+(?:st|nd|rd|th)?\s+(?:&|and)\s+[A-Za-z\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard))/gi,
      /([A-Za-z\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard)\s+(?:&|and)\s+[A-Za-z\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard))/gi
    ];

    streetPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          locations.push({
            address: match.trim(),
            type: 'mobile',
            description: 'Traffic enforcement location',
            schedule: 'Check city website for current schedule'
          });
        });
      }
    });

    return locations;
  }

  private extractScheduleFromText(text: string): string {
    const schedulePatterns = [
      /([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM)?\s*-?\s*[0-9]{1,2}:[0-9]{2}\s*(?:AM|PM)?)/gi,
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekdays|weekends)/gi,
      /(24\/7|daily)/gi
    ];

    for (const pattern of schedulePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return 'Check city website';
  }

  async checkForUpdates(): Promise<boolean> {
    try {
      const currentLocations = await this.scrapeCurrentLocations();
      const storedLocations = await storage.getActiveCameraLocations();

      // Check if content has changed by comparing locations
      const hasChanged = this.compareLocations(currentLocations, storedLocations);

      if (hasChanged) {
        console.log('Camera locations have changed! Updating database...');
        
        // Clear existing locations
        await storage.clearAllCameraLocations();

        // Add new locations
        for (const location of currentLocations) {
          await storage.createCameraLocation({
            address: location.address,
            type: location.type,
            description: location.description,
            schedule: location.schedule,
            isActive: true
          });
        }

        // Send notifications to all active users
        await this.notifyUsers(currentLocations);
        
        return true;
      }

      console.log('No changes detected in camera locations');
      return false;

    } catch (error) {
      console.error('Error checking for updates:', error);
      throw error;
    }
  }

  private compareLocations(current: ScrapedLocation[], stored: any[]): boolean {
    if (current.length !== stored.length) return true;

    const currentAddresses = new Set(current.map(loc => loc.address.toLowerCase()));
    const storedAddresses = new Set(stored.map(loc => loc.address.toLowerCase()));

    if (currentAddresses.size !== storedAddresses.size) return true;
    
    for (const addr of Array.from(currentAddresses)) {
      if (!storedAddresses.has(addr)) return true;
    }
    return false;
  }

  private async notifyUsers(locations: ScrapedLocation[]): Promise<void> {
    // Call push notifications early in the process
    try {
      await sendPushNotificationsToAll("Davenport Camera Update", locations.length + " new or updated camera locations posted.");
    } catch (pushError) {
      console.error("Failed to initiate push notifications:", pushError);
    }
    try {
      const users = await storage.getAllActiveUsers();
      console.log(`Sending notifications to ${users.length} users`);

      for (const user of users) {
        if (user.notificationPreferences.includes('location_changes')) {
          await sendCameraUpdateNotification(user.email, locations);
          
          // Log notification
          await storage.createNotification({
            userId: user.id,
            subject: 'Camera Location Update',
            content: `Sent notification about ${locations.length} camera locations`,
            status: 'sent'
          });
        }
      }
    } catch (error) {
      console.error('Error notifying users:', error);
    }
  }

  async initializeLocations(): Promise<void> {
    try {
      console.log('Initializing camera locations...');
      const locations = await this.scrapeCurrentLocations();
      
      // Clear existing and add initial locations
      await storage.clearAllCameraLocations();
      
      for (const location of locations) {
        await storage.createCameraLocation({
          address: location.address,
          type: location.type,
          description: location.description,
          schedule: location.schedule,
          isActive: true
        });
      }
      
      console.log(`Initialized ${locations.length} camera locations`);
    } catch (error) {
      console.error('Error initializing locations:', error);
    }
  }

  async forceRefresh(): Promise<void> {
    console.log('Force refreshing camera locations...');
    await storage.clearAllCameraLocations();
    await this.initializeLocations();
  }
}

export const scraper = new DavenportScraper();

async function sendPushNotificationsToAll(title: string, body: string, icon?: string) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys not set. Skipping push notifications.');
    return;
  }
  try {
    webpush.setVapidDetails(
      `mailto:${process.env.FROM_EMAIL || 'davenport-alerts@example.com'}`,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const subscriptions = await storage.getAllActivePushSubscriptions();
    if (subscriptions.length === 0) {
      console.log("No active push subscriptions to notify.");
      return;
    }

    console.log(`Attempting to send push notifications to ${subscriptions.length} subscribers.`);

    const payload = JSON.stringify({ title, body, icon: icon || '/icon-192x192.png' });

    let successCount = 0;
    let failureCount = 0;

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };
      try {
        await webpush.sendNotification(pushSubscription, payload);
        successCount++;
      } catch (error) {
        failureCount++;
        let statusCode = 'Unknown';
        if (error && typeof error === 'object' && 'statusCode' in error) {
          statusCode = String(error.statusCode);
        }
        console.error(`Error sending push notification to ${sub.endpoint.substring(0,30)}... : ${statusCode}`, error.body || '');
        if (statusCode === '410' || statusCode === '404') {
          console.log(`Deleting invalid push subscription: ${pushSubscription.endpoint.substring(0,30)}...`);
          await storage.deletePushSubscription(pushSubscription.endpoint);
        }
      }
    }
    console.log(`Push notifications sent: ${successCount} succeeded, ${failureCount} failed.`);

  } catch (error) {
    console.error('Failed to send push notifications:', error);
  }
}
