import * as cheerio from 'cheerio';
import { storage } from './storage';
import { sendCameraUpdateNotification } from './emailService';
import { fcmService } from './fcmService';
import { geocodingService } from './geocoding';
import type { InsertCameraDeployment } from '@shared/schema';

interface ScrapedLocation {
  address: string;
  type: string;
  description: string;
  schedule: string;
}

export class DavenportScraper {
  private readonly url = 'https://www.davenportiowa.com/government/departments/police/automated_traffic_enforcement';
  private lastScrapedContent: string = '';
  private lastNotificationTime: Date | null = null;

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

  private shouldSendNotifications(): boolean {
    // Don't send notifications more than once every 4 hours
    const NOTIFICATION_COOLDOWN_HOURS = 4;
    
    if (!this.lastNotificationTime) {
      return true; // First notification, always send
    }
    
    const now = new Date();
    const timeSinceLastNotification = now.getTime() - this.lastNotificationTime.getTime();
    const hoursSinceLastNotification = timeSinceLastNotification / (1000 * 60 * 60);
    
    if (hoursSinceLastNotification >= NOTIFICATION_COOLDOWN_HOURS) {
      console.log(`${hoursSinceLastNotification.toFixed(1)} hours since last notification - sending notifications`);
      return true;
    } else {
      console.log(`Only ${hoursSinceLastNotification.toFixed(1)} hours since last notification - skipping (cooldown: ${NOTIFICATION_COOLDOWN_HOURS}h)`);
      return false;
    }
  }

  private async initializeLastNotificationTime(): Promise<void> {
    try {
      // Get the most recent notification time from the database
      const users = await storage.getAllActiveUsers();
      if (users.length === 0) return;
      
      // Check the most recent camera location notification across all users
      let latestNotificationTime: Date | null = null;
      
      for (const user of users) {
        const notifications = await storage.getNotificationsByUser(user.id);
        const cameraNotifications = notifications.filter(n => 
          n.subject.includes('Camera Location') && n.status === 'sent'
        );
        
        if (cameraNotifications.length > 0) {
          const userLatest = cameraNotifications[0].sentAt; // Assuming sorted by most recent
          if (userLatest && (!latestNotificationTime || userLatest > latestNotificationTime)) {
            latestNotificationTime = userLatest;
          }
        }
      }
      
      this.lastNotificationTime = latestNotificationTime;
      if (latestNotificationTime) {
        console.log(`Initialized last notification time: ${latestNotificationTime.toISOString()}`);
      } else {
        console.log('No previous notifications found in database');
      }
    } catch (error) {
      console.error('Error initializing last notification time:', error);
      this.lastNotificationTime = null;
    }
  }

  private splitLocationString(locationString: string): string[] {
    // Split by various delimiters: –, -, &, and (case insensitive)
    // Use regex to handle multiple types of dashes and ampersands
    const delimiters = /\s*[–\-&]\s*|\s+and\s+/gi;
    
    const parts = locationString.split(delimiters)
      .map(part => part.trim())
      .filter(part => part.length > 5); // Only keep meaningful address parts
    
    // If no valid parts found, return the original string as a single item
    if (parts.length <= 1) {
      return [locationString.trim()];
    }
    
    return parts;
  }

  private parseDailyScheduleItem(text: string, dateRange: string): ScrapedLocation[] {
    const locations: ScrapedLocation[] = [];
    
    // Extract day of week
    const dayMatch = text.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday):/i);
    if (!dayMatch) return locations;
    
    const day = dayMatch[1];
    
    // Extract locations after the colon
    const locationsPart = text.substring(text.indexOf(':') + 1).trim();
    
    // Split addresses by various delimiters (–, -, &, and)
    const addressParts = this.splitLocationString(locationsPart);
    
    // Create separate entries for each address
    addressParts.forEach((address: string) => {
      if (address && address.length > 5) {
        locations.push({
          address: address.trim(),
          type: 'mobile',
          description: `Mobile camera location for ${day}`,
          schedule: `${day} (${dateRange})`
        });
      }
    });
    
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
      
      // Split addresses by various delimiters (–, -, &, and)
      const addressParts = this.splitLocationString(locationsPart);
      
      // Create separate entries for each address
      addressParts.forEach((address: string) => {
        if (address && address.length > 5) {
          locations.push({
            address: address.trim(),
            type: 'mobile',
            description: `Mobile camera location for ${day}`,
            schedule: day
          });
        }
      });
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

        // Update deployment history only when there are actual changes
        await this.saveDeploymentHistory(currentLocations);

        // Check if we should send notifications (throttle to prevent spam)
        const shouldNotify = this.shouldSendNotifications();
        if (shouldNotify) {
          await this.notifyUsers(currentLocations);
          this.lastNotificationTime = new Date();
        } else {
          console.log('Skipping notifications due to recent notification cooldown');
        }
        
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
    if (current.length !== stored.length) {
      console.log(`Location count changed: ${stored.length} -> ${current.length}`);
      return true;
    }

    const currentAddresses = new Set(current.map(loc => loc.address.toLowerCase().trim()));
    const storedAddresses = new Set(stored.map(loc => loc.address.toLowerCase().trim()));

    if (currentAddresses.size !== storedAddresses.size) {
      console.log('Address set sizes differ after normalization');
      return true;
    }
    
    for (const addr of Array.from(currentAddresses)) {
      if (!storedAddresses.has(addr)) {
        console.log(`New address detected: ${addr}`);
        return true;
      }
    }
    
    // Also check if schedules have changed
    const currentSchedules = current.map(loc => `${loc.address.toLowerCase().trim()}:${loc.schedule}`);
    const storedSchedules = stored.map(loc => `${loc.address.toLowerCase().trim()}:${loc.schedule}`);
    
    for (const schedule of currentSchedules) {
      if (!storedSchedules.includes(schedule)) {
        console.log(`Schedule changed for: ${schedule}`);
        return true;
      }
    }
    
    return false;
  }

  private async notifyUsers(locations: ScrapedLocation[]): Promise<void> {
    try {
      const users = await storage.getAllActiveUsers();
      console.log(`Sending notifications to ${users.length} users`);

      let emailsSent = 0;
      let emailsFailed = 0;

      for (const user of users) {
        // Check if user wants location change notifications
        const wantsLocationUpdates = user.notificationPreferences.includes('location_changes') || 
                                   user.notificationPreferences.includes('email');
        
        if (wantsLocationUpdates) {
          try {
            console.log(`Sending notifications to ${user.email}`);
            
            // Send email notification
            const emailResult = await sendCameraUpdateNotification(user.email, locations);
            
            // Send Firebase push notification if user has FCM token
            let fcmResult = null;
            if (user.fcmToken) {
              try {
                fcmResult = await fcmService.sendCameraUpdateNotification([user.fcmToken], locations.length);
                console.log(`FCM notification sent to ${user.email}: ${fcmResult[0]?.success ? 'success' : 'failed'}`);
              } catch (fcmError) {
                console.error(`FCM notification failed for ${user.email}:`, fcmError);
              }
            }
            
            if (emailResult.success) {
              emailsSent++;
              // Log successful notification
              await storage.createNotification({
                userId: user.id,
                subject: 'Camera Location Update',
                content: `Sent email and ${user.fcmToken ? 'push' : 'no push'} notification about ${locations.length} camera locations`,
                status: 'sent'
              });
            } else {
              emailsFailed++;
              console.error(`Failed to send email to ${user.email}:`, emailResult.error);
              // Log failed notification
              await storage.createNotification({
                userId: user.id,
                subject: 'Camera Location Update',
                content: `Failed to send notification: ${emailResult.error?.message || 'Unknown error'}`,
                status: 'failed'
              });
            }

            // Add small delay between notifications to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } catch (error) {
            emailsFailed++;
            console.error(`Error sending notification to ${user.email}:`, error);
            
            // Log failed notification
            try {
              await storage.createNotification({
                userId: user.id,
                subject: 'Camera Location Update',
                content: `Error sending notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
                status: 'failed'
              });
            } catch (logError) {
              console.error('Error logging failed notification:', logError);
            }
          }
        } else {
          console.log(`User ${user.email} not subscribed to location updates`);
        }
      }
      
      console.log(`Notification summary: ${emailsSent} sent, ${emailsFailed} failed`);
      
    } catch (error) {
      console.error('Error in notification process:', error);
    }
  }

  async initializeLocations(): Promise<void> {
    try {
      console.log('Initializing camera locations...');
      
      // Initialize last notification time from database
      await this.initializeLastNotificationTime();
      
      const locations = await this.scrapeCurrentLocations();
      
      // Check if we already have deployments to avoid duplicates
      const existingDeployments = await storage.getCurrentDeployments();
      
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
      
      // Only save deployment history if this is truly the first initialization
      if (existingDeployments.length === 0) {
        console.log('First time initialization - creating deployment history');
        await this.saveDeploymentHistory(locations);
      } else {
        console.log('Existing deployments found - skipping deployment history creation during initialization');
      }
    } catch (error) {
      console.error('Error initializing locations:', error);
    }
  }

  private async saveDeploymentHistory(locations: ScrapedLocation[]): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentWeek = this.getWeekOfYear(new Date());

      console.log(`Updating deployment history for ${locations.length} locations`);

      // End ALL current active deployments since we're updating with fresh data
      const currentDeployments = await storage.getCurrentDeployments();
      console.log(`Ending ${currentDeployments.length} current deployments`);
      
      for (const deployment of currentDeployments) {
        await storage.updateCameraDeployment(deployment.id, {
          endDate: today,
          isActive: false
        });
        console.log(`Ended deployment: ${deployment.address}`);
      }

      // Create fresh deployment records for all current locations
      let newDeployments = 0;
      for (const location of locations) {
        // Get coordinates for mapping
        console.log(`Geocoding address: ${location.address}`);
        const geocodeResult = await geocodingService.geocodeAddress(location.address);
        console.log(`Geocoding result for ${location.address}:`, geocodeResult);
        
        const deployment: InsertCameraDeployment = {
          address: location.address,
          type: location.type,
          description: location.description,
          schedule: location.schedule,
          latitude: geocodeResult?.latitude?.toString(),
          longitude: geocodeResult?.longitude?.toString(),
          startDate: today,
          endDate: null,
          weekOfYear: currentWeek,
          isActive: true
        };

        console.log(`Creating fresh deployment: ${location.address} with coordinates: lat=${deployment.latitude}, lng=${deployment.longitude}`);

        await storage.createCameraDeployment(deployment);
        newDeployments++;
      }

      console.log(`Created ${newDeployments} fresh deployments for current locations`);
    } catch (error) {
      console.error('Error saving deployment history:', error);
    }
  }

  private getWeekOfYear(date: Date): string {
    const year = date.getFullYear();
    const start = new Date(year, 0, 1);
    const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + start.getDay() + 1) / 7);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  async forceRefresh(): Promise<void> {
    console.log('Force refreshing camera locations...');
    await storage.clearAllCameraLocations();
    await storage.clearHistoricalDeployments();
    await this.initializeLocations();
  }
}

export const scraper = new DavenportScraper();
