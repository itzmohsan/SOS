// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

// server/storage.ts
import { randomUUID as randomUUID2 } from "crypto";

// server/firebase.ts
import admin from "firebase-admin";
var firebaseApp = null;
function getFirebaseAdmin() {
  if (firebaseApp) {
    return firebaseApp;
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    console.warn("Firebase credentials not configured. Push notifications will not be available.");
    return null;
  }
  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
    console.log("Firebase Admin SDK initialized successfully");
    return firebaseApp;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    return null;
  }
}
async function sendPushNotification(fcmToken, title, body, data) {
  const app2 = getFirebaseAdmin();
  if (!app2) {
    console.warn("Firebase not initialized. Cannot send push notification.");
    return null;
  }
  try {
    const message = {
      notification: {
        title,
        body
      },
      token: fcmToken
    };
    if (data) {
      message.data = data;
    }
    const response = await admin.messaging().send(message);
    console.log(`Push notification sent successfully to ${fcmToken}, response: ${response}`);
    return response;
  } catch (error) {
    console.error("Failed to send push notification:", error);
    throw error;
  }
}

// server/firebaseStorage.ts
import { randomUUID } from "crypto";
var FirebaseStorage = class {
  db;
  constructor() {
    const app2 = getFirebaseAdmin();
    if (!app2) {
      throw new Error("Firebase Admin not initialized. Cannot use FirebaseStorage.");
    }
    this.db = app2.firestore();
    console.log("FirebaseStorage initialized with Firestore");
  }
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  async getUser(id) {
    const doc = await this.db.collection("users").doc(id).get();
    if (!doc.exists) return void 0;
    return { id: doc.id, ...doc.data() };
  }
  async getUserByPhone(phone) {
    const snapshot = await this.db.collection("users").where("phone", "==", phone).limit(1).get();
    if (snapshot.empty) return void 0;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const user = {
      ...insertUser,
      id,
      location: insertUser.location ?? null,
      emergency_contacts: insertUser.emergency_contacts ? [...insertUser.emergency_contacts] : null,
      response_count: 0,
      rating: 0,
      is_online: false,
      available: true,
      verified: false,
      profile_photo: null,
      fcm_token: null,
      medical_info: null,
      safe_zones: null,
      created_at: /* @__PURE__ */ new Date()
    };
    await this.db.collection("users").doc(id).set(user);
    return user;
  }
  async updateUser(id, updates) {
    const docRef = this.db.collection("users").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return void 0;
    await docRef.update(updates);
    const updatedDoc = await docRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
  }
  async getAllUsers() {
    const snapshot = await this.db.collection("users").get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
  async getUsersInRadius(lat, lng, radiusKm) {
    const allUsers = await this.getAllUsers();
    return allUsers.filter((user) => {
      if (!user.location || !user.is_online || !user.available) return false;
      const distance = this.calculateDistance(lat, lng, user.location.lat, user.location.lng);
      return distance <= radiusKm;
    });
  }
  async getSosEvent(id) {
    const doc = await this.db.collection("sos_events").doc(id).get();
    if (!doc.exists) return void 0;
    return { id: doc.id, ...doc.data() };
  }
  async createSosEvent(insertSosEvent) {
    const id = randomUUID();
    const sosEvent = {
      ...insertSosEvent,
      id,
      location_address: insertSosEvent.location_address ?? null,
      audio_recording_url: insertSosEvent.audio_recording_url ?? null,
      status: "active",
      severity: insertSosEvent.severity ?? "high",
      category: insertSosEvent.category ?? "other",
      description: insertSosEvent.description ?? null,
      photos: insertSosEvent.photos ? [...insertSosEvent.photos] : null,
      videos: insertSosEvent.videos ? [...insertSosEvent.videos] : null,
      created_at: /* @__PURE__ */ new Date(),
      resolved_at: null,
      resolved_by: null
    };
    await this.db.collection("sos_events").doc(id).set(sosEvent);
    return sosEvent;
  }
  async updateSosEvent(id, updates) {
    const docRef = this.db.collection("sos_events").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return void 0;
    await docRef.update(updates);
    const updatedDoc = await docRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
  }
  async getAllSosEvents() {
    const snapshot = await this.db.collection("sos_events").get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
  async getActiveSosEvents() {
    const snapshot = await this.db.collection("sos_events").where("status", "==", "active").get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
  async getSosEventsInRadius(lat, lng, radiusKm) {
    const activeEvents = await this.getActiveSosEvents();
    return activeEvents.filter((event) => {
      const distance = this.calculateDistance(lat, lng, event.location.lat, event.location.lng);
      return distance <= radiusKm;
    });
  }
  async getUserSosEvents(userId) {
    const snapshot = await this.db.collection("sos_events").where("user_id", "==", userId).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
  async getSosResponse(id) {
    const doc = await this.db.collection("sos_responses").doc(id).get();
    if (!doc.exists) return void 0;
    return { id: doc.id, ...doc.data() };
  }
  async createSosResponse(insertSosResponse) {
    const id = randomUUID();
    const sosResponse = {
      ...insertSosResponse,
      id,
      distance: insertSosResponse.distance ?? null,
      status: "responding",
      created_at: /* @__PURE__ */ new Date()
    };
    await this.db.collection("sos_responses").doc(id).set(sosResponse);
    return sosResponse;
  }
  async updateSosResponse(id, updates) {
    const docRef = this.db.collection("sos_responses").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return void 0;
    await docRef.update(updates);
    const updatedDoc = await docRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
  }
  async getSosEventResponses(sosEventId) {
    const snapshot = await this.db.collection("sos_responses").where("sos_event_id", "==", sosEventId).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
  async getUserResponses(userId) {
    const snapshot = await this.db.collection("sos_responses").where("responder_id", "==", userId).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
};

// server/storage.ts
var MemStorage = class {
  users;
  sosEvents;
  sosResponses;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.sosEvents = /* @__PURE__ */ new Map();
    this.sosResponses = /* @__PURE__ */ new Map();
  }
  // Helper method to calculate distance using Haversine formula
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  // User methods
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByPhone(phone) {
    return Array.from(this.users.values()).find((user) => user.phone === phone);
  }
  async createUser(insertUser) {
    const id = randomUUID2();
    const user = {
      ...insertUser,
      id,
      location: insertUser.location ?? null,
      emergency_contacts: insertUser.emergency_contacts ? Array.from(insertUser.emergency_contacts) : null,
      response_count: 0,
      rating: 0,
      is_online: false,
      available: true,
      verified: false,
      profile_photo: null,
      fcm_token: null,
      medical_info: null,
      safe_zones: null,
      created_at: /* @__PURE__ */ new Date()
    };
    this.users.set(id, user);
    return user;
  }
  async updateUser(id, updates) {
    const user = this.users.get(id);
    if (!user) return void 0;
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  async getAllUsers() {
    return Array.from(this.users.values());
  }
  async getUsersInRadius(lat, lng, radiusKm) {
    return Array.from(this.users.values()).filter((user) => {
      if (!user.location || !user.is_online || !user.available) return false;
      const distance = this.calculateDistance(lat, lng, user.location.lat, user.location.lng);
      return distance <= radiusKm;
    });
  }
  // SOS Event methods
  async getSosEvent(id) {
    return this.sosEvents.get(id);
  }
  async createSosEvent(insertSosEvent) {
    const id = randomUUID2();
    const sosEvent = {
      ...insertSosEvent,
      id,
      location_address: insertSosEvent.location_address ?? null,
      audio_recording_url: insertSosEvent.audio_recording_url ?? null,
      status: "active",
      severity: insertSosEvent.severity ?? "high",
      category: insertSosEvent.category ?? "other",
      description: insertSosEvent.description ?? null,
      photos: insertSosEvent.photos ?? null,
      videos: insertSosEvent.videos ?? null,
      created_at: /* @__PURE__ */ new Date(),
      resolved_at: null,
      resolved_by: null
    };
    this.sosEvents.set(id, sosEvent);
    return sosEvent;
  }
  async updateSosEvent(id, updates) {
    const sosEvent = this.sosEvents.get(id);
    if (!sosEvent) return void 0;
    const updatedSosEvent = { ...sosEvent, ...updates };
    this.sosEvents.set(id, updatedSosEvent);
    return updatedSosEvent;
  }
  async getAllSosEvents() {
    return Array.from(this.sosEvents.values());
  }
  async getActiveSosEvents() {
    return Array.from(this.sosEvents.values()).filter((event) => event.status === "active");
  }
  async getSosEventsInRadius(lat, lng, radiusKm) {
    return Array.from(this.sosEvents.values()).filter((event) => {
      if (event.status !== "active") return false;
      const distance = this.calculateDistance(lat, lng, event.location.lat, event.location.lng);
      return distance <= radiusKm;
    });
  }
  async getUserSosEvents(userId) {
    return Array.from(this.sosEvents.values()).filter((event) => event.user_id === userId);
  }
  // SOS Response methods
  async getSosResponse(id) {
    return this.sosResponses.get(id);
  }
  async createSosResponse(insertSosResponse) {
    const id = randomUUID2();
    const sosResponse = {
      ...insertSosResponse,
      id,
      distance: insertSosResponse.distance ?? null,
      status: "responding",
      created_at: /* @__PURE__ */ new Date()
    };
    this.sosResponses.set(id, sosResponse);
    return sosResponse;
  }
  async updateSosResponse(id, updates) {
    const sosResponse = this.sosResponses.get(id);
    if (!sosResponse) return void 0;
    const updatedSosResponse = { ...sosResponse, ...updates };
    this.sosResponses.set(id, updatedSosResponse);
    return updatedSosResponse;
  }
  async getSosEventResponses(sosEventId) {
    return Array.from(this.sosResponses.values()).filter((response) => response.sos_event_id === sosEventId);
  }
  async getUserResponses(userId) {
    return Array.from(this.sosResponses.values()).filter((response) => response.responder_id === userId);
  }
};
function createStorage() {
  const firebaseApp2 = getFirebaseAdmin();
  if (firebaseApp2) {
    try {
      console.log("Using FirebaseStorage for data persistence");
      return new FirebaseStorage();
    } catch (error) {
      console.error("Failed to initialize FirebaseStorage, falling back to MemStorage:", error);
      return new MemStorage();
    }
  } else {
    console.log("Firebase not configured, using MemStorage (data will not persist)");
    return new MemStorage();
  }
}
var storage = createStorage();

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, real, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull(),
  emergency_contacts: jsonb("emergency_contacts").$type().default([]),
  location: jsonb("location").$type(),
  is_online: boolean("is_online").default(false),
  available: boolean("available").default(true),
  response_count: integer("response_count").default(0),
  rating: real("rating").default(0),
  verified: boolean("verified").default(false),
  profile_photo: text("profile_photo"),
  fcm_token: text("fcm_token"),
  medical_info: jsonb("medical_info").$type(),
  safe_zones: jsonb("safe_zones").$type().default([]),
  created_at: timestamp("created_at").default(sql`now()`)
});
var sosEvents = pgTable("sos_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => users.id),
  location: jsonb("location").$type().notNull(),
  location_address: text("location_address"),
  audio_recording_url: text("audio_recording_url"),
  status: text("status").$type().default("active"),
  severity: text("severity").$type().default("high"),
  category: text("category").$type().default("other"),
  description: text("description"),
  photos: jsonb("photos").$type().default([]),
  videos: jsonb("videos").$type().default([]),
  created_at: timestamp("created_at").default(sql`now()`),
  resolved_at: timestamp("resolved_at"),
  resolved_by: varchar("resolved_by").references(() => users.id)
});
var sosResponses = pgTable("sos_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sos_event_id: varchar("sos_event_id").notNull().references(() => sosEvents.id),
  responder_id: varchar("responder_id").notNull().references(() => users.id),
  status: text("status").$type().default("responding"),
  distance: real("distance"),
  created_at: timestamp("created_at").default(sql`now()`)
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  created_at: true,
  response_count: true,
  rating: true,
  is_online: true
});
var insertSosEventSchema = createInsertSchema(sosEvents).omit({
  id: true,
  created_at: true,
  resolved_at: true,
  resolved_by: true
});
var insertSosResponseSchema = createInsertSchema(sosResponses).omit({
  id: true,
  created_at: true
});

// server/routes.ts
import { z } from "zod";

// server/twilio.ts
import twilio from "twilio";
var connectionSettings;
async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY ? "repl " + process.env.REPL_IDENTITY : process.env.WEB_REPL_RENEWAL ? "depl " + process.env.WEB_REPL_RENEWAL : null;
  if (!xReplitToken) {
    throw new Error("X_REPLIT_TOKEN not found for repl/depl");
  }
  connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=twilio",
    {
      headers: {
        "Accept": "application/json",
        "X_REPLIT_TOKEN": xReplitToken
      }
    }
  ).then((res) => res.json()).then((data) => data.items?.[0]);
  if (!connectionSettings || (!connectionSettings.settings.account_sid || !connectionSettings.settings.api_key || !connectionSettings.settings.api_key_secret)) {
    throw new Error("Twilio not connected");
  }
  return {
    accountSid: connectionSettings.settings.account_sid,
    apiKey: connectionSettings.settings.api_key,
    apiKeySecret: connectionSettings.settings.api_key_secret,
    phoneNumber: connectionSettings.settings.phone_number
  };
}
async function getTwilioClient() {
  const { accountSid, apiKey, apiKeySecret } = await getCredentials();
  return twilio(apiKey, apiKeySecret, {
    accountSid
  });
}
async function getTwilioFromPhoneNumber() {
  const { phoneNumber } = await getCredentials();
  return phoneNumber;
}
async function sendSMS(to, message) {
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to
    });
    console.log(`SMS sent successfully to ${to}, SID: ${result.sid}`);
    return result;
  } catch (error) {
    console.error("Failed to send SMS:", error);
    throw error;
  }
}

// server/routes.ts
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const connectedClients = /* @__PURE__ */ new Map();
  wss.on("connection", (ws, req) => {
    console.log("New WebSocket connection");
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === "register" && message.userId) {
          connectedClients.set(message.userId, ws);
          await storage.updateUser(message.userId, { is_online: true });
        }
        if (message.type === "location_update" && message.userId) {
          await storage.updateUser(message.userId, {
            location: {
              lat: message.location.lat,
              lng: message.location.lng,
              last_updated: (/* @__PURE__ */ new Date()).toISOString()
            }
          });
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
    ws.on("close", () => {
      Array.from(connectedClients.entries()).forEach(([userId, client]) => {
        if (client === ws) {
          connectedClients.delete(userId);
          storage.updateUser(userId, { is_online: false });
        }
      });
    });
  });
  function broadcastToClients(userIds, message) {
    userIds.forEach((userId) => {
      const client = connectedClients.get(userId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
  async function notifyNearbyHelpers(sosEvent, nearbyUsers, userName) {
    const pushPromises = nearbyUsers.filter((user) => user.fcm_token).map(async (user) => {
      try {
        const distance = calculateDistance(
          sosEvent.location.lat,
          sosEvent.location.lng,
          user.location.lat,
          user.location.lng
        );
        const locationInfo = sosEvent.location_address || `${sosEvent.location.lat.toFixed(4)}, ${sosEvent.location.lng.toFixed(4)}`;
        await sendPushNotification(
          user.fcm_token,
          "\u{1F6A8} Emergency Alert Nearby",
          `${userName} needs help! Approximately ${distance.toFixed(1)}km away from you. Location: ${locationInfo}`,
          {
            sos_event_id: sosEvent.id,
            type: "sos_alert",
            distance: distance.toString()
          }
        );
        console.log(`Push notification sent to user ${user.id} (${user.name})`);
        return { success: true, userId: user.id };
      } catch (error) {
        console.error(`Failed to send push notification to user ${user.id}:`, error);
        return { success: false, userId: user.id, error };
      }
    });
    const results = await Promise.allSettled(pushPromises);
    const successCount = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
    const failCount = results.filter((r) => r.status === "rejected" || r.status === "fulfilled" && !r.value.success).length;
    console.log(`Push notifications: ${successCount} sent, ${failCount} failed out of ${nearbyUsers.filter((u) => u.fcm_token).length} users with FCM tokens`);
    return { successCount, failCount };
  }
  app2.post("/api/users/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByPhone(userData.phone);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists with this phone number" });
      }
      const user = await storage.createUser(userData);
      res.json({ user });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to register user" });
    }
  });
  app2.get("/api/users/phone/:phone", async (req, res) => {
    try {
      const user = await storage.getUserByPhone(req.params.phone);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });
  app2.put("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  app2.post("/api/users/:id/location", async (req, res) => {
    try {
      const { lat, lng } = req.body;
      const user = await storage.updateUser(req.params.id, {
        location: {
          lat,
          lng,
          last_updated: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: "Failed to update location" });
    }
  });
  app2.post("/api/users/:userId/fcm-token", async (req, res) => {
    try {
      const { fcm_token } = req.body;
      if (!fcm_token || typeof fcm_token !== "string") {
        return res.status(400).json({ message: "Valid FCM token required" });
      }
      const user = await storage.updateUser(req.params.userId, {
        fcm_token
      });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "FCM token registered successfully", user });
    } catch (error) {
      console.error("Error updating FCM token:", error);
      res.status(500).json({ message: "Failed to update FCM token" });
    }
  });
  app2.get("/api/users/nearby", async (req, res) => {
    try {
      const { lat, lng, radius = 2 } = req.query;
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude required" });
      }
      const users2 = await storage.getUsersInRadius(
        parseFloat(lat),
        parseFloat(lng),
        parseFloat(radius)
      );
      res.json({ users: users2.length, helpers: users2 });
    } catch (error) {
      res.status(500).json({ message: "Failed to get nearby helpers" });
    }
  });
  app2.post("/api/sos/trigger", async (req, res) => {
    try {
      const sosData = insertSosEventSchema.parse(req.body);
      const sosEvent = await storage.createSosEvent(sosData);
      const user = await storage.getUser(sosEvent.user_id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const notificationResults = {
        sms: { sent: 0, failed: 0 },
        push: { sent: 0, failed: 0 }
      };
      if (user.emergency_contacts && user.emergency_contacts.length > 0) {
        const smsMessage = `EMERGENCY ALERT: ${user.name} has triggered an SOS alert. Location: ${sosEvent.location_address || "Location shared"}. Please check immediately or call authorities.`;
        const smsPromises = user.emergency_contacts.map(async (contact) => {
          try {
            await sendSMS(contact.phone, smsMessage);
            console.log(`SMS sent to emergency contact: ${contact.phone}`);
            return { success: true, phone: contact.phone };
          } catch (error) {
            console.error(`Failed to send SMS to ${contact.phone}:`, error);
            return { success: false, phone: contact.phone, error };
          }
        });
        const smsResults = await Promise.allSettled(smsPromises);
        notificationResults.sms.sent = smsResults.filter((r) => r.status === "fulfilled" && r.value.success).length;
        notificationResults.sms.failed = smsResults.filter((r) => r.status === "rejected" || r.status === "fulfilled" && !r.value.success).length;
      }
      const nearbyHelpers = await storage.getUsersInRadius(
        sosEvent.location.lat,
        sosEvent.location.lng,
        2
      );
      if (nearbyHelpers.length > 0) {
        try {
          const pushResults = await notifyNearbyHelpers(sosEvent, nearbyHelpers, user.name);
          notificationResults.push.sent = pushResults.successCount;
          notificationResults.push.failed = pushResults.failCount;
        } catch (error) {
          console.error("Error in push notification broadcast:", error);
        }
      }
      const helperIds = nearbyHelpers.map((h) => h.id);
      broadcastToClients(helperIds, {
        type: "sos_alert",
        sosEvent,
        user: { name: user.name },
        distance: nearbyHelpers.map((h) => ({
          userId: h.id,
          distance: calculateDistance(
            sosEvent.location.lat,
            sosEvent.location.lng,
            h.location.lat,
            h.location.lng
          )
        }))
      });
      console.log(`SOS Alert ${sosEvent.id} triggered by ${user.name}:`);
      console.log(`- SMS to emergency contacts: ${notificationResults.sms.sent} sent, ${notificationResults.sms.failed} failed`);
      console.log(`- Push to nearby helpers: ${notificationResults.push.sent} sent, ${notificationResults.push.failed} failed`);
      console.log(`- WebSocket broadcast to ${helperIds.length} nearby helpers`);
      res.json({
        sosEvent,
        nearbyHelpers: nearbyHelpers.length,
        notifications: notificationResults,
        message: "SOS alert triggered successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid SOS data", errors: error.errors });
      }
      console.error("Failed to trigger SOS:", error);
      res.status(500).json({ message: "Failed to trigger SOS" });
    }
  });
  app2.post("/api/sos/respond", async (req, res) => {
    try {
      const responseData = insertSosResponseSchema.parse(req.body);
      const sosEvent = await storage.getSosEvent(responseData.sos_event_id);
      const responder = await storage.getUser(responseData.responder_id);
      if (!sosEvent || !responder) {
        return res.status(404).json({ message: "SOS event or responder not found" });
      }
      if (!responder.location) {
        return res.status(400).json({ message: "Responder location not available" });
      }
      const distance = calculateDistance(
        sosEvent.location.lat,
        sosEvent.location.lng,
        responder.location.lat,
        responder.location.lng
      );
      const response = await storage.createSosResponse({
        ...responseData,
        distance
      });
      broadcastToClients([sosEvent.user_id], {
        type: "responder_update",
        sosEventId: sosEvent.id,
        responder: {
          id: responder.id,
          name: responder.name,
          distance,
          status: response.status
        }
      });
      res.json({ response });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid response data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to respond to SOS" });
    }
  });
  app2.get("/api/sos/nearby", async (req, res) => {
    try {
      const { lat, lng, radius = 2 } = req.query;
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude required" });
      }
      const sosEvents2 = await storage.getSosEventsInRadius(
        parseFloat(lat),
        parseFloat(lng),
        parseFloat(radius)
      );
      const eventsWithDetails = await Promise.all(
        sosEvents2.map(async (event) => {
          const responses = await storage.getSosEventResponses(event.id);
          const distance = calculateDistance(
            parseFloat(lat),
            parseFloat(lng),
            event.location.lat,
            event.location.lng
          );
          return {
            ...event,
            distance,
            responderCount: responses.length
          };
        })
      );
      res.json({ events: eventsWithDetails });
    } catch (error) {
      res.status(500).json({ message: "Failed to get nearby SOS events" });
    }
  });
  app2.post("/api/sos/:id/resolve", async (req, res) => {
    try {
      const { resolved_by } = req.body;
      const sosEvent = await storage.updateSosEvent(req.params.id, {
        status: "resolved",
        resolved_at: /* @__PURE__ */ new Date(),
        resolved_by
      });
      if (!sosEvent) {
        return res.status(404).json({ message: "SOS event not found" });
      }
      const responses = await storage.getSosEventResponses(sosEvent.id);
      const responderIds = responses.map((r) => r.responder_id);
      broadcastToClients([sosEvent.user_id, ...responderIds], {
        type: "sos_resolved",
        sosEventId: sosEvent.id
      });
      res.json({ sosEvent });
    } catch (error) {
      res.status(500).json({ message: "Failed to resolve SOS event" });
    }
  });
  app2.get("/api/sos/:id", async (req, res) => {
    try {
      const sosEvent = await storage.getSosEvent(req.params.id);
      if (!sosEvent) {
        return res.status(404).json({ message: "SOS event not found" });
      }
      const responses = await storage.getSosEventResponses(sosEvent.id);
      const responders = await Promise.all(
        responses.map(async (response) => {
          const responder = await storage.getUser(response.responder_id);
          return {
            ...response,
            responder: responder ? {
              id: responder.id,
              name: responder.name,
              rating: responder.rating
            } : null
          };
        })
      );
      res.json({ sosEvent, responders });
    } catch (error) {
      res.status(500).json({ message: "Failed to get SOS event details" });
    }
  });
  app2.get("/api/users/:id/stats", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const userResponses = await storage.getUserResponses(req.params.id);
      const userSosEvents = await storage.getUserSosEvents(req.params.id);
      const stats = {
        responseCount: userResponses.length,
        sosEventsTriggered: userSosEvents.length,
        rating: user.rating,
        activeDays: user.created_at ? Math.ceil((Date.now() - user.created_at.getTime()) / (1e3 * 60 * 60 * 24)) : 0,
        avgResponseTime: 2.5
        // Mock average response time
      };
      res.json({ stats });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user stats" });
    }
  });
  app2.get("/api/admin/users", async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      res.json({ users: users2 });
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });
  app2.get("/api/admin/sos-events", async (req, res) => {
    try {
      const events = await storage.getAllSosEvents();
      res.json({ events });
    } catch (error) {
      res.status(500).json({ message: "Failed to get SOS events" });
    }
  });
  app2.get("/api/admin/stats", async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      const sosEvents2 = await storage.getAllSosEvents();
      const stats = {
        totalUsers: users2.length,
        onlineUsers: users2.filter((u) => u.is_online).length,
        activeSosEvents: sosEvents2.filter((e) => e.status === "active").length,
        resolvedSosEvents: sosEvents2.filter((e) => e.status === "resolved").length,
        firebaseConnected: !!process.env.FIREBASE_PROJECT_ID,
        twilioConnected: !!process.env.TWILIO_ACCOUNT_SID
      };
      res.json({ stats });
    } catch (error) {
      res.status(500).json({ message: "Failed to get stats" });
    }
  });
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: "0.0.0.0",
    port: 5e3,
    strictPort: true,
    allowedHosts: true,
    hmr: {
      protocol: "wss",
      host: process.env.REPL_SLUG ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev` : void 0,
      clientPort: 443
    },
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
