import { pgTable, text, serial, boolean, timestamp, json, date, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  notificationPreferences: json("notification_preferences").$type<string[]>().notNull().default(['email']),
  fcmToken: text("fcm_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cameraLocations = pgTable("camera_locations", {
  id: serial("id").primaryKey(),
  address: text("address").notNull(),
  type: text("type").notNull(), // 'mobile', 'fixed', 'red_light'
  description: text("description"),
  schedule: text("schedule"),
  isActive: boolean("is_active").notNull().default(true),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  status: text("status").notNull().default("sent"), // 'sent', 'failed'
});

// Historical tracking of camera deployments by week/period
export const cameraDeployments = pgTable("camera_deployments", {
  id: serial("id").primaryKey(),
  address: text("address").notNull(),
  type: text("type").notNull(), // 'mobile', 'fixed', 'red_light'
  description: text("description"),
  schedule: text("schedule"),
  // Geographic coordinates for mapping
  latitude: numeric("latitude", { precision: 10, scale: 8 }),
  longitude: numeric("longitude", { precision: 11, scale: 8 }),
  // Time period for this deployment
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  weekOfYear: text("week_of_year"), // e.g., "2025-W23" for easier querying
  // Data source tracking
  scrapedAt: timestamp("scraped_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

// Stationary cameras that don't change location (red light cameras, etc.)
export const stationaryCameras = pgTable("stationary_cameras", {
  id: serial("id").primaryKey(),
  address: text("address").notNull(),
  type: text("type").notNull(), // 'red_light', 'speed', 'intersection'
  description: text("description"),
  schedule: text("schedule"),
  // Geographic coordinates for mapping
  latitude: numeric("latitude", { precision: 10, scale: 8 }),
  longitude: numeric("longitude", { precision: 11, scale: 8 }),
  // Installation and status tracking
  installDate: date("install_date"),
  status: text("status").notNull().default("active"), // 'active', 'inactive', 'unconfirmed'
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCameraLocationSchema = createInsertSchema(cameraLocations).omit({
  id: true,
  lastUpdated: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  sentAt: true,
});

export const insertCameraDeploymentSchema = createInsertSchema(cameraDeployments).omit({
  id: true,
  scrapedAt: true,
});

export const insertStationaryCameraSchema = createInsertSchema(stationaryCameras).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCameraLocation = z.infer<typeof insertCameraLocationSchema>;
export type CameraLocation = typeof cameraLocations.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertCameraDeployment = z.infer<typeof insertCameraDeploymentSchema>;
export type CameraDeployment = typeof cameraDeployments.$inferSelect;
export type InsertStationaryCamera = z.infer<typeof insertStationaryCameraSchema>;
export type StationaryCamera = typeof stationaryCameras.$inferSelect;
