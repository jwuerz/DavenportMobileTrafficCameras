import cron from 'node-cron';
import { scraper } from './scraper';

export class NotificationScheduler {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('Initializing notification scheduler...');
    
    // Initialize camera locations on startup
    await scraper.initializeLocations();

    // Schedule checks every hour
    cron.schedule('0 * * * *', async () => {
      console.log('Running scheduled camera location check...');
      try {
        await scraper.checkForUpdates();
      } catch (error) {
        console.error('Scheduled check failed:', error);
      }
    });

    // Schedule additional checks every 30 minutes during peak hours (7 AM - 7 PM)
    cron.schedule('*/30 7-19 * * *', async () => {
      console.log('Running peak hours camera location check...');
      try {
        await scraper.checkForUpdates();
      } catch (error) {
        console.error('Peak hours check failed:', error);
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
