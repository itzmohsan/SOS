import { useState, useEffect } from 'react';
import { getDeviceToken, requestNotificationPermission } from '@/lib/firebase';

interface UseFirebaseMessagingResult {
  token: string | null;
  permission: NotificationPermission;
  isLoading: boolean;
  error: string | null;
}

export function useFirebaseMessaging(userId: string | null): UseFirebaseMessagingResult {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const registerForNotifications = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const notificationPermission = await requestNotificationPermission();
        setPermission(notificationPermission);

        if (notificationPermission !== 'granted') {
          setIsLoading(false);
          return;
        }

        const fcmToken = await getDeviceToken();
        
        if (fcmToken) {
          setToken(fcmToken);

          const response = await fetch(`/api/users/${userId}/fcm-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fcm_token: fcmToken }),
          });

          if (!response.ok) {
            throw new Error('Failed to register FCM token with backend');
          }

          console.log('FCM token successfully registered with backend');
        }
      } catch (err) {
        console.error('Error in Firebase messaging setup:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    registerForNotifications();
  }, [userId]);

  return {
    token,
    permission,
    isLoading,
    error,
  };
}
