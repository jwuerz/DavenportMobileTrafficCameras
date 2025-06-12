import cron from 'node-cron';
import { scraper } from './scraper';

export class NotificationScheduler {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('Initializing notification scheduler...');
    
    // Initialize camera locations on startup
    await scraper.initializeLocations();

    // Schedule checks every 4 hours to reduce frequency
    cron.schedule('0 */4 * * *', async () => {
      console.log('Running scheduled camera location check...');
      try {
        await scraper.checkForUpdates();
      } catch (error) {
        console.error('Scheduled check failed:', error);
      }
    });

    // Schedule one check per day during business hours (9 AM) for consistency
    cron.schedule('0 9 * * *', async () => {
      console.log('Running daily business hours check...');
      try {
        await scraper.checkForUpdates();
      } catch (error) {
        console.error('Daily check failed:', error);
      }
    });

    // Run an immediate check after a short delay
    setTimeout(async () => {
      try {
        await scraper.checkForUpdates();
      } catch (error) {
        console.error('Initial check failed:', error);
      }
    }, 10000); // 10 seconds delay

    this.isInitialized = true;
    console.log('Notification scheduler initialized successfully');
  }

  async runManualCheck(): Promise<boolean> {
    console.log('Running manual camera location check...');
    try {
      return await scraper.checkForUpdates();
    } catch (error) {
      console.error('Manual check failed:', error);
      throw error;
    }
  }
}

export const scheduler = new NotificationScheduler();
