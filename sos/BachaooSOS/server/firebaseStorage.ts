import { type User, type InsertUser, type SosEvent, type InsertSosEvent, type SosResponse, type InsertSosResponse } from "@shared/schema";
import { getFirebaseAdmin } from "./firebase";
import type { IStorage } from "./storage";
import { randomUUID } from "crypto";

export class FirebaseStorage implements IStorage {
  private db: FirebaseFirestore.Firestore;

  constructor() {
    const app = getFirebaseAdmin();
    if (!app) {
      throw new Error("Firebase Admin not initialized. Cannot use FirebaseStorage.");
    }
    this.db = app.firestore();
    console.log("FirebaseStorage initialized with Firestore");
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async getUser(id: string): Promise<User | undefined> {
    const doc = await this.db.collection('users').doc(id).get();
    if (!doc.exists) return undefined;
    return { id: doc.id, ...doc.data() } as User;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const snapshot = await this.db.collection('users').where('phone', '==', phone).limit(1).get();
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
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
      created_at: new Date(),
    };
    await this.db.collection('users').doc(id).set(user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const docRef = this.db.collection('users').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    
    await docRef.update(updates);
    const updatedDoc = await docRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() } as User;
  }

  async getAllUsers(): Promise<User[]> {
    const snapshot = await this.db.collection('users').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  }

  async getUsersInRadius(lat: number, lng: number, radiusKm: number): Promise<User[]> {
    const allUsers = await this.getAllUsers();
    return allUsers.filter(user => {
      if (!user.location || !user.is_online || !user.available) return false;
      const distance = this.calculateDistance(lat, lng, user.location.lat, user.location.lng);
      return distance <= radiusKm;
    });
  }

  async getSosEvent(id: string): Promise<SosEvent | undefined> {
    const doc = await this.db.collection('sos_events').doc(id).get();
    if (!doc.exists) return undefined;
    return { id: doc.id, ...doc.data() } as SosEvent;
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
      photos: insertSosEvent.photos ? [...insertSosEvent.photos] : null,
      videos: insertSosEvent.videos ? [...insertSosEvent.videos] : null,
      created_at: new Date(),
      resolved_at: null,
      resolved_by: null,
    };
    await this.db.collection('sos_events').doc(id).set(sosEvent);
    return sosEvent;
  }

  async updateSosEvent(id: string, updates: Partial<SosEvent>): Promise<SosEvent | undefined> {
    const docRef = this.db.collection('sos_events').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    
    await docRef.update(updates);
    const updatedDoc = await docRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() } as SosEvent;
  }

  async getAllSosEvents(): Promise<SosEvent[]> {
    const snapshot = await this.db.collection('sos_events').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SosEvent));
  }

  async getActiveSosEvents(): Promise<SosEvent[]> {
    const snapshot = await this.db.collection('sos_events').where('status', '==', 'active').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SosEvent));
  }

  async getSosEventsInRadius(lat: number, lng: number, radiusKm: number): Promise<SosEvent[]> {
    const activeEvents = await this.getActiveSosEvents();
    return activeEvents.filter(event => {
      const distance = this.calculateDistance(lat, lng, event.location.lat, event.location.lng);
      return distance <= radiusKm;
    });
  }

  async getUserSosEvents(userId: string): Promise<SosEvent[]> {
    const snapshot = await this.db.collection('sos_events').where('user_id', '==', userId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SosEvent));
  }

  async getSosResponse(id: string): Promise<SosResponse | undefined> {
    const doc = await this.db.collection('sos_responses').doc(id).get();
    if (!doc.exists) return undefined;
    return { id: doc.id, ...doc.data() } as SosResponse;
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
    await this.db.collection('sos_responses').doc(id).set(sosResponse);
    return sosResponse;
  }

  async updateSosResponse(id: string, updates: Partial<SosResponse>): Promise<SosResponse | undefined> {
    const docRef = this.db.collection('sos_responses').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return undefined;
    
    await docRef.update(updates);
    const updatedDoc = await docRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() } as SosResponse;
  }

  async getSosEventResponses(sosEventId: string): Promise<SosResponse[]> {
    const snapshot = await this.db.collection('sos_responses').where('sos_event_id', '==', sosEventId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SosResponse));
  }

  async getUserResponses(userId: string): Promise<SosResponse[]> {
    const snapshot = await this.db.collection('sos_responses').where('responder_id', '==', userId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SosResponse));
  }
}
