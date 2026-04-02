import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Android requires a notification channel
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'MedAssist',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2563eb',
  });
}

/**
 * Registers for Expo push notifications and sends the token to the backend.
 * isDoctor controls which endpoint to use.
 *
 * Requires EAS project to be linked:
 *   npx expo login && npx eas init
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

        // projectId is set by `npx eas init` into app.json > extra.eas.projectId
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;

        if (!projectId) {
          // Push notifications require EAS setup:
          // Run: npx expo login && npx eas init
          return;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        if (cancelled) return;

        const token = tokenData?.data;
        if (!token) return;

        if (isDoctor) {
          await api.registerDoctorPushToken({ token });
        } else {
          await api.registerPushToken({ token });
        }
      } catch {
        // Fail silently — simulator or EAS not configured
      }
    }

    register();
    return () => { cancelled = true; };
  }, [isDoctor]);
}
