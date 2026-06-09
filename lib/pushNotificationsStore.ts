// lib/pushNotificationsStore.ts
// Handles Expo push notification token registration and device-push dispatch.
//
// HOW IT WORKS:
//   1. On first sign-in, call registerForPushNotificationsAsync() to get a token.
//   2. We upsert that token to Supabase user_push_tokens so the backend can reach this device.
//   3. When we want to push-notify another user, call sendPushNotification(userId, ...).
//      This calls the `send-push-notification` Edge Function which fans out to all
//      registered devices for that user via the Expo Push API.
//
// REQUIRES: expo-notifications must be installed:
//   npx expo install expo-notifications

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getSession, isGuest } from './authStore';
import { supabase } from './supabase';

// ── Notification behaviour while app is foregrounded ─────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Module-level token cache ───────────────────────────────────────────────────
let _pushToken: string | null = null;

export function getCachedPushToken(): string | null {
  return _pushToken;
}

// ── Register this device ───────────────────────────────────────────────────────

/**
 * Request push notification permissions and register the device's Expo push token
 * with Supabase so the backend can send real push notifications to this device.
 *
 * Safe to call multiple times — token is upserted by (user_id, token) so no duplicates.
 * Should be called after the user signs in (not before — we need a user_id).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const session = getSession();
  if (!session || isGuest()) return null;

  // Physical device only — push does not work in simulators
  const { isDevice } = await import('expo-constants').then(m => m.default);
  if (!isDevice) {
    console.log('[push] Skipping push registration — not a physical device');
    return null;
  }

  // Request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[push] Push notification permission denied');
    return null;
  }

  // Get the Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: '6b8fe22f-a1c2-4f7e-bb04-5c1f0d1d6e0a', // from app.json expo.extra.eas.projectId if set
  }).catch(async () => {
    // Fallback without projectId for local dev builds
    return Notifications.getExpoPushTokenAsync();
  });

  const token = tokenData.data;
  _pushToken = token;

  // Determine platform
  const platform: 'ios' | 'android' | 'web' | 'unknown' =
    Platform.OS === 'ios'     ? 'ios' :
    Platform.OS === 'android' ? 'android' :
    Platform.OS === 'web'     ? 'web' : 'unknown';

  // Upsert to Supabase (unique constraint on user_id + token prevents duplicates)
  const { error } = await supabase
    .from('user_push_tokens')
    .upsert(
      { user_id: session.user.id, token, platform, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' },
    );

  if (error) {
    console.warn('[push] Failed to save push token:', error.message);
  } else {
    console.log('[push] Push token registered:', token.slice(0, 30) + '…');
  }

  // Android: set notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Sequins',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0DB8A8',
    });
  }

  return token;
}

/**
 * Remove this device's push token from Supabase (call on sign-out).
 * Prevents push notifications reaching a logged-out device.
 */
export async function unregisterPushToken(): Promise<void> {
  if (!_pushToken) return;
  const session = getSession();
  if (!session) return;

  await supabase
    .from('user_push_tokens')
    .delete()
    .eq('user_id', session.user.id)
    .eq('token', _pushToken);

  _pushToken = null;
}

// ── Send a push notification to another user ──────────────────────────────────

/**
 * Fire-and-forget push notification to any user via the Supabase Edge Function.
 * Non-fatal — never throws; just logs on failure.
 *
 * This fans out to ALL registered devices for the target user.
 */
export async function sendPushNotification(params: {
  userId: string;
  title: string;
  body?: string;
  data?: Record<string, string>;
}): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: params.userId,
        title:   params.title,
        body:    params.body ?? '',
        data:    params.data ?? {},
      },
    });
    if (error) console.warn('[push] sendPushNotification error:', error.message);
  } catch (e: any) {
    console.warn('[push] sendPushNotification exception:', e?.message);
  }
}
