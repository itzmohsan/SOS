import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, real, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull(),
  emergency_contacts: jsonb("emergency_contacts").$type<Array<{name: string; phone: string}>>().default([]),
  location: jsonb("location").$type<{lat: number; lng: number; last_updated: string}>(),
  is_online: boolean("is_online").default(false),
  available: boolean("available").default(true),
  response_count: integer("response_count").default(0),
  rating: real("rating").default(0),
  verified: boolean("verified").default(false),
  profile_photo: text("profile_photo"),
  fcm_token: text("fcm_token"),
  medical_info: jsonb("medical_info").$type<{
    blood_type?: string;
    allergies?: string[];
    medical_conditions?: string[];
    medications?: string[];
  }>(),
  safe_zones: jsonb("safe_zones").$type<Array<{
    name: string;
    location: {lat: number; lng: number};
    radius: number;
  }>>().default([]),
  created_at: timestamp("created_at").default(sql`now()`),
});

export const sosEvents = pgTable("sos_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => users.id),
  location: jsonb("location").$type<{lat: number; lng: number}>().notNull(),
  location_address: text("location_address"),
  audio_recording_url: text("audio_recording_url"),
  status: text("status").$type<"active" | "resolved" | "cancelled">().default("active"),
  severity: text("severity").$type<"critical" | "high" | "medium" | "low">().default("high"),
  category: text("category").$type<"medical" | "crime" | "accident" | "fire" | "natural_disaster" | "other">().default("other"),
  description: text("description"),
  photos: jsonb("photos").$type<string[]>().default([]),
  videos: jsonb("videos").$type<string[]>().default([]),
  created_at: timestamp("created_at").default(sql`now()`),
  resolved_at: timestamp("resolved_at"),
  resolved_by: varchar("resolved_by").references(() => users.id),
});

export const sosResponses = pgTable("sos_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sos_event_id: varchar("sos_event_id").notNull().references(() => sosEvents.id),
  responder_id: varchar("responder_id").notNull().references(() => users.id),
  status: text("status").$type<"responding" | "arrived" | "cancelled">().default("responding"),
  distance: real("distance"),
  created_at: timestamp("created_at").default(sql`now()`),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  created_at: true,
  response_count: true,
  rating: true,
  is_online: true,
});

export const insertSosEventSchema = createInsertSchema(sosEvents).omit({
  id: true,
  created_at: true,
  resolved_at: true,
  resolved_by: true,
});

export const insertSosResponseSchema = createInsertSchema(sosResponses).omit({
  id: true,
  created_at: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSosEvent = z.infer<typeof insertSosEventSchema>;
export type SosEvent = typeof sosEvents.$inferSelect;
export type InsertSosResponse = z.infer<typeof insertSosResponseSchema>;
export type SosResponse = typeof sosResponses.$inferSelect;
