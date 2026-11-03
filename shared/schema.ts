import { sql, relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  boolean,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const bloodGroupEnum = pgEnum("blood_group", [
  "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"
]);

export const userRoleEnum = pgEnum("user_role", ["user", "hospital"]);

export const requestStatusEnum = pgEnum("request_status", [
  "pending", "accepted", "completed", "cancelled"
]);

export const requestPriorityEnum = pgEnum("request_priority", ["normal", "emergency"]);

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table - supports both donors/receivers and hospitals
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").notNull().unique(),
  password: varchar("password").notNull(),
  email: varchar("email").unique(),
  profileImageUrl: varchar("profile_image_url"),
  // Blood donation specific fields
  name: varchar("name").notNull(),
  age: integer("age").default(18), // Keeping generic age field if needed, or defaulting
  bloodGroup: bloodGroupEnum("blood_group"),
  phone: varchar("phone"),
  location: varchar("location"),
  canDonate: boolean("can_donate").default(false),
  availabilityStatus: boolean("availability_status").default(false),
  donationCount: integer("donation_count").default(0),
  lastDonationDate: timestamp("last_donation_date"),
  createdByHospital: boolean("created_by_hospital").default(false),
  role: userRoleEnum("role").default("user"),
  isVerified: boolean("is_verified").default(false),
  idDocumentUrl: varchar("id_document_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Blood Requests table
export const bloodRequests = pgTable("blood_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestedById: varchar("requested_by_id").notNull().references(() => users.id),
  hospitalId: varchar("hospital_id").references(() => users.id), // The hospital selected by the recipient
  bloodGroup: bloodGroupEnum("blood_group").notNull(),
  location: varchar("location").notNull(),
  status: requestStatusEnum("status").default("pending"),
  matchedDonorId: varchar("matched_donor_id").references(() => users.id),
  priority: requestPriorityEnum("priority").default("normal"),
  unitsNeeded: integer("units_needed").default(1),
  notes: varchar("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Hospital Blood Stock table
export const hospitalBloodStock = pgTable("hospital_blood_stock", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hospitalId: varchar("hospital_id").notNull().references(() => users.id),
  bloodGroup: bloodGroupEnum("blood_group").notNull(),
  unitsAvailable: integer("units_available").default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Relations
export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  message: varchar("message").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  targetBloodGroup: bloodGroupEnum("target_blood_group"), // Nullable: if null, it's for everyone
  targetUserId: varchar("target_user_id").references(() => users.id), // For specific user notifications
  relatedRequestId: varchar("related_request_id").references(() => bloodRequests.id), // To link back to a request
  type: varchar("type").default("general"), // 'general', 'request_broadcast', 'notification'
  createdAt: timestamp("created_at").defaultNow(),
});

// Password reset tokens table
export const passwordResets = pgTable("password_resets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PasswordReset = typeof passwordResets.$inferSelect;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  requestsMade: many(bloodRequests, { relationName: "requester" }),
  donationsMatched: many(bloodRequests, { relationName: "donor" }),
  bloodStock: many(hospitalBloodStock),
  announcements: many(announcements, { relationName: "creator" }),
}));

export const bloodRequestsRelations = relations(bloodRequests, ({ one }) => ({
  requester: one(users, {
    fields: [bloodRequests.requestedById],
    references: [users.id],
    relationName: "requester",
  }),
  matchedDonor: one(users, {
    fields: [bloodRequests.matchedDonorId],
    references: [users.id],
    relationName: "donor",
  }),
}));

export const hospitalBloodStockRelations = relations(hospitalBloodStock, ({ one }) => ({
  hospital: one(users, {
    fields: [hospitalBloodStock.hospitalId],
    references: [users.id],
  }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  creator: one(users, {
    fields: [announcements.createdBy],
    references: [users.id],
    relationName: "creator",
  }),
}));

// Zod Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Name is required"),
  age: z.number().min(18, "Must be at least 18").optional(),
  bloodGroup: z.string().optional().nullable(),
  idDocumentUrl: z.string().optional().nullable(),
});



export const insertHospitalBloodStockSchema = createInsertSchema(hospitalBloodStock).omit({
  id: true,
  lastUpdated: true,
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
});

export const insertBloodRequestSchema = createInsertSchema(bloodRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type BloodRequest = typeof bloodRequests.$inferSelect;
export type InsertBloodRequest = z.infer<typeof insertBloodRequestSchema>;

export type HospitalBloodStock = typeof hospitalBloodStock.$inferSelect;
export type InsertHospitalBloodStock = z.infer<typeof insertHospitalBloodStockSchema>;

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

// Blood group type for easy reference
export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-";
export type RequestStatus = "pending" | "accepted" | "completed" | "cancelled";
export type RequestPriority = "normal" | "emergency";
export type UserRole = "user" | "hospital";
