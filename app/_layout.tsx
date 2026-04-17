import * as Linking from 'expo-linking';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { colors } from '../src/theme/colors';

/**
 * Parses a Supabase deep link URL and handles auth callbacks.
 * Supabase puts tokens in the URL *fragment* (after #), not query params,
 * so we split on # and parse manually.
 *
 * Handled types:
 *   recovery  → password reset link clicked → navigate to reset-password screen
 */
async function handleDeepLink(url: string) {
  const fragment = url.split('#')[1];
  if (!fragment) return;

  const params = Object.fromEntries(new URLSearchParams(fragment));
  const { type, access_token, refresh_token } = params;

  if (type === 'recovery' && access_token && refresh_token) {
    // Establish session from the tokens in the link so updateUser() works.
    await supabase.auth.setSession({ access_token, refresh_token });
    router.replace('/auth/reset-password');
  }
}

export default function RootLayout() {
  useEffect(() => {
    // App opened cold via deep link.
    Linking.getInitialURL().then(url => { if (url) handleDeepLink(url); });

    // App already open — link tapped while foregrounded.
    const linkSub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));

    // Supabase session events — redirect to auth on sign-out.
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/auth');
      }
    });

    return () => {
      linkSub.remove();
      authSub.unsubscribe();
    };
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.navy },
          headerTitleStyle: { color: colors.textPrimary },
          headerTintColor: colors.teal,
          contentStyle: { backgroundColor: colors.navy },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
