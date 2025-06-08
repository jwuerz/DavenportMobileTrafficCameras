import { users, cameraLocations, notifications, cameraDeployments, type User, type InsertUser, type CameraLocation, type InsertCameraLocation, type InsertNotification, type Notification, type CameraDeployment, type InsertCameraDeployment } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, isNull } from "drizzle-orm";

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

  // Camera deployment history operations
  createCameraDeployment(deployment: InsertCameraDeployment): Promise<CameraDeployment>;
  updateCameraDeployment(id: number, updates: Partial<InsertCameraDeployment>): Promise<CameraDeployment | undefined>;
  getCameraDeploymentsByWeek(weekOfYear: string): Promise<CameraDeployment[]>;
  getCameraDeploymentsByDateRange(startDate: string, endDate: string): Promise<CameraDeployment[]>;
  getAllCameraDeployments(): Promise<CameraDeployment[]>;
  getCurrentDeployments(): Promise<CameraDeployment[]>;
  getHistoricalDeployments(): Promise<CameraDeployment[]>;
  endCurrentDeployments(endDate: string): Promise<void>;
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
    return (result.rowCount ?? 0) > 0;
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

  async createCameraDeployment(insertDeployment: InsertCameraDeployment): Promise<CameraDeployment> {
    const [deployment] = await db
      .insert(cameraDeployments)
      .values(insertDeployment)
      .returning();
    return deployment;
  }

  async updateCameraDeployment(id: number, updates: Partial<InsertCameraDeployment>): Promise<CameraDeployment | undefined> {
    const [deployment] = await db
      .update(cameraDeployments)
      .set(updates)
      .where(eq(cameraDeployments.id, id))
      .returning();
    return deployment || undefined;
  }

  async getCameraDeploymentsByWeek(weekOfYear: string): Promise<CameraDeployment[]> {
    return await db
      .select()
      .from(cameraDeployments)
      .where(eq(cameraDeployments.weekOfYear, weekOfYear))
      .orderBy(desc(cameraDeployments.startDate));
  }

  async getCameraDeploymentsByDateRange(startDate: string, endDate: string): Promise<CameraDeployment[]> {
    return await db
      .select()
      .from(cameraDeployments)
      .where(
        and(
          gte(cameraDeployments.startDate, startDate),
          lte(cameraDeployments.startDate, endDate)
        )
      )
      .orderBy(desc(cameraDeployments.startDate));
  }

  async getAllCameraDeployments(): Promise<CameraDeployment[]> {
    return await db
      .select()
      .from(cameraDeployments)
      .orderBy(desc(cameraDeployments.startDate));
  }

  async getCurrentDeployments(): Promise<CameraDeployment[]> {
    return await db
      .select()
      .from(cameraDeployments)
      .where(isNull(cameraDeployments.endDate))
      .orderBy(desc(cameraDeployments.startDate));
  }

  async getHistoricalDeployments(): Promise<CameraDeployment[]> {
    return await db
      .select()
      .from(cameraDeployments)
      .where(eq(cameraDeployments.isActive, false))
      .orderBy(desc(cameraDeployments.startDate));
  }

  async endCurrentDeployments(endDate: string): Promise<void> {
    await db
      .update(cameraDeployments)
      .set({ 
        endDate: endDate,
        isActive: false 
      })
      .where(isNull(cameraDeployments.endDate));
  }
}

export const storage = new DatabaseStorage();
