import { users, cameraLocations, notifications, type User, type InsertUser, type CameraLocation, type InsertCameraLocation, type InsertNotification, type Notification } from "@shared/schema";

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private cameraLocations: Map<number, CameraLocation>;
  private notifications: Map<number, Notification>;
  private currentUserId: number;
  private currentLocationId: number;
  private currentNotificationId: number;

  constructor() {
    this.users = new Map();
    this.cameraLocations = new Map();
    this.notifications = new Map();
    this.currentUserId = 1;
    this.currentLocationId = 1;
    this.currentNotificationId = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllActiveUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.isActive);
  }

  // Camera location operations
  async getCameraLocation(id: number): Promise<CameraLocation | undefined> {
    return this.cameraLocations.get(id);
  }

  async getAllCameraLocations(): Promise<CameraLocation[]> {
    return Array.from(this.cameraLocations.values());
  }

  async getActiveCameraLocations(): Promise<CameraLocation[]> {
    return Array.from(this.cameraLocations.values()).filter(location => location.isActive);
  }

  async createCameraLocation(insertLocation: InsertCameraLocation): Promise<CameraLocation> {
    const id = this.currentLocationId++;
    const location: CameraLocation = {
      ...insertLocation,
      id,
      lastUpdated: new Date(),
    };
    this.cameraLocations.set(id, location);
    return location;
  }

  async updateCameraLocation(id: number, updates: Partial<InsertCameraLocation>): Promise<CameraLocation | undefined> {
    const location = this.cameraLocations.get(id);
    if (!location) return undefined;

    const updatedLocation = { 
      ...location, 
      ...updates, 
      lastUpdated: new Date() 
    };
    this.cameraLocations.set(id, updatedLocation);
    return updatedLocation;
  }

  async deleteCameraLocation(id: number): Promise<boolean> {
    return this.cameraLocations.delete(id);
  }

  async clearAllCameraLocations(): Promise<void> {
    this.cameraLocations.clear();
  }

  // Notification operations
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.currentNotificationId++;
    const notification: Notification = {
      ...insertNotification,
      id,
      sentAt: new Date(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(
      notification => notification.userId === userId
    );
  }
}

export const storage = new MemStorage();
