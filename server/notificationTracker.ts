import { storage } from './storage';
import { db, pool } from './db';
import { sendCameraUpdateNotification } from './emailService';
import { fcmService } from './fcmService';

interface NotificationBatch {
  id: string;
  locations: Array<{
    address: string;
    type: string;
    description: string;
    schedule: string;
  }>;
  scrapedAt: Date;
  notificationsSent: boolean;
  sentAt?: Date;
  userCount?: number;
}

export class NotificationTracker {
  private lastNotificationDate: Date | null = null;
  private notificationBatches: NotificationBatch[] = [];

  async initialize(): Promise<void> {
    // Get last notification date from database
    const lastNotification = await this.getLastNotificationDate();
    this.lastNotificationDate = lastNotification;
    console.log(`Notification tracker initialized. Last notification: ${lastNotification?.toISOString() || 'none'}`);
  }

  private async getLastNotificationDate(): Promise<Date | null> {
    try {
      const result = await db.execute(`
        SELECT MAX(sent_at) as last_notification 
        FROM notifications 
        WHERE subject LIKE '%Camera Location%'
      `);
      
      const lastNotification = result.rows[0]?.last_notification;
      return lastNotification ? new Date(lastNotification as string) : null;
    } catch (error) {
      console.error('Error getting last notification date:', error);
      return null;
    }
  }

  async checkPendingNotifications(): Promise<void> {
    try {
      // Get camera deployments created today that haven't been notified
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const deployments = await db.execute(`
        SELECT DISTINCT 
          address, 
          type, 
          description, 
          schedule,
          scraped_at
        FROM camera_deployments 
        WHERE scraped_at >= $1 
        AND is_active = true
        ORDER BY scraped_at DESC
      `, [todayStart.toISOString()]);

      if (deployments.rows.length > 0) {
        const locations = deployments.rows.map((row: any) => ({
          address: row.address as string,
          type: row.type as string,
          description: row.description as string,
          schedule: row.schedule as string
        }));

        const latestScrapedAt = new Date(deployments.rows[0].scraped_at as string);
        
        // Check if we've already sent notifications for this batch
        const shouldSendNotifications = !this.lastNotificationDate || 
          latestScrapedAt > this.lastNotificationDate;

        if (shouldSendNotifications) {
          console.log(`Found ${locations.length} camera locations that need notifications`);
          await this.sendNotificationBatch(locations, latestScrapedAt);
        } else {
          console.log('No new locations requiring notifications');
        }
      }
    } catch (error) {
      console.error('Error checking pending notifications:', error);
    }
  }

  async sendNotificationBatch(locations: Array<{address: string, type: string, description: string, schedule: string}>, scrapedAt: Date): Promise<boolean> {
    try {
      console.log(`Sending notification batch for ${locations.length} locations`);
      
      const users = await storage.getAllActiveUsers();
      const eligibleUsers = users.filter(user => 
        user.notificationPreferences.includes('location_changes') || 
        user.notificationPreferences.includes('email')
      );

      if (eligibleUsers.length === 0) {
        console.log('No eligible users for notifications');
        return false;
      }

      let emailsSent = 0;
      let emailsFailed = 0;
      let fcmSent = 0;
      let fcmFailed = 0;

      for (const user of eligibleUsers) {
        try {
          console.log(`Sending notifications to ${user.email}`);
          
          // Send email notification
          const emailResult = await sendCameraUpdateNotification(user.email, locations);
          
          if (emailResult.success) {
            emailsSent++;
            
            // Log notification in database
            await storage.createNotification({
              userId: user.id,
              subject: 'Camera Location Update',
              content: `Sent notification about ${locations.length} camera locations`,
              status: 'sent'
            });
          } else {
            emailsFailed++;
            console.error(`Email failed for ${user.email}:`, emailResult.error);
          }

          // Send Firebase push notification if user has FCM token
          if (user.fcmToken) {
            try {
              const fcmResult = await fcmService.sendCameraUpdateNotification([user.fcmToken], locations.length);
              if (fcmResult[0]?.success) {
                fcmSent++;
                console.log(`FCM notification sent to ${user.email}`);
              } else {
                fcmFailed++;
                console.error(`FCM notification failed for ${user.email}:`, fcmResult[0]?.error);
              }
            } catch (fcmError) {
              fcmFailed++;
              console.error(`FCM notification error for ${user.email}:`, fcmError);
            }
          }

          // Small delay between notifications to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (userError) {
          emailsFailed++;
          console.error(`Error sending notification to ${user.email}:`, userError);
        }
      }

      // Update last notification date
      this.lastNotificationDate = new Date();
      
      console.log(`Notification batch completed:`);
      console.log(`- Emails: ${emailsSent} sent, ${emailsFailed} failed`);
      console.log(`- FCM: ${fcmSent} sent, ${fcmFailed} failed`);
      console.log(`- Total users notified: ${emailsSent}`);

      return emailsSent > 0;
      
    } catch (error) {
      console.error('Error sending notification batch:', error);
      return false;
    }
  }

  async forceSendTodaysNotifications(): Promise<{success: boolean, message: string, details: any}> {
    try {
      // Get today's camera deployments
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const deployments = await db.execute(`
        SELECT DISTINCT 
          address, 
          type, 
          description, 
          schedule,
          scraped_at
        FROM camera_deployments 
        WHERE scraped_at >= $1 
        AND is_active = true
        ORDER BY scraped_at DESC
      `, [todayStart.toISOString()]);

      if (deployments.rows.length === 0) {
        return {
          success: false,
          message: 'No camera deployments found for today',
          details: { deploymentsFound: 0 }
        };
      }

      const locations = deployments.rows.map((row: any) => ({
        address: row.address as string,
        type: row.type as string,
        description: row.description as string,
        schedule: row.schedule as string
      }));

      const latestScrapedAt = new Date(deployments.rows[0].scraped_at as string);
      
      const success = await this.sendNotificationBatch(locations, latestScrapedAt);
      
      return {
        success,
        message: success 
          ? `Successfully sent notifications for ${locations.length} camera locations`
          : 'Failed to send notifications',
        details: {
          locationsFound: locations.length,
          scrapedAt: latestScrapedAt.toISOString(),
          locations: locations.map((l: any) => l.address)
        }
      };
      
    } catch (error) {
      console.error('Error in forceSendTodaysNotifications:', error);
      return {
        success: false,
        message: `Error sending notifications: ${(error as Error).message}`,
        details: { error: (error as Error).message }
      };
    }
  }

  async getNotificationStatus(): Promise<any> {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      // Get today's deployments
      const deployments = await db.execute(`
        SELECT COUNT(*) as count, MAX(scraped_at) as latest_scrape
        FROM camera_deployments 
        WHERE scraped_at >= $1 
        AND is_active = true
      `, [todayStart.toISOString()]);

      // Get today's notifications
      const notifications = await db.execute(`
        SELECT COUNT(*) as count, MAX(sent_at) as latest_notification
        FROM notifications 
        WHERE sent_at >= $1 
        AND subject LIKE '%Camera Location%'
      `, [todayStart.toISOString()]);

      const deploymentCount = deployments.rows[0]?.count || 0;
      const notificationCount = notifications.rows[0]?.count || 0;
      const latestScrape = deployments.rows[0]?.latest_scrape;
      const latestNotification = notifications.rows[0]?.latest_notification;

      return {
        deploymentsToday: deploymentCount,
        notificationsToday: notificationCount,
        latestScrape: latestScrape ? new Date(latestScrape as string).toISOString() : null,
        latestNotification: latestNotification ? new Date(latestNotification as string).toISOString() : null,
        needsNotification: deploymentCount > 0 && (!latestNotification || 
          (latestScrape && latestNotification && new Date(latestScrape as string) > new Date(latestNotification as string))),
        lastNotificationDate: this.lastNotificationDate?.toISOString() || null
      };
    } catch (error) {
      console.error('Error getting notification status:', error);
      return {
        error: (error as Error).message
      };
    }
  }
}

export const notificationTracker = new NotificationTracker();