import { storage } from './storage';
import { sendCameraUpdateNotification } from './emailService';
import { fcmService } from './fcmService';

export async function sendTodaysMissedNotifications(): Promise<any> {
  try {
    console.log('Checking for missed notifications from today...');
    
    // Get today's camera deployments
    const deployments = await storage.getAllCameraDeployments();
    const today = new Date().toISOString().split('T')[0];
    
    const todaysDeployments = deployments.filter(d => {
      if (!d.scrapedAt) return false;
      const scrapedDate = new Date(d.scrapedAt).toISOString().split('T')[0];
      return scrapedDate === today && d.isActive;
    });

    console.log(`Found ${todaysDeployments.length} deployments from today`);

    if (todaysDeployments.length === 0) {
      return {
        success: false,
        message: 'No camera deployments found for today',
        details: { deploymentsFound: 0 }
      };
    }

    // Convert to notification format
    const locations = todaysDeployments.map(d => ({
      address: d.address,
      type: d.type,
      description: d.description || 'Traffic enforcement location',
      schedule: d.schedule || 'Check city website for schedule'
    }));

    // Get users who should receive notifications
    const users = await storage.getAllActiveUsers();
    const eligibleUsers = users.filter(user => 
      user.notificationPreferences.includes('location_changes') || 
      user.notificationPreferences.includes('email')
    );

    console.log(`Found ${eligibleUsers.length} eligible users for notifications`);

    if (eligibleUsers.length === 0) {
      return {
        success: false,
        message: 'No eligible users for notifications',
        details: { eligibleUsers: 0 }
      };
    }

    let emailsSent = 0;
    let emailsFailed = 0;
    let fcmSent = 0;
    let fcmFailed = 0;

    // Send notifications to each user
    for (const user of eligibleUsers) {
      try {
        console.log(`Sending missed notifications to ${user.email}`);
        
        // Send email notification
        const emailResult = await sendCameraUpdateNotification(user.email, locations);
        
        if (emailResult.success) {
          emailsSent++;
          console.log(`Email sent successfully to ${user.email}`);
          
          // Log notification in database
          try {
            await storage.createNotification({
              userId: user.id,
              subject: 'Camera Location Update',
              content: `Sent notification about ${locations.length} camera locations`,
              status: 'sent'
            });
          } catch (dbError) {
            console.error(`Failed to log notification for ${user.email}:`, dbError);
          }
        } else {
          emailsFailed++;
          console.error(`Email failed for ${user.email}:`, emailResult.error);
        }

        // Send Firebase push notification if user has FCM token
        if (user.fcmToken) {
          try {
            const fcmResults = await fcmService.sendCameraUpdateNotification([user.fcmToken], locations.length);
            if (fcmResults.length > 0 && fcmResults[0].success) {
              fcmSent++;
              console.log(`FCM notification sent successfully to ${user.email}`);
            } else {
              fcmFailed++;
              console.error(`FCM notification failed for ${user.email}:`, fcmResults[0]?.error);
            }
          } catch (fcmError) {
            fcmFailed++;
            console.error(`FCM notification error for ${user.email}:`, fcmError);
          }
        }

        // Add delay between notifications to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (userError) {
        emailsFailed++;
        console.error(`Error sending notification to ${user.email}:`, userError);
      }
    }

    const result = {
      success: emailsSent > 0,
      message: `Sent notifications to ${emailsSent} users (${emailsFailed} failed)`,
      details: {
        locationsFound: locations.length,
        eligibleUsers: eligibleUsers.length,
        emailsSent,
        emailsFailed,
        fcmSent,
        fcmFailed,
        locations: locations.map(l => l.address),
        timestamp: new Date().toISOString()
      }
    };

    console.log('Missed notification sending completed:', result);
    return result;

  } catch (error) {
    console.error('Error in sendTodaysMissedNotifications:', error);
    return {
      success: false,
      message: `Error sending missed notifications: ${(error as Error).message}`,
      details: { error: (error as Error).message }
    };
  }
}