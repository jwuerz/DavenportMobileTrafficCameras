import { users, cameraLocations, notifications, type User, type InsertUser, type CameraLocation, type InsertCameraLocation, type InsertNotification, type Notification } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllActiveUsers(): Promise<User[]>;

  // Camera location operations
  getCameraLocation(id: number): Promise<CameraLocation | undefined>;
  getAllCameraLocations(): Promise<CameraLocation[]>;
  getActiveCameraLocations(): Promise<CameraLocation[]>;
  createCameraLocation(location: InsertCameraLocation): Promise<CameraLocation>;
  updateCameraLocation(id: number, updates: Partial<InsertCameraLocation>): Promise<CameraLocation | undefined>;
  deleteCameraLocation(id: number): Promise<boolean>;
  clearAllCameraLocations(): Promise<void>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email: insertUser.email,
        phone: insertUser.phone || null,
        isActive: insertUser.isActive ?? true,
        notificationPreferences: insertUser.notificationPreferences || []
      })
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getAllActiveUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isActive, true));
  }

  async getCameraLocation(id: number): Promise<CameraLocation | undefined> {
    const [location] = await db.select().from(cameraLocations).where(eq(cameraLocations.id, id));
    return location || undefined;
  }

  async getAllCameraLocations(): Promise<CameraLocation[]> {
    return await db.select().from(cameraLocations);
  }

  async getActiveCameraLocations(): Promise<CameraLocation[]> {
    return await db.select().from(cameraLocations).where(eq(cameraLocations.isActive, true));
  }

  async createCameraLocation(insertLocation: InsertCameraLocation): Promise<CameraLocation> {
    const [location] = await db
      .insert(cameraLocations)
      .values(insertLocation)
      .returning();
    return location;
  }

  async updateCameraLocation(id: number, updates: Partial<InsertCameraLocation>): Promise<CameraLocation | undefined> {
    const [location] = await db
      .update(cameraLocations)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(cameraLocations.id, id))
      .returning();
    return location || undefined;
  }

  async deleteCameraLocation(id: number): Promise<boolean> {
    const result = await db.delete(cameraLocations).where(eq(cameraLocations.id, id));
    return result.rowCount > 0;
  }

  async clearAllCameraLocations(): Promise<void> {
    await db.delete(cameraLocations);
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(insertNotification)
      .returning();
    return notification;
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId));
  }
}

export const storage = new DatabaseStorage();

// --- Push Subscription Methods ---

import { eq, and } from 'drizzle-orm';
import { pushSubscriptions, type NewPushSubscription, type PushSubscription } from '@shared/schema';
import { users } from '@shared/schema'; // Assuming users is also in @shared/schema

export async function createPushSubscription(userId: number, subscription: { endpoint: string; keys: { p256dh: string; auth: string; } }): Promise<PushSubscription | null> {
  try {
    const newSubscription: NewPushSubscription = {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    };
    // Check if endpoint already exists to prevent duplicates, or rely on unique constraint
    const existing = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, newSubscription.endpoint)).limit(1);
    if (existing.length > 0) {
      // Optionally, update the existing subscription or just return it
      console.log('Push subscription with this endpoint already exists.');
      return existing[0];
    }
    const result = await db.insert(pushSubscriptions).values(newSubscription).returning();
    return result[0] || null;
  } catch (error) {
    console.error('Error creating push subscription:', error);
    return null;
  }
}

export async function getPushSubscriptionsByUserId(userId: number): Promise<PushSubscription[]> {
  try {
    return await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  } catch (error) {
    console.error('Error fetching push subscriptions by user ID:', error);
    return [];
  }
}

export async function getAllActivePushSubscriptions(): Promise<PushSubscription[]> {
  try {
    // This needs to join with the users table to check if the user is active
    // Assuming 'users' table has an 'isActive' boolean field.
    // And 'pushSubscriptions' has 'userId' that references 'users.id'
    // This query might need adjustment based on the exact schema and relations.
    const results = await db.select({
        id: pushSubscriptions.id,
        userId: pushSubscriptions.userId,
        endpoint: pushSubscriptions.endpoint,
        p256dh: pushSubscriptions.p256dh,
        auth: pushSubscriptions.auth,
        createdAt: pushSubscriptions.createdAt
      })
      .from(pushSubscriptions)
      .innerJoin(users, eq(pushSubscriptions.userId, users.id))
      .where(eq(users.isActive, true)); // Assuming 'users' table and 'isActive' field exist

    return results;
  } catch (error) {
    console.error('Error fetching all active push subscriptions:', error);
    return [];
  }
}

export async function deletePushSubscription(endpoint: string): Promise<boolean> {
  try {
    const result = await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).returning();
    return result.length > 0;
  } catch (error) {
    console.error('Error deleting push subscription:', error);
    return false;
  }
}

export async function deletePushSubscriptionsByUserId(userId: number): Promise<boolean> {
  try {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    return true;
  } catch (error) {
    console.error('Error deleting push subscriptions by user ID:', error);
    return false;
  }
}
