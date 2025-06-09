import { storage } from './storage';
import { sendCameraUpdateNotification } from './emailService';
import { fcmService } from './fcmService';

export class NotificationFixer {
  async checkTodaysNotifications(): Promise<any> {
    try {
      // Get today's camera deployments
      const today = new Date().toISOString().split('T')[0];
      
      const deployments = await storage.getAllCameraDeployments();
      const todaysDeployments = deployments.filter(d => 
        d.scrapedAt && d.scrapedAt.toString().startsWith(today) && d.isActive
      );

      // Get today's notifications - using a simple approach
      const notifications = await storage.getNotificationsByUser(1); // Get any user's notifications as sample
      const todaysNotifications = notifications.filter(n => 
        n.sentAt && n.sentAt.toString().startsWith(today) && n.subject.includes('Camera Location')
      );

      const notificationCount = todaysNotifications.length;
      const latestNotification = todaysNotifications.length > 0 ? todaysNotifications[0].sentAt : null;

      return {
        deploymentsToday: todaysDeployments.length,
        notificationsToday: notificationCount,
        latestNotification: latestNotification,
        needsNotification: todaysDeployments.length > 0 && notificationCount === 0,
        deployments: todaysDeployments.map(d => ({
          address: d.address,
          scrapedAt: d.scrapedAt
        }))
      };
    } catch (error) {
      console.error('Error checking notifications:', error);
      return {
        error: (error as Error).message
      };
    }
  }

  async sendMissedNotifications(): Promise<any> {
    try {
      // Get today's deployments
      const today = new Date().toISOString().split('T')[0];
      const deployments = await storage.getAllCameraDeployments();
      const todaysDeployments = deployments.filter(d => 
        d.scrapedAt && d.scrapedAt.toString().startsWith(today) && d.isActive
      );

      if (todaysDeployments.length === 0) {
        return {
          success: false,
          message: 'No camera deployments found for today'
        };
      }

      // Convert to expected format
      const locations = todaysDeployments.map(d => ({
        address: d.address,
        type: d.type,
        description: d.description || 'Traffic enforcement location',
        schedule: d.schedule || 'Check city website for schedule'
      }));

      // Get eligible users
      const users = await storage.getAllActiveUsers();
      const eligibleUsers = users.filter(user => 
        user.notificationPreferences.includes('location_changes') || 
        user.notificationPreferences.includes('email')
      );

      if (eligibleUsers.length === 0) {
        return {
          success: false,
          message: 'No eligible users for notifications'
        };
      }

      let emailsSent = 0;
      let emailsFailed = 0;
      let fcmSent = 0;

      for (const user of eligibleUsers) {
        try {
          console.log(`Sending missed notifications to ${user.email}`);
          
          // Send email notification
          const emailResult = await sendCameraUpdateNotification(user.email, locations);
          
          if (emailResult.success) {
            emailsSent++;
            
            // Log notification
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

          // Send FCM if available
          if (user.fcmToken) {
            try {
              const fcmResult = await fcmService.sendCameraUpdateNotification([user.fcmToken], locations.length);
              if (fcmResult[0]?.success) {
                fcmSent++;
              }
            } catch (fcmError) {
              console.error(`FCM failed for ${user.email}:`, fcmError);
            }
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (userError) {
          emailsFailed++;
          console.error(`Error sending to ${user.email}:`, userError);
        }
      }

      return {
        success: emailsSent > 0,
        message: `Sent notifications to ${emailsSent} users`,
        details: {
          emailsSent,
          emailsFailed,
          fcmSent,
          locationsNotified: locations.length,
          locations: locations.map(l => l.address)
        }
      };

    } catch (error) {
      console.error('Error sending missed notifications:', error);
      return {
        success: false,
        message: `Error: ${(error as Error).message}`
      };
    }
  }
}

export const notificationFixer = new NotificationFixer();