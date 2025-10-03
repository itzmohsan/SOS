import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertSosEventSchema, insertSosResponseSchema } from "@shared/schema";
import { z } from "zod";
import { sendSMS } from "./twilio";
import { sendPushNotification } from "./firebase";

// Calculate distance using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time communications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const connectedClients = new Map<string, WebSocket>();

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'register' && message.userId) {
          connectedClients.set(message.userId, ws);
          await storage.updateUser(message.userId, { is_online: true });
        }
        
        if (message.type === 'location_update' && message.userId) {
          await storage.updateUser(message.userId, {
            location: {
              lat: message.location.lat,
              lng: message.location.lng,
              last_updated: new Date().toISOString()
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      // Remove from connected clients
      Array.from(connectedClients.entries()).forEach(([userId, client]) => {
        if (client === ws) {
          connectedClients.delete(userId);
          storage.updateUser(userId, { is_online: false });
        }
      });
    });
  });

  // Broadcast message to connected clients
  function broadcastToClients(userIds: string[], message: any) {
    userIds.forEach(userId => {
      const client = connectedClients.get(userId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  // Notify nearby helpers with push notifications
  async function notifyNearbyHelpers(sosEvent: any, nearbyUsers: any[], userName: string) {
    const pushPromises = nearbyUsers
      .filter(user => user.fcm_token)
      .map(async (user) => {
        try {
          const distance = calculateDistance(
            sosEvent.location.lat,
            sosEvent.location.lng,
            user.location!.lat,
            user.location!.lng
          );
          
          const locationInfo = sosEvent.location_address || 
            `${sosEvent.location.lat.toFixed(4)}, ${sosEvent.location.lng.toFixed(4)}`;
          
          await sendPushNotification(
            user.fcm_token,
            "🚨 Emergency Alert Nearby",
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
    
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
    
    console.log(`Push notifications: ${successCount} sent, ${failCount} failed out of ${nearbyUsers.filter(u => u.fcm_token).length} users with FCM tokens`);
    
    return { successCount, failCount };
  }

  // User registration
  app.post('/api/users/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
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

  // Get user by phone
  app.get('/api/users/phone/:phone', async (req, res) => {
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

  // Update user
  app.put('/api/users/:id', async (req, res) => {
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

  // Update user location
  app.post('/api/users/:id/location', async (req, res) => {
    try {
      const { lat, lng } = req.body;
      const user = await storage.updateUser(req.params.id, {
        location: {
          lat,
          lng,
          last_updated: new Date().toISOString()
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

  // Update FCM token
  app.post('/api/users/:userId/fcm-token', async (req, res) => {
    try {
      const { fcm_token } = req.body;
      
      if (!fcm_token || typeof fcm_token !== 'string') {
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
      console.error('Error updating FCM token:', error);
      res.status(500).json({ message: "Failed to update FCM token" });
    }
  });

  // Get nearby helpers
  app.get('/api/users/nearby', async (req, res) => {
    try {
      const { lat, lng, radius = 2 } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude required" });
      }

      const users = await storage.getUsersInRadius(
        parseFloat(lat as string),
        parseFloat(lng as string),
        parseFloat(radius as string)
      );

      res.json({ users: users.length, helpers: users });
    } catch (error) {
      res.status(500).json({ message: "Failed to get nearby helpers" });
    }
  });

  // Trigger SOS
  app.post('/api/sos/trigger', async (req, res) => {
    try {
      const sosData = insertSosEventSchema.parse(req.body);
      const sosEvent = await storage.createSosEvent(sosData);
      
      // Get user details
      const user = await storage.getUser(sosEvent.user_id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Track notification results
      const notificationResults = {
        sms: { sent: 0, failed: 0 },
        push: { sent: 0, failed: 0 }
      };

      // Send SMS to emergency contacts (don't let failures block the flow)
      if (user.emergency_contacts && user.emergency_contacts.length > 0) {
        const smsMessage = `EMERGENCY ALERT: ${user.name} has triggered an SOS alert. Location: ${sosEvent.location_address || 'Location shared'}. Please check immediately or call authorities.`;
        
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
        notificationResults.sms.sent = smsResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
        notificationResults.sms.failed = smsResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
      }

      // Get ALL app users (excluding the SOS sender) to notify as helpers
      const allUsers = await storage.getAllUsers();
      const helpers = allUsers.filter(u => u.id !== sosEvent.user_id);

      // Send push notifications to ALL app users (both online and offline)
      if (helpers.length > 0) {
        try {
          const pushResults = await notifyNearbyHelpers(sosEvent, helpers, user.name);
          notificationResults.push.sent = pushResults.successCount;
          notificationResults.push.failed = pushResults.failCount;
        } catch (error) {
          console.error('Error in push notification broadcast:', error);
        }
      }

      // Send SMS to ALL app users (helpers)
      const helperSmsMessage = `SOS HELP NEEDED: ${user.name} needs emergency help! Location: ${sosEvent.location_address || sosEvent.location.lat.toFixed(4) + ', ' + sosEvent.location.lng.toFixed(4)}. Open Bachaoo app to respond.`;
      
      const helperSmsPromises = helpers.map(async (helper) => {
        try {
          await sendSMS(helper.phone, helperSmsMessage);
          console.log(`SMS sent to helper: ${helper.phone}`);
          return { success: true, phone: helper.phone };
        } catch (error) {
          console.error(`Failed to send SMS to helper ${helper.phone}:`, error);
          return { success: false, phone: helper.phone, error };
        }
      });

      const helperSmsResults = await Promise.allSettled(helperSmsPromises);
      const helperSmsSent = helperSmsResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const helperSmsFailed = helperSmsResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
      
      // Update total SMS counts
      notificationResults.sms.sent += helperSmsSent;
      notificationResults.sms.failed += helperSmsFailed;

      // Broadcast to ALL helpers via WebSocket (real-time updates)
      const helperIds = helpers.map(h => h.id);
      broadcastToClients(helperIds, {
        type: 'sos_alert',
        sosEvent,
        user: { name: user.name },
        distance: helpers.map(h => ({
          userId: h.id,
          distance: h.location ? calculateDistance(
            sosEvent.location.lat,
            sosEvent.location.lng,
            h.location.lat,
            h.location.lng
          ) : null
        }))
      });

      console.log(`SOS Alert ${sosEvent.id} triggered by ${user.name}:`);
      console.log(`- SMS to emergency contacts: ${user.emergency_contacts?.length || 0} contacts`);
      console.log(`- SMS to ALL app helpers: ${helperSmsSent} sent, ${helperSmsFailed} failed`);
      console.log(`- Push to ALL app helpers: ${notificationResults.push.sent} sent, ${notificationResults.push.failed} failed`);
      console.log(`- WebSocket broadcast to ${helperIds.length} helpers`);

      res.json({ 
        sosEvent, 
        totalHelpers: helpers.length,
        notifications: notificationResults,
        message: "SOS alert triggered successfully" 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid SOS data", errors: error.errors });
      }
      console.error('Failed to trigger SOS:', error);
      res.status(500).json({ message: "Failed to trigger SOS" });
    }
  });

  // Respond to SOS
  app.post('/api/sos/respond', async (req, res) => {
    try {
      const responseData = insertSosResponseSchema.parse(req.body);
      
      // Calculate distance
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

      // Notify the SOS requester
      broadcastToClients([sosEvent.user_id], {
        type: 'responder_update',
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

  // Get nearby SOS events
  app.get('/api/sos/nearby', async (req, res) => {
    try {
      const { lat, lng, radius = 2 } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude required" });
      }

      const sosEvents = await storage.getSosEventsInRadius(
        parseFloat(lat as string),
        parseFloat(lng as string),
        parseFloat(radius as string)
      );

      // Add distance and responder count to each event
      const eventsWithDetails = await Promise.all(
        sosEvents.map(async (event) => {
          const responses = await storage.getSosEventResponses(event.id);
          const distance = calculateDistance(
            parseFloat(lat as string),
            parseFloat(lng as string),
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

  // Resolve SOS event
  app.post('/api/sos/:id/resolve', async (req, res) => {
    try {
      const { resolved_by } = req.body;
      
      const sosEvent = await storage.updateSosEvent(req.params.id, {
        status: "resolved",
        resolved_at: new Date(),
        resolved_by
      });

      if (!sosEvent) {
        return res.status(404).json({ message: "SOS event not found" });
      }

      // Notify all responders that the event is resolved
      const responses = await storage.getSosEventResponses(sosEvent.id);
      const responderIds = responses.map(r => r.responder_id);
      
      broadcastToClients([sosEvent.user_id, ...responderIds], {
        type: 'sos_resolved',
        sosEventId: sosEvent.id
      });

      res.json({ sosEvent });
    } catch (error) {
      res.status(500).json({ message: "Failed to resolve SOS event" });
    }
  });

  // Get SOS event details with responses
  app.get('/api/sos/:id', async (req, res) => {
    try {
      const sosEvent = await storage.getSosEvent(req.params.id);
      if (!sosEvent) {
        return res.status(404).json({ message: "SOS event not found" });
      }

      const responses = await storage.getSosEventResponses(sosEvent.id);
      
      // Get responder details
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

  // Get user dashboard stats
  app.get('/api/users/:id/stats', async (req, res) => {
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
        activeDays: user.created_at ? Math.ceil((Date.now() - user.created_at.getTime()) / (1000 * 60 * 60 * 24)) : 0,
        avgResponseTime: 2.5 // Mock average response time
      };

      res.json({ stats });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user stats" });
    }
  });

  // Admin: Get all users
  app.get('/api/admin/users', async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json({ users });
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  // Admin: Get all SOS events
  app.get('/api/admin/sos-events', async (req, res) => {
    try {
      const events = await storage.getAllSosEvents();
      res.json({ events });
    } catch (error) {
      res.status(500).json({ message: "Failed to get SOS events" });
    }
  });

  // Admin: Get system stats
  app.get('/api/admin/stats', async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const sosEvents = await storage.getAllSosEvents();
      
      const stats = {
        totalUsers: users.length,
        onlineUsers: users.filter(u => u.is_online).length,
        activeSosEvents: sosEvents.filter(e => e.status === 'active').length,
        resolvedSosEvents: sosEvents.filter(e => e.status === 'resolved').length,
        firebaseConnected: !!process.env.FIREBASE_PROJECT_ID,
        twilioConnected: !!process.env.TWILIO_ACCOUNT_SID,
      };

      res.json({ stats });
    } catch (error) {
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  return httpServer;
}
