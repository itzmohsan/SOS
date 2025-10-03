import admin from 'firebase-admin';

let firebaseApp: admin.app.App | null = null;

export function getFirebaseAdmin() {
  if (firebaseApp) {
    return firebaseApp;
  }
  
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase credentials not configured. Push notifications will not be available.');
    return null;
  }
  
  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    
    console.log('Firebase Admin SDK initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    return null;
  }
}

export async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const app = getFirebaseAdmin();
  
  if (!app) {
    console.warn('Firebase not initialized. Cannot send push notification.');
    return null;
  }
  
  try {
    const message: admin.messaging.Message = {
      notification: {
        title,
        body,
      },
      token: fcmToken,
    };
    
    if (data) {
      message.data = data;
    }
    
    const response = await admin.messaging().send(message);
    console.log(`Push notification sent successfully to ${fcmToken}, response: ${response}`);
    return response;
  } catch (error) {
    console.error('Failed to send push notification:', error);
    throw error;
  }
}
