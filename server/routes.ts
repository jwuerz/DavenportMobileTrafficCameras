import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scheduler } from "./scheduler";
import { insertUserSchema } from "@shared/schema";
import { sendTestNotification, sendWelcomeEmail } from "./emailService";
import { fcmService } from "./fcmService";
import { z } from "zod";

// Initialize the scheduler
scheduler.initialize();

// Helper function to get week of year
function getWeekOfYear(date: Date): string {
  const year = date.getFullYear();
  const start = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + start.getDay() + 1) / 7);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

export async function registerRoutes(app: Express): Promise<Server> {

  // Get all active camera locations
  app.get("/api/camera-locations", async (req, res) => {
    try {
      const locations = await storage.getActiveCameraLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching camera locations:", error);
      res.status(500).json({ message: "Failed to fetch camera locations" });
    }
  });

  // Subscribe to notifications
  app.post("/api/subscribe", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        // Update existing user
        const updatedUser = await storage.updateUser(existingUser.id, {
          ...userData,
          isActive: true
        });
        res.json({ message: "Subscription updated successfully", user: updatedUser });
      } else {
        // Create new user
        const newUser = await storage.createUser(userData);

        // Send welcome email to new user
        try {
          const emailResult = await sendWelcomeEmail(userData.email);
          if (!emailResult.success) {
            console.error("Failed to send welcome email:", emailResult.error);
            // Don't fail the signup if email fails, just log it
          }
        } catch (error) {
          console.error("Error sending welcome email:", error);
          // Don't fail the signup if email fails, just log it
        }

        res.json({ message: "Subscription created successfully", user: newUser });
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid subscription data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create subscription" });
      }
    }
  });

  // Get user subscription by email
  app.post("/api/subscription/lookup", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error looking up subscription:", error);
      res.status(500).json({ message: "Failed to lookup subscription" });
    }
  });

  // Update subscription preferences
  app.put("/api/subscription/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = insertUserSchema.partial().parse(req.body);

      const updatedUser = await storage.updateUser(userId, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      res.json({ message: "Subscription updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Error updating subscription:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid update data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update subscription" });
      }
    }
  });

  // Unsubscribe
  app.delete("/api/subscription/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      // Mark user as inactive instead of deleting
      const updatedUser = await storage.updateUser(userId, { isActive: false });
      if (!updatedUser) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      res.json({ message: "Successfully unsubscribed" });
    } catch (error) {
      console.error("Error unsubscribing:", error);
      res.status(500).json({ message: "Failed to unsubscribe" });
    }
  });

  // Pause/resume subscription
  app.post("/api/subscription/:id/toggle", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      const updatedUser = await storage.updateUser(userId, { 
        isActive: !user.isActive 
      });

      res.json({ 
        message: updatedUser?.isActive ? "Subscription resumed" : "Subscription paused",
        user: updatedUser 
      });
    } catch (error) {
      console.error("Error toggling subscription:", error);
      res.status(500).json({ message: "Failed to toggle subscription" });
    }
  });

  // Manual refresh of camera locations (admin endpoint)
  app.post("/api/refresh-locations", async (req, res) => {
    try {
      const hasChanges = await scheduler.runManualCheck();
      res.json({ 
        message: hasChanges ? "Locations updated successfully" : "No changes detected",
        hasChanges 
      });
    } catch (error) {
      console.error("Error refreshing locations:", error);
      res.status(500).json({ message: "Failed to refresh locations" });
    }
  });

  // Get subscription statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const users = await storage.getAllActiveUsers();
      const currentMobileLocations = await storage.getActiveCameraLocations();
      const allDeployments = await storage.getAllCameraDeployments();
      const stationaryCameras = await storage.getActiveStationaryCameras();

      // Current Mobile Camera Locations = Active mobile cameras for this week
      const currentMobileCount = currentMobileLocations.filter(loc => loc.type === 'mobile').length;

      // Total Historical Camera Locations = All deployments + stationary cameras
      const totalHistoricalCount = allDeployments.length + stationaryCameras.length;

      res.json({
        subscribers: users.length,
        currentMobileLocations: currentMobileCount,
        totalHistoricalLocations: totalHistoricalCount,
        locationsMonitored: currentMobileCount, // Legacy field for compatibility
        lastUpdate: currentMobileLocations.length > 0 ? currentMobileLocations[0].lastUpdated : new Date()
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Update coordinates for existing deployments
  app.post("/api/update-coordinates", async (req, res) => {
    try {
      const { updateDeploymentCoordinates } = await import('./updateCoordinates');
      await updateDeploymentCoordinates();
      res.json({ message: "Coordinates updated successfully" });
    } catch (error) {
      console.error('Error updating coordinates:', error);
      res.status(500).json({ error: "Failed to update coordinates" });
    }
  });

  // Update historical deployment geocoding with Google Maps API
  app.post("/api/update-historical-geocoding", async (req, res) => {
    try {
      const { updateHistoricalDeploymentGeocoding } = await import('./updateHistoricalGeocoding');
      const result = await updateHistoricalDeploymentGeocoding();
      res.json({ 
        message: "Historical geocoding update completed",
        ...result
      });
    } catch (error) {
      console.error('Error updating historical geocoding:', error);
      res.status(500).json({ 
        error: "Failed to update historical geocoding",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Register FCM token for user
  app.post('/api/register-fcm', async (req, res) => {
    const { email, fcmToken } = req.body;

    if (!email || !fcmToken) {
      return res.status(400).json({ error: 'Email and FCM token are required' });
    }

    try {
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updatedUser = await storage.updateUser(user.id, { fcmToken });
      res.json({ 
        message: 'FCM token registered successfully',
        user: updatedUser 
      });
    } catch (error) {
      console.error('FCM token registration error:', error);
      res.status(500).json({ error: 'Failed to register FCM token' });
    }
  });

  // Test FCM notification endpoint
  app.post('/api/test-fcm', async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    try {
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (!user.fcmToken) {
        return res.status(400).json({ message: 'User has no FCM token registered' });
      }

      const result = await fcmService.testNotification(user.fcmToken);
      if (result.success) {
        res.json({ message: 'Test FCM notification sent successfully' });
      } else {
        res.status(500).json({ error: result.error || 'Failed to send FCM notification' });
      }
    } catch (error) {
      console.error('Test FCM error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get FCM service status
  app.get('/api/fcm-status', async (req, res) => {
    try {
      const users = await storage.getAllActiveUsers();
      const usersWithTokens = users.filter(user => user.fcmToken).length;

      res.json({
        configured: fcmService.isConfigured(),
        totalUsers: users.length,
        usersWithTokens,
        mode: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      console.error('FCM status error:', error);
      res.status(500).json({ error: 'Failed to get FCM status' });
    }
  });

  // Historical data recovery endpoint
  app.post('/api/restore-historical-data', async (req, res) => {
    try {
      const { historicalRecords } = req.body;

      if (!Array.isArray(historicalRecords) || historicalRecords.length === 0) {
        return res.status(400).json({ 
          error: 'historicalRecords array is required and must not be empty' 
        });
      }

      // Validate each record has required fields
      const requiredFields = ['address', 'startDate', 'type'];
      for (const record of historicalRecords) {
        for (const field of requiredFields) {
          if (!record[field]) {
            return res.status(400).json({ 
              error: `Missing required field: ${field}` 
            });
          }
        }
      }

      // Helper functions moved outside
      const splitLocationString = (locationString: string): string[] => {
        const delimiters = /\s*[–\-&]\s*|\s+and\s+/gi;
        const parts = locationString.split(delimiters)
          .map((part: string) => part.trim())
          .filter((part: string) => part.length > 5);
        return parts.length <= 1 ? [locationString.trim()] : parts;
      };

      const getWeekOfYear = (date: Date): string => {
        const year = date.getFullYear();
        const start = new Date(year, 0, 1);
        const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
        const week = Math.ceil((days + start.getDay() + 1) / 7);
        return `${year}-W${week.toString().padStart(2, '0')}`;
      };

      // Import the historical data with address splitting
      let imported = 0;
      let combinedRecordsProcessed = 0;

      for (const record of historicalRecords) {
        // Split addresses if they contain delimiters
        const addresses = splitLocationString(record.address);

        if (addresses.length > 1) {
          combinedRecordsProcessed++;
        }

        for (const address of addresses) {
          const weekOfYear = getWeekOfYear(new Date(record.startDate));

          await storage.createCameraDeployment({
            address: address.trim(),
            type: record.type,
            description: record.description || 'Restored historical deployment',
            schedule: record.schedule || `Historical - Week ${weekOfYear}`,
            startDate: record.startDate,
            endDate: record.endDate || record.startDate,
            weekOfYear,
            isActive: false,
            latitude: null,
            longitude: null
          });

          imported++;
        }
      }

      res.json({
        success: true,
        message: `Successfully restored ${imported} historical deployment records from ${historicalRecords.length} original records`,
        imported,
        combinedRecordsProcessed,
        originalRecords: historicalRecords.length
      });

    } catch (error) {
      console.error('Error restoring historical data:', error);
      res.status(500).json({ 
        error: 'Failed to restore historical data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get summary of data loss for recovery planning
  app.get('/api/data-loss-summary', async (req, res) => {
    try {
      const allDeployments = await storage.getAllCameraDeployments();
      const earliestDate = allDeployments.length > 0 ? 
        Math.min(...allDeployments.map(d => new Date(d.startDate).getTime())) : null;

      res.json({
        totalDeployments: allDeployments.length,
        activeDeployments: allDeployments.filter(d => d.isActive).length,
        historicalDeployments: allDeployments.filter(d => !d.isActive).length,
        earliestDate: earliestDate ? new Date(earliestDate).toISOString() : null,
        dataLossIssue: {
          description: "Historical data from before June 12, 2025 was lost during address splitting implementation",
          recoveryOptions: [
            "Use /api/restore-historical-data endpoint to import legitimate historical data from external sources",
            "Provide CSV or JSON data with fields: address, startDate, endDate, type, description, schedule"
          ]
        }
      });
    } catch (error) {
      console.error('Error getting data loss summary:', error);
      res.status(500).json({ error: 'Failed to get data summary' });
    }
  });

  // Test welcome email endpoint
  app.post('/api/test-welcome-email', async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    try {
      const result = await sendWelcomeEmail(email);
      if (result.success) {
        res.json({ message: 'Test welcome email sent successfully' });
      } else {
        res.status(500).json({ error: result.error || 'Failed to send welcome email' });
      }
    } catch (error) {
      console.error('Welcome email test error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Test camera update email endpoint
  app.post('/api/test-email', async (req, res) => {
    const { email, customSubject } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    try {
      const result = await sendTestNotification(email, customSubject);
      if (result.success) {
        res.json({ message: 'Test email sent successfully' });
      } else {
        res.status(500).json({ error: result.error || 'Failed to send test email' });
      }
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get current camera deployments with coordinates
  app.get("/api/deployments/current", async (req, res) => {
    try {
      const deployments = await storage.getCurrentDeployments();
      res.json(deployments);
    } catch (error) {
      console.error("Error fetching current deployments:", error);
      res.status(500).json({ message: "Failed to fetch current deployments" });
    }
  });

  // Get historical camera deployments (all deployments for historical view)
  app.get("/api/deployments/historical", async (req, res) => {
    try {
      const allDeployments = await storage.getAllCameraDeployments();
      const currentDeployments = await storage.getCurrentDeployments();

      // Mark deployments as active if they're in the current deployments list
      const currentDeploymentIds = new Set(currentDeployments.map(d => d.id));

      const deploymentsWithCorrectStatus = allDeployments.map(deployment => ({
        ...deployment,
        isActive: currentDeploymentIds.has(deployment.id)
      }));

      res.json(deploymentsWithCorrectStatus);
    } catch (error) {
      console.error("Error fetching historical deployments:", error);
      res.status(500).json({ message: "Failed to fetch historical deployments" });
    }
  });

  // Get deployments by date range
  app.get("/api/deployments/range", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      const deployments = await storage.getCameraDeploymentsByDateRange(
        startDate as string,
        endDate as string
      );
      res.json(deployments);
    } catch (error) {
      console.error("Error fetching deployments by date range:", error);
      res.status(500).json({ message: "Failed to fetch deployments" });
    }
  });

  // Stationary camera routes
  app.get("/api/stationary-cameras", async (req, res) => {
    try {
      const cameras = await storage.getAllStationaryCameras();
      res.json(cameras);
    } catch (error) {
      console.error("Error fetching stationary cameras:", error);
      res.status(500).json({ message: "Failed to fetch stationary cameras" });
    }
  });

  app.get("/api/stationary-cameras/active", async (req, res) => {
    try {
      const cameras = await storage.getActiveStationaryCameras();
      res.json(cameras);
    } catch (error) {
      console.error("Error fetching active stationary cameras:", error);
      res.status(500).json({ message: "Failed to fetch active stationary cameras" });
    }
  });

  // Get deployments by week
  app.get("/api/deployments/week/:weekOfYear", async (req, res) => {
    try {
      const { weekOfYear } = req.params;
      const deployments = await storage.getCameraDeploymentsByWeek(weekOfYear);
      res.json(deployments);
    } catch (error) {
      console.error("Error fetching deployments by week:", error);
      res.status(500).json({ message: "Failed to fetch deployments" });
    }
  });

  // Get all deployments for mapping
  app.get("/api/deployments", async (req, res) => {
    try {
      const deployments = await storage.getAllCameraDeployments();
      res.json(deployments);
    } catch (error) {
      console.error("Error fetching all deployments:", error);
      res.status(500).json({ message: "Failed to fetch deployments" });
    }
  });

  // Analyze deployment data for duplicates and configuration issues
  app.get("/api/deployments/analyze", async (req, res) => {
    try {
      const allDeployments = await storage.getAllCameraDeployments();
      const currentDeployments = await storage.getCurrentDeployments();
      const currentLocations = await storage.getActiveCameraLocations();
      const stationaryCameras = await storage.getActiveStationaryCameras();

      console.log(`Analysis: ${allDeployments.length} mobile deployments, ${stationaryCameras.length} stationary cameras, ${currentDeployments.length} current deployments, ${currentLocations.length} current locations`);

      // Group by address to find duplicates
      const groupedByAddress = allDeployments.reduce((acc, deployment) => {
        const normalizedAddress = deployment.address.toLowerCase().trim();
        if (!acc[normalizedAddress]) {
          acc[normalizedAddress] = [];
        }
        acc[normalizedAddress].push(deployment);
        return acc;
      }, {} as Record<string, any[]>);

      // Find addresses with multiple deployments
      const duplicateAddresses = Object.entries(groupedByAddress)
        .filter(([_, deployments]) => deployments.length > 1)
        .map(([address, deployments]) => ({
          address,
          count: deployments.length,
          deployments: deployments.map(d => ({
            id: d.id,
            startDate: d.startDate,
            endDate: d.endDate,
            isActive: d.isActive,
            weekOfYear: d.weekOfYear
          }))
        }));

      // Find deployments missing coordinates
      const missingCoordinates = allDeployments.filter(d => 
        !d.latitude || !d.longitude || 
        isNaN(parseFloat(d.latitude)) || isNaN(parseFloat(d.longitude))
      );

      // Find overlapping active deployments (same address, both active)
      const overlappingActive = Object.entries(groupedByAddress)
        .filter(([_, deployments]) => 
          deployments.filter(d => d.isActive).length > 1
        )
        .map(([address, deployments]) => ({
          address,
          activeDeployments: deployments.filter(d => d.isActive)
        }));

      const analysis = {
        totalDeployments: allDeployments.length,
        totalHistoricalLocations: allDeployments.length + stationaryCameras.length,
        currentActiveDeployments: currentDeployments.length,
        currentLocations: currentLocations.length,
        stationaryCameras: stationaryCameras.length,
        uniqueAddresses: Object.keys(groupedByAddress).length,
        duplicateAddresses,
        missingCoordinates: missingCoordinates.map(d => ({
          id: d.id,
          address: d.address,
          startDate: d.startDate,
          latitude: d.latitude,
          longitude: d.longitude
        })),
        overlappingActive,
        summary: {
          hasDuplicates: duplicateAddresses.length > 0,
          hasOverlappingActive: overlappingActive.length > 0,
          missingCoordinatesCount: missingCoordinates.length
        }
      };

      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing deployments:", error);
      res.status(500).json({ message: "Failed to analyze deployments" });
    }
  });

  // Clear historical deployment data (admin endpoint)
  app.post("/api/clear-deployment-history", async (req, res) => {
    try {
      await storage.clearHistoricalDeployments();
      res.json({ message: "Historical deployment data cleared successfully" });
    } catch (error) {
      console.error("Error clearing deployment history:", error);
      res.status(500).json({ message: "Failed to clear deployment history" });
    }
  });

  // Clean up duplicate deployments
  app.post("/api/deployments/cleanup", async (req, res) => {
    try {
      const allDeployments = await storage.getAllCameraDeployments();

      // Group by normalized address
      const groupedByAddress = allDeployments.reduce((acc, deployment) => {
        const normalizedAddress = deployment.address.toLowerCase().trim();
        if (!acc[normalizedAddress]) {
          acc[normalizedAddress] = [];
        }
        acc[normalizedAddress].push(deployment);
        return acc;
      }, {} as Record<string, any[]>);

      let cleanedCount = 0;
      let keptCount = 0;

      // For each address group, keep only the most recent deployment
      for (const [address, deployments] of Object.entries(groupedByAddress)) {
        if (deployments.length > 1) {
          // Sort by start date (most recent first)
          deployments.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

          // Keep the first (most recent) deployment, mark others for deletion
          const toKeep = deployments[0];
          const toDelete = deployments.slice(1);

          console.log(`Address: ${address}`);
          console.log(`Keeping deployment ID ${toKeep.id} from ${toKeep.startDate}`);
          console.log(`Removing ${toDelete.length} duplicate(s)`);

          // Ensure the kept deployment is marked as active
          await storage.updateCameraDeployment(toKeep.id, {
            isActive: true,
            endDate: null
          });

          // Delete duplicates using the storage method
          for (const duplicate of toDelete) {
            await storage.deleteCameraDeployment(duplicate.id);
            cleanedCount++;
          }

          keptCount++;
        } else {
          // Ensure single deployments are also marked as active
          const deployment = deployments[0];
          await storage.updateCameraDeployment(deployment.id, {
            isActive: true,
            endDate: null
          });
          keptCount++;
        }
      }

      res.json({ 
        message: `Cleanup completed. Removed ${cleanedCount} duplicates, kept ${keptCount} unique deployments.`,
        removed: cleanedCount,
        kept: keptCount
      });
    } catch (error) {
      console.error("Error cleaning duplicates:", error);
      res.status(500).json({ message: "Failed to clean duplicate deployments" });
    }
  });

  // Clean up duplicate historical deployments only (preserves current active deployments)
  app.post("/api/deployments/cleanup-historical", async (req, res) => {
    try {
      console.log('Cleaning up duplicate historical deployments...');

      // Only get historical (inactive) deployments
      const historicalDeployments = await storage.getHistoricalDeployments();

      // Group by address
      const groupedByAddress = historicalDeployments.reduce((acc, deployment) => {
        const normalizedAddress = deployment.address.toLowerCase().trim();
        if (!acc[normalizedAddress]) {
          acc[normalizedAddress] = [];
        }
        acc[normalizedAddress].push(deployment);
        return acc;
      }, {} as Record<string, any[]>);

      let cleanedCount = 0;
      let keptCount = 0;

      // For each address group, keep only the most recent historical deployment
      for (const [address, deployments] of Object.entries(groupedByAddress)) {
        if (deployments.length > 1) {
          // Sort by start date (most recent first)
          deployments.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

          // Keep the first (most recent), delete others
          const toKeep = deployments[0];
          const toDelete = deployments.slice(1);

          console.log(`Historical cleanup - keeping deployment ID ${toKeep.id} from ${toKeep.startDate}, removing ${toDelete.length} older duplicate(s)`);

          // Delete duplicates
          for (const duplicate of toDelete) {
            await storage.deleteCameraDeployment(duplicate.id);
            cleanedCount++;
          }

          keptCount++;
        } else {
          keptCount++;
        }
      }

      res.json({ 
        message: `Historical cleanup completed. Removed ${cleanedCount} duplicate historical deployments, kept ${keptCount} unique historical records. Current active deployments were not affected.`,
        removed: cleanedCount,
        kept: keptCount
      });
    } catch (error) {
      console.error("Error cleaning historical duplicates:", error);
      res.status(500).json({ message: "Failed to clean historical duplicates" });
    }
  });

  // Force refresh - clear only current data, preserve historical deployments
  app.post("/api/deployments/force-refresh", async (req, res) => {
    try {
      console.log('Starting force refresh - clearing current data while preserving historical deployments...');

      // SAFETY: Only clear current active locations, preserve historical deployments
      await storage.clearAllCameraLocations();

      // End current active deployments but keep historical records intact
      const currentDeployments = await storage.getCurrentDeployments();
      if (currentDeployments.length > 0) {
        await storage.endCurrentDeployments(new Date().toISOString().split('T')[0]);
        console.log(`Ended ${currentDeployments.length} current deployments while preserving historical data`);
      }

      console.log('Cleared current data only, preserving historical deployments. Starting fresh scrape...');

      // Force rescrape and reinitialize
      const { scraper } = await import('./scraper');
      await scraper.initializeLocations();

      // Get the fresh data
      const newLocations = await storage.getActiveCameraLocations();
      const newDeployments = await storage.getCurrentDeployments();

      console.log(`Force refresh completed. Created ${newLocations.length} locations and ${newDeployments.length} deployments.`);

      res.json({ 
        message: `Force refresh completed successfully. Created ${newLocations.length} locations and ${newDeployments.length} deployments.`,
        locations: newLocations.length,
        deployments: newDeployments.length
      });
    } catch (error) {
      console.error("Error during force refresh:", error);
      res.status(500).json({ message: "Failed to complete force refresh" });
    }
  });

  // Sync deployments with current camera locations
  app.post("/api/sync-deployments", async (req, res) => {
    try {
      console.log('Starting deployment sync with current camera locations...');

      const currentLocations = await storage.getActiveCameraLocations();
      const currentDeployments = await storage.getCurrentDeployments();

      console.log(`Found ${currentLocations.length} current locations and ${currentDeployments.length} current deployments`);

      if (currentLocations.length === 0) {
        return res.status(400).json({ message: "No current camera locations found to sync" });
      }

      // Create a map of existing deployment addresses (normalized)
      const existingDeploymentAddresses = new Set(
        currentDeployments.map(d => d.address.toLowerCase().trim())
      );

      // Find locations that don't have corresponding deployments
      const locationsNeedingDeployments = currentLocations.filter(location => 
        !existingDeploymentAddresses.has(location.address.toLowerCase().trim())
      );

      console.log(`Found ${locationsNeedingDeployments.length} locations that need deployment records`);

      if (locationsNeedingDeployments.length === 0) {
        return res.json({
          message: "All locations already have deployment records",
          locations: currentLocations.length,
          deployments: currentDeployments.length,
          created: 0
        });
      }

      // Create deployment records for missing locations
      const today = new Date().toISOString().split('T')[0];
      const currentWeek = getWeekOfYear(new Date());
      let createdCount = 0;

      const { geocodingService } = await import('./geocoding');

      for (const location of locationsNeedingDeployments) {
        console.log(`Creating deployment for: ${location.address}`);
        
        // Get coordinates for the address
        const geocodeResult = await geocodingService.geocodeAddress(location.address);
        
        const deployment = {
          address: location.address,
          type: location.type,
          description: location.description,
          schedule: location.schedule,
          latitude: geocodeResult?.latitude?.toString() || null,
          longitude: geocodeResult?.longitude?.toString() || null,
          startDate: today,
          endDate: null,
          weekOfYear: currentWeek,
          isActive: true
        };

        await storage.createCameraDeployment(deployment);
        createdCount++;
        
        console.log(`Created deployment for ${location.address} with coordinates: lat=${deployment.latitude}, lng=${deployment.longitude}`);
      }

      // Get final counts
      const finalLocations = await storage.getActiveCameraLocations();
      const finalDeployments = await storage.getCurrentDeployments();

      console.log(`Sync completed. Created ${createdCount} new deployments. Final: ${finalLocations.length} locations, ${finalDeployments.length} deployments`);

      res.json({
        message: `Successfully synced deployments. Created ${createdCount} new deployment records.`,
        locations: finalLocations.length,
        deployments: finalDeployments.length,
        created: createdCount
      });

    } catch (error) {
      console.error("Error syncing deployments:", error);
      res.status(500).json({ message: "Failed to sync deployments" });
    }
  });

  // Firebase Cloud Messaging endpoints

  // Register FCM token for a user
  app.post("/api/fcm-token", async (req, res) => {
    try {
      const { email, fcmToken } = req.body;

      if (!email || !fcmToken) {
        return res.status(400).json({ message: "Email and FCM token are required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update user with FCM token
      const updatedUser = await storage.updateUser(user.id, { fcmToken });
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update FCM token" });
      }

      console.log(`FCM token registered for user: ${email}`);
      res.json({ message: "FCM token registered successfully" });
    } catch (error) {
      console.error("Error registering FCM token:", error);
      res.status(500).json({ message: "Failed to register FCM token" });
    }
  });

  // Test Firebase push notification
  app.post("/api/test-fcm", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Find user and their FCM token
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.fcmToken) {
        return res.status(400).json({ message: "User has no FCM token registered" });
      }

      // Send test notification
      const result = await fcmService.testNotification(user.fcmToken);

      if (result.success) {
        res.json({ message: "Test FCM notification sent successfully" });
      } else {
        console.error("FCM test failed:", result.error);
        res.status(500).json({ 
          message: "Failed to send test notification", 
          error: result.error 
        });
      }
    } catch (error) {
      console.error("Error testing FCM:", error);
      res.status(500).json({ message: "Failed to test FCM notification" });
    }
  });

  // Get FCM service status
  app.get("/api/fcm-status", async (req, res) => {
    try {
      const isConfigured = fcmService.isConfigured();
      const users = await storage.getAllActiveUsers();
      const usersWithTokens = users.filter(user => user.fcmToken).length;

      res.json({
        configured: isConfigured,
        totalUsers: users.length,
        usersWithTokens,
        mode: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      console.error("Error getting FCM status:", error);
      res.status(500).json({ message: "Failed to get FCM status" });
    }
  });

  // Test push notification with custom data
  app.post("/api/test-push-notification", async (req, res) => {
    try {
      const { fcmToken, notification, data } = req.body;

      if (!fcmToken) {
        return res.status(400).json({ message: "FCM token is required" });
      }

      if (!notification || !notification.title || !notification.body) {
        return res.status(400).json({ message: "Notification title and body are required" });
      }

      // Send custom test notification
      const result = await fcmService.sendNotification(fcmToken, {
        title: notification.title,
        body: notification.body,
        data: data || {}
      });

      if (result.success) {
        res.json({ message: "Test push notification sent successfully" });
      } else {
        console.error("Push notification test failed:", result.error);
        res.status(500).json({ 
          message: "Failed to send test notification", 
          error: result.error 
        });
      }
    } catch (error) {
      console.error("Error testing push notification:", error);
      res.status(500).json({ message: "Failed to test push notification" });
    }
  });

  // Test camera update notification
  app.post("/api/test-camera-notification", async (req, res) => {
    try {
      const { fcmToken } = req.body;

      if (!fcmToken) {
        return res.status(400).json({ message: "FCM token is required" });
      }

      // Send camera update test notification
      const result = await fcmService.sendCameraUpdateNotification([fcmToken], 5);

      if (result.length > 0 && result[0].success) {
        res.json({ message: "Camera update notification sent successfully" });
      } else {
        console.error("Camera notification test failed:", result[0]?.error);
        res.status(500).json({ 
          message: "Failed to send camera update notification", 
          error: result[0]?.error 
        });
      }
    } catch (error) {
      console.error("Error testing camera notification:", error);
      res.status(500).json({ message: "Failed to test camera notification" });
    }
  });

  // Comprehensive notification test endpoint
  app.post("/api/test-notification", async (req, res) => {
    try {
      const { type, fcmToken, email } = req.body;

      if (!type) {
        return res.status(400).json({ message: "Test type is required" });
      }

      let results = [];

      switch (type) {
        case 'firebase':
          if (!fcmToken) {
            return res.status(400).json({ message: "FCM token is required for Firebase test" });
          }

          const fcmResult = await fcmService.testNotification(fcmToken);
          results.push({
            type: 'firebase',
            success: fcmResult.success,
            message: fcmResult.message || fcmResult.error
          });
          break;

        case 'firebase-all':
          // Send test to all users with FCM tokens
          const users = await storage.getAllActiveUsers();
          const usersWithTokens = users.filter(user => user.fcmToken);

          if (usersWithTokens.length === 0) {
            return res.json({
              success: false,
              message: "No users with Firebase tokens found",
              sentCount: 0
            });
          }

          const tokens = usersWithTokens.map(user => user.fcmToken).filter(token => token !== null) as string[];
          const batchResults = await fcmService.sendNotificationToMultipleTokens(tokens, {
            title: "🚦 Test Notification",
            body: `Camera alert system test - sent to ${tokens.length} devices`,
            data: {
              type: "test",
              timestamp: new Date().toISOString()
            }
          });

          const successCount = batchResults.filter(result => result.success).length;

          return res.json({
            success: successCount > 0,
            message: `Test sent to ${successCount}/${tokens.length} devices`,
            sentCount: successCount,
            totalUsers: usersWithTokens.length,
            results: batchResults
          });

        case 'email':
          if (!email) {
            return res.status(400).json({ message: "Email is required for email test" });
          }

          const emailResult = await sendTestNotification(email);
          results.push({
            type: 'email',
            success: emailResult.success,
            message: emailResult.message || emailResult.error
          });
          break;

        default:
          return res.status(400).json({ message: "Invalid test type" });
      }

      const overallSuccess = results.every(result => result.success);
      res.json({
        success: overallSuccess,
        results,
        message: overallSuccess ? "All tests passed" : "Some tests failed"
      });

    } catch (error) {
      console.error("Error in comprehensive notification test:", error);
      res.status(500).json({ 
        success: false,
        message: "Test failed with error",
        error: (error as Error).message
      });
    }
  });

  // Get users with Firebase tokens (for testing)
  app.get("/api/firebase-users", async (req, res) => {
    try {
      const users = await storage.getAllActiveUsers();
      const firebaseUsers = users.filter(user => user.fcmToken).map(user => ({
        id: user.id,
        email: user.email,
        hasToken: !!user.fcmToken,
        tokenPreview: user.fcmToken ? `${user.fcmToken.substring(0, 20)}...` : null,
        notificationPreferences: user.notificationPreferences,
        createdAt: user.createdAt
      }));

      res.json({
        totalUsers: users.length,
        firebaseUsers: firebaseUsers.length,
        users: firebaseUsers
      });
    } catch (error) {
      console.error("Error getting Firebase users:", error);
      res.status(500).json({ message: "Failed to get Firebase users" });
    }
  });

  // Notification tracking endpoints
  app.get("/api/notification-status", async (req, res) => {
    try {
      const { notificationTracker } = await import('./notificationTracker');
      const status = await notificationTracker.getNotificationStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting notification status:", error);
      res.status(500).json({ message: "Failed to get notification status" });
    }
  });

  app.post("/api/force-send-notifications", async (req, res) => {
    try {
      const { notificationTracker } = await import('./notificationTracker');
      const result = await notificationTracker.forceSendTodaysNotifications();

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error("Error forcing notifications:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to send notifications",
        error: (error as Error).message
      });
    }
  });

  app.post("/api/check-pending-notifications", async (req, res) => {
    try {
      const { notificationTracker } = await import('./notificationTracker');
      await notificationTracker.checkPendingNotifications();
      res.json({ message: "Checked for pending notifications" });
    } catch (error) {
      console.error("Error checking pending notifications:", error);
      res.status(500).json({ message: "Failed to check pending notifications" });
    }
  });

  // Notification fixer endpoints
  app.get("/api/notification-check", async (req, res) => {
    try {
      const { notificationFixer } = await import('./notificationFixer');
      const status = await notificationFixer.checkTodaysNotifications();
      res.json(status);
    } catch (error) {
      console.error("Error checking today's notifications:", error);
      res.status(500).json({ message: "Failed to check notifications" });
    }
  });

  app.post("/api/send-missed-notifications", async (req, res) => {
    try {
      const { sendTodaysMissedNotifications } = await import('./missedNotifications');
      const result = await sendTodaysMissedNotifications();

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error("Error sending missed notifications:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to send missed notifications",
        error: (error as Error).message
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}