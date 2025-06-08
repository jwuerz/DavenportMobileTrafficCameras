import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scheduler } from "./scheduler";
import { insertUserSchema } from "@shared/schema";
import { sendTestNotification, sendWelcomeEmail } from "./emailService";
import { z } from "zod";

// Initialize the scheduler
scheduler.initialize();

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
      const locations = await storage.getActiveCameraLocations();

      res.json({
        subscribers: users.length,
        locationsMonitored: locations.length,
        lastUpdate: locations.length > 0 ? locations[0].lastUpdated : new Date()
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

  // Test Brevo email integration
  app.post('/api/test-email', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const result = await sendTestNotification(email);
      if (result) {
        res.json({ message: 'Test email sent successfully' });
      } else {
        res.status(500).json({ error: 'Failed to send test email' });
      }
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/test-welcome-email', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const result = await sendWelcomeEmail(email);
      if (result) {
        res.json({ message: 'Test welcome email sent successfully' });
      } else {
        res.status(500).json({ error: 'Failed to send test welcome email' });
      }
    } catch (error) {
      console.error('Test welcome email error:', error);
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
      const deployments = await storage.getAllCameraDeployments();
      res.json(deployments);
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
        currentActiveDeployments: currentDeployments.length,
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

  // Force refresh - clear all deployments and rescrape
  app.post("/api/deployments/force-refresh", async (req, res) => {
    try {
      console.log('Starting force refresh - clearing all deployments and rescaping...');
      
      // Clear all existing camera locations and deployments
      await storage.clearAllCameraLocations();
      await storage.clearHistoricalDeployments();
      
      console.log('Cleared all existing data, starting fresh scrape...');
      
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

  const httpServer = createServer(app);
  return httpServer;
}