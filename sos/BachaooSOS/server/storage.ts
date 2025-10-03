import { type User, type InsertUser, type SosEvent, type InsertSosEvent, type SosResponse, type InsertSosResponse } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersInRadius(lat: number, lng: number, radiusKm: number): Promise<User[]>;
  
  // SOS Event methods
  getSosEvent(id: string): Promise<SosEvent | undefined>;
  createSosEvent(sosEvent: InsertSosEvent): Promise<SosEvent>;
  updateSosEvent(id: string, updates: Partial<SosEvent>): Promise<SosEvent | undefined>;
  getAllSosEvents(): Promise<SosEvent[]>;
  getActiveSosEvents(): Promise<SosEvent[]>;
  getSosEventsInRadius(lat: number, lng: number, radiusKm: number): Promise<SosEvent[]>;
  getUserSosEvents(userId: string): Promise<SosEvent[]>;
  
  // SOS Response methods
  getSosResponse(id: string): Promise<SosResponse | undefined>;
  createSosResponse(sosResponse: InsertSosResponse): Promise<SosResponse>;
  updateSosResponse(id: string, updates: Partial<SosResponse>): Promise<SosResponse | undefined>;
  getSosEventResponses(sosEventId: string): Promise<SosResponse[]>;
  getUserResponses(userId: string): Promise<SosResponse[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sosEvents: Map<string, SosEvent>;
  private sosResponses: Map<string, SosResponse>;

  constructor() {
    this.users = new Map();
    this.sosEvents = new Map();
    this.sosResponses = new Map();
  }

  // Helper method to calculate distance using Haversine formula
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.phone === phone);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      location: insertUser.location ?? null,
      emergency_contacts: insertUser.emergency_contacts ? Array.from(insertUser.emergency_contacts) as {name: string; phone: string}[] : null,
      response_count: 0,
      rating: 0,
      is_online: false,
      available: true,
      verified: false,
      profile_photo: null,
      fcm_token: null,
      medical_info: null,
      safe_zones: null,
      created_at: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUsersInRadius(lat: number, lng: number, radiusKm: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => {
      if (!user.location || !user.is_online || !user.available) return false;
      const distance = this.calculateDistance(lat, lng, user.location.lat, user.location.lng);
      return distance <= radiusKm;
    });
  }

  // SOS Event methods
  async getSosEvent(id: string): Promise<SosEvent | undefined> {
    return this.sosEvents.get(id);
  }

  async createSosEvent(insertSosEvent: InsertSosEvent): Promise<SosEvent> {
    const id = randomUUID();
    const sosEvent: SosEvent = {
      ...insertSosEvent,
      id,
      location_address: insertSosEvent.location_address ?? null,
      audio_recording_url: insertSosEvent.audio_recording_url ?? null,
      status: "active" as const,
      severity: (insertSosEvent.severity ?? "high") as "critical" | "high" | "medium" | "low",
      category: (insertSosEvent.category ?? "other") as "medical" | "crime" | "accident" | "fire" | "natural_disaster" | "other",
      description: insertSosEvent.description ?? null,
      photos: (insertSosEvent.photos ?? null) as string[] | null,
      videos: (insertSosEvent.videos ?? null) as string[] | null,
      created_at: new Date(),
      resolved_at: null,
      resolved_by: null,
    };
    this.sosEvents.set(id, sosEvent);
    return sosEvent;
  }

  async updateSosEvent(id: string, updates: Partial<SosEvent>): Promise<SosEvent | undefined> {
    const sosEvent = this.sosEvents.get(id);
    if (!sosEvent) return undefined;
    
    const updatedSosEvent = { ...sosEvent, ...updates };
    this.sosEvents.set(id, updatedSosEvent);
    return updatedSosEvent;
  }

  async getAllSosEvents(): Promise<SosEvent[]> {
    return Array.from(this.sosEvents.values());
  }

  async getActiveSosEvents(): Promise<SosEvent[]> {
    return Array.from(this.sosEvents.values()).filter(event => event.status === "active");
  }

  async getSosEventsInRadius(lat: number, lng: number, radiusKm: number): Promise<SosEvent[]> {
    return Array.from(this.sosEvents.values()).filter(event => {
      if (event.status !== "active") return false;
      const distance = this.calculateDistance(lat, lng, event.location.lat, event.location.lng);
      return distance <= radiusKm;
    });
  }

  async getUserSosEvents(userId: string): Promise<SosEvent[]> {
    return Array.from(this.sosEvents.values()).filter(event => event.user_id === userId);
  }

  // SOS Response methods
  async getSosResponse(id: string): Promise<SosResponse | undefined> {
    return this.sosResponses.get(id);
  }

  async createSosResponse(insertSosResponse: InsertSosResponse): Promise<SosResponse> {
    const id = randomUUID();
    const sosResponse: SosResponse = {
      ...insertSosResponse,
      id,
      distance: insertSosResponse.distance ?? null,
      status: "responding",
      created_at: new Date(),
    };
    this.sosResponses.set(id, sosResponse);
    return sosResponse;
  }

  async updateSosResponse(id: string, updates: Partial<SosResponse>): Promise<SosResponse | undefined> {
    const sosResponse = this.sosResponses.get(id);
    if (!sosResponse) return undefined;
    
    const updatedSosResponse = { ...sosResponse, ...updates };
    this.sosResponses.set(id, updatedSosResponse);
    return updatedSosResponse;
  }

  async getSosEventResponses(sosEventId: string): Promise<SosResponse[]> {
    return Array.from(this.sosResponses.values()).filter(response => response.sos_event_id === sosEventId);
  }

  async getUserResponses(userId: string): Promise<SosResponse[]> {
    return Array.from(this.sosResponses.values()).filter(response => response.responder_id === userId);
  }
}

import { FirebaseStorage } from "./firebaseStorage";
import { getFirebaseAdmin } from "./firebase";

async function testFirestoreConnection(app: any): Promise<boolean> {
  try {
    const db = app.firestore();
    await db.collection('_test').limit(1).get();
    return true;
  } catch (error) {
    console.error("Firestore connection test failed:", error);
    return false;
  }
}

async function createStorageAsync(): Promise<IStorage> {
  const firebaseApp = getFirebaseAdmin();
  if (firebaseApp) {
    try {
      const firestoreAvailable = await testFirestoreConnection(firebaseApp);
      if (firestoreAvailable) {
        console.log("Using FirebaseStorage for data persistence");
        return new FirebaseStorage();
      } else {
        console.log("Firestore not available, falling back to MemStorage (data will not persist)");
        return new MemStorage();
      }
    } catch (error) {
      console.error("Failed to initialize FirebaseStorage, falling back to MemStorage:", error);
      return new MemStorage();
    }
  } else {
    console.log("Firebase not configured, using MemStorage (data will not persist)");
    return new MemStorage();
  }
}

let storageInstance: IStorage | null = null;

export const storage = new Proxy({} as IStorage, {
  get: function(target, prop) {
    if (!storageInstance) {
      throw new Error("Storage not initialized. Call initStorage() first.");
    }
    return (storageInstance as any)[prop];
  }
});

export async function initStorage(): Promise<IStorage> {
  if (!storageInstance) {
    storageInstance = await createStorageAsync();
  }
  return storageInstance;
}
