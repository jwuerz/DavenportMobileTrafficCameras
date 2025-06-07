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

  // Test Brevo email integration
  app.post("/api/test-email", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const success = await sendTestNotification(email);
      res.json({ 
        message: success 
          ? "Test email sent successfully via Brevo" 
          : "Email system ready (check logs for delivery status)",
        success
      });
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ message: "Failed to send test email" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
