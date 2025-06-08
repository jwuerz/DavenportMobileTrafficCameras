import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scheduler } from "./scheduler";
import { insertUserSchema } from "@shared/schema";
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

server/routes.ts
  // --- Push Notification Routes ---
  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const { subscription, userId } = req.body; // Assuming userId is sent by authenticated client
      if (!subscription || !userId) {
        return res.status(400).json({ message: "Subscription object and userId are required." });
      }

      // Basic validation of subscription object
      if (!subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
        return res.status(400).json({ message: "Invalid subscription object structure." });
      }

      // TODO: Ensure userId corresponds to an authenticated user
      // For now, trusting userId passed from client. In production, verify against session/token.
      // Attempt to import storage correctly based on likely project structure
      const { storage } = await import('./storage'); // Or directly use if globally available
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
          return res.status(404).json({ message: "User not found." });
      }

      const createdSubscription = await storage.createPushSubscription(user.id, subscription);
      if (createdSubscription) {
        res.status(201).json({ message: "Push subscription saved.", subscriptionId: createdSubscription.id });

        if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
          const webpush = await import('web-push');
          webpush.setVapidDetails(
            `mailto:${process.env.FROM_EMAIL || 'davenport-alerts@example.com'}`,
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
          );
          const payload = JSON.stringify({
            title: 'Davenport Alerts',
            body: 'You are now subscribed to push notifications!',
            icon: '/icon-192x192.png',
          });
          try {
            await webpush.sendNotification(subscription, payload);
            console.log('Welcome push notification sent to new subscriber.');
          } catch (error) {
            console.error('Error sending welcome push notification:', error);
          }
        }

      } else {
        res.status(500).json({ message: "Failed to save push subscription." });
      }
    } catch (error) {
      console.error("Error in /api/push/subscribe:", error);
      // Check for drizzle specific unique constraint error or generic error
      if (error.message && error.message.includes('duplicate key value violates unique constraint')) { // pg specific
        return res.status(409).json({ message: "This push subscription endpoint already exists." });
      }
      res.status(500).json({ message: "Internal server error." });
    }
  });

  app.post("/api/push/unsubscribe", async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ message: "Subscription endpoint is required." });
      }
      const { storage } = await import('./storage'); // Or directly use
      const success = await storage.deletePushSubscription(endpoint);
      if (success) {
        res.status(200).json({ message: "Push subscription deleted." });
      } else {
        res.status(404).json({ message: "Push subscription not found or failed to delete." });
      }
    } catch (error) {
      console.error("Error in /api/push/unsubscribe:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
