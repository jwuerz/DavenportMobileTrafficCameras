import * as cheerio from 'cheerio';
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

      // Look for camera location information in various possible selectors
      const possibleSelectors = [
        '.camera-locations',
        '.traffic-enforcement',
        '.mobile-camera',
        'table tr',
        '.content p',
        '.field-items',
        '.view-content'
      ];

      let foundLocations = false;

      for (const selector of possibleSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          elements.each((_, element) => {
            const text = $(element).text().trim();
            
            // Look for patterns that indicate camera locations
            if (this.isLocationText(text)) {
              const location = this.parseLocationText(text);
              if (location) {
                locations.push(location);
                foundLocations = true;
              }
            }
          });

          if (foundLocations) break;
        }
      }

      // If no structured data found, try to extract from general text content
      if (!foundLocations) {
        const bodyText = $('body').text();
        const extractedLocations = this.extractLocationsFromText(bodyText);
        locations.push(...extractedLocations);
      }

      console.log(`Found ${locations.length} camera locations`);
      return locations;

    } catch (error) {
      console.error('Error scraping camera locations:', error);
      throw error;
    }
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

    return currentAddresses.size !== storedAddresses.size ||
           ![...currentAddresses].every(addr => storedAddresses.has(addr));
  }

  private async notifyUsers(locations: ScrapedLocation[]): Promise<void> {
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
}

export const scraper = new DavenportScraper();
