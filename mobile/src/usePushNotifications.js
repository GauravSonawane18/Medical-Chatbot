import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Registers for Expo push notifications and sends the token to the backend.
 * isDoctor controls which endpoint to use.
 */
export function usePushNotifications(isDoctor = false) {
  useEffect(() => {
    let cancelled = false;

    async function register() {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        const tokenData = await Notifications.getExpoPushTokenAsync();
        if (cancelled) return;

        if (isDoctor) {
          await api.registerDoctorPushToken({ token: tokenData.data });
        } else {
          await api.registerPushToken({ token: tokenData.data });
        }
      } catch {
        // Notifications not available (simulator, permissions denied) — fail silently
      }
    }

    register();
    return () => { cancelled = true; };
  }, [isDoctor]);
}
