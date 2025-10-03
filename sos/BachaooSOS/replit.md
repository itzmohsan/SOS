# Bachaoo Emergency SOS Network

## Overview

Bachaoo is an emergency SOS network application designed to enable rapid response to emergencies through community-based assistance. The system allows users to trigger SOS alerts with one tap, automatically notifying nearby helpers within a 2km radius. It features real-time location tracking, audio recording during emergencies, SMS notifications to emergency contacts, and a map-based interface for coordinating responses.

The application is built as a Progressive Web App (PWA) with a mobile-first design, targeting users in Pakistan who need quick access to emergency assistance from their community.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **React with TypeScript** - Type-safe component development
- **Wouter** - Lightweight client-side routing
- **TanStack Query (React Query)** - Server state management and data fetching
- **Shadcn/ui + Radix UI** - Accessible component library with Tailwind CSS styling
- **Vite** - Fast build tool and development server

**Key Design Patterns:**
- Component-based architecture with reusable UI components
- Custom hooks for cross-cutting concerns (geolocation, audio recording, WebSocket communication)
- Context-based state management for user sessions
- Progressive Web App capabilities for mobile-first experience

**Client Structure:**
- `/client/src/pages` - Route-level page components (home, emergency, respond, dashboard, profile)
- `/client/src/components` - Reusable UI components and feature-specific components
- `/client/src/hooks` - Custom React hooks for shared functionality
- `/client/src/lib` - Utility functions and shared logic

### Backend Architecture

**Technology Stack:**
- **Express.js** - Web application framework
- **TypeScript** - Type-safe server development
- **WebSocket (ws)** - Real-time bidirectional communication
- **Drizzle ORM** - Type-safe database queries
- **PostgreSQL** - Primary database (via Neon serverless)

**Key Design Patterns:**
- RESTful API design for CRUD operations
- WebSocket-based real-time event broadcasting
- In-memory storage abstraction with interface-based design (IStorage)
- Haversine formula implementation for proximity calculations

**API Endpoints:**
- User management (registration, profile updates, location tracking)
- SOS event lifecycle (trigger, resolve, status updates)
- Response management (accept, arrive, cancel)
- Proximity queries (nearby users, nearby emergencies)

**Real-time Communication:**
- WebSocket server for instant alert broadcasting
- User registration with WebSocket connections
- Location updates via WebSocket
- Emergency alerts pushed to nearby users in real-time

### Data Storage Solutions

**Database Schema (PostgreSQL with Drizzle ORM):**

**Users Table:**
- User identification and contact information (phone, name)
- Emergency contacts stored as JSONB array
- Location tracking (lat/lng with last updated timestamp)
- Online status and availability flags
- Response metrics (count, rating)

**SOS Events Table:**
- Event tracking with location coordinates
- Audio recording URLs for emergency context
- Status management (active/resolved)
- Resolution metadata (timestamp, resolver)

**SOS Responses Table:**
- Links responders to SOS events
- Response status tracking (responding/arrived/cancelled)
- Distance calculations for proximity awareness

**Storage Implementation:**
- Interface-based storage abstraction (IStorage)
- In-memory implementation (MemStorage) for development/testing
- Designed for easy migration to PostgreSQL with Drizzle
- Haversine formula for geographic proximity queries

### Authentication and Authorization

**Current Implementation:**
- Phone-based user registration
- LocalStorage-based session persistence
- No password authentication (MVP phase)
- User identification via unique phone numbers

**Session Management:**
- User data stored in browser LocalStorage
- WebSocket connections tied to user IDs
- Server-side user validation on API requests

### External Dependencies

**Third-Party Services:**

**Twilio SMS Service (✅ CONFIGURED):**
- Emergency contact notifications via SMS
- Alert messages to registered emergency contacts
- Server-side SMS sending for security
- Integrated using Replit's secure Twilio connection
- Credentials managed securely through Replit Connectors
- No manual environment variable configuration needed

**Geolocation Services:**
- Browser Geolocation API for user positioning
- OpenCage Geocoding API for reverse geocoding (coordinates to addresses)
- Google Maps/Mapbox integration ready for map visualization

**Neon Serverless PostgreSQL:**
- Cloud-hosted PostgreSQL database
- Connection via DATABASE_URL environment variable
- Serverless architecture for scalability

**Real-time Infrastructure:**
- Native WebSocket (ws library) for bidirectional communication
- HTTP server upgrade for WebSocket connections
- Client-side automatic reconnection logic

**Development Tools:**
- Replit-specific plugins (error overlay, cartographer, dev banner)
- Vite development server with HMR
- TypeScript compilation with strict mode

## Replit Environment Setup

**Installation & Configuration (Completed):**
- Node.js 20 installed and configured
- All npm dependencies installed (including Firebase client SDK)
- PostgreSQL database configured and migrations applied
- Vite dev server configured with `allowedHosts: true` for Replit proxy support
- Development server running on port 5000

**Current Status:**
- ✅ Development server running successfully
- ✅ Frontend accessible and rendering correctly
- ✅ Database connected and operational
- ✅ WebSocket server configured at `/ws` endpoint
- ⚠️ Firebase Firestore NOT enabled (credentials provided but Firestore database doesn't exist in Firebase project)
- ⚠️ Currently using MemStorage (in-memory) - data will be lost on restart
- ✅ Twilio integration ready via Replit Connectors
- ✅ Registration form simplified to: name, phone number, and optional profile photo

**Known Issues:**
- Vite HMR WebSocket connection shows handshake error in browser console (cosmetic issue, doesn't affect functionality)
- Firebase Firestore database needs to be enabled in Firebase Console for data persistence
- Error: "5 NOT_FOUND" from Firestore because database doesn't exist
- To fix: Go to Firebase Console → Build → Firestore Database → Create Database

**Deployment Notes:**
- Production build command: `npm run build`
- Production start command: `npm start`
- Server binds to 0.0.0.0:5000 (or PORT env variable)
- Frontend and backend served from same port (no CORS issues)

**Frontend Libraries:**
- Multiple Radix UI primitives for accessible components
- Embla Carousel for touch-friendly carousels
- React Hook Form with Zod validation
- date-fns for date formatting
- class-variance-authority for variant-based styling