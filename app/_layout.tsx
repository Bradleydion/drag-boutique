import * as Linking from 'expo-linking';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';
import { supabase } from '../lib/supabase';
import { hasRole } from '../lib/userStore';
import { colors } from '../src/theme/colors';
import { DismissKeyboard } from '../components/DismissKeyboard';
import { SplashScreen } from '../components/SplashScreen';
import {
  registerForPushNotificationsAsync,
  unregisterPushToken,
} from '../lib/pushNotificationsStore';

// Stripe publishable key — set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in your .env
// Use pk_test_... for development, pk_live_... for production
const STRIPE_PK = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

/**
 * Parses a Supabase deep link URL and handles auth callbacks.
 * Supabase puts tokens in the URL *fragment* (after #), not query params,
 * so we split on # and parse manually.
 *
 * Handled types:
 *   recovery     → password reset link → navigate to reset-password screen
 *   signup       → email confirmation link → establish session, go to onboarding
 *   email_change → email change confirmation → establish session, stay in app
 *   magiclink    → magic link login → establish session, go to onboarding/discover
 *
 * IMPORTANT: You must also add "sequins://" to Supabase Dashboard →
 * Authentication → URL Configuration → Redirect URLs for these deep links
 * to be accepted by Supabase (otherwise it rejects them as untrusted).
 */
async function handleDeepLink(url: string) {
  const fragment = url.split('#')[1];
  if (!fragment) return;

  const params = Object.fromEntries(new URLSearchParams(fragment));
  const { type, access_token, refresh_token } = params;

  if (!access_token || !refresh_token) return;

  // Establish the session for all auth deep link types
  await supabase.auth.setSession({ access_token, refresh_token });

  if (type === 'recovery') {
    router.replace('/auth/reset-password');
  } else {
    // signup, email_change, magiclink — session is now live, send to app
    router.replace(hasRole() ? '/(tabs)/discover' : '/onboarding');
  }
}

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    // App opened cold via deep link.
    Linking.getInitialURL().then(url => { if (url) handleDeepLink(url); });

    // App already open — link tapped while foregrounded.
    const linkSub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));

    // Supabase session events — redirect to auth on sign-out; register push on sign-in.
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        unregisterPushToken(); // remove this device's token on logout
        router.replace('/auth');
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Register / refresh push token in the background — non-blocking
        registerForPushNotificationsAsync().catch(() => {});
      }
    });

    // Also register on cold start if already signed in
    registerForPushNotificationsAsync().catch(() => {});

    return () => {
      linkSub.remove();
      authSub.unsubscribe();
    };
  }, []);

  return (
    <StripeProvider publishableKey={STRIPE_PK} merchantIdentifier="merchant.app.sequins">
      <StatusBar style="light" />
      <DismissKeyboard>
        {!splashDone && <SplashScreen onFinish={() => setSplashDone(true)} />}
        <Stack
          screenOptions={{
            headerShown: true,
            headerStyle: { backgroundColor: colors.navy },
            headerTitleStyle: { color: colors.textPrimary },
            headerTintColor: colors.teal,
            contentStyle: { backgroundColor: colors.navy },
          }}
        >
          <Stack.Screen name="(tabs)"        options={{ headerShown: false, headerBackTitle: 'Back' }} />
          <Stack.Screen name="onboarding"    options={{ headerShown: false }} />
          {/* Suppress outer root-Stack header for nested event flows — each has its own _layout.tsx */}
          <Stack.Screen name="event/create"  options={{ headerShown: false }} />
          <Stack.Screen name="event/[id]"    options={{ headerShown: false }} />
          {/* Host profile setup — shown once after selecting Host role in onboarding */}
          <Stack.Screen name="host/setup"    options={{ headerShown: false }} />
          {/* Notifications — back button should say "Back", not the raw route "(tabs)" */}
          <Stack.Screen name="notifications" options={{ headerBackTitle: 'Back' }} />
        </Stack>
      </DismissKeyboard>
    </StripeProvider>
  );
}
