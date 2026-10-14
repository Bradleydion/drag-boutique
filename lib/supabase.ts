// lib/supabase.ts
// Configured Supabase client. Uses expo-secure-store to persist the session
// token securely on device — survives app restarts without exposing tokens
// to AsyncStorage (which is unencrypted).

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// These are inlined at BUILD time, not read at runtime. Locally they come from
// .env.local; in EAS builds they come from EAS environment variables, because
// .env.local is gitignored and never reaches the build server. If they are
// missing, createClient() throws an opaque error at import time and the app
// dies on the splash screen with no message — so fail loudly instead.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL and/or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Local dev: check .env.local. EAS build: run `eas env:list` and confirm both are ' +
      'set for this build profile’s environment.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // must be false for React Native
  },
});

// ── Readable Edge Function errors ────────────────────────────────────────────
// When a function answers with a non-2xx status, supabase-js hides the body and
// sets error.message to "Edge Function returned a non-2xx status code". Our
// functions always send { error: "<plain-English reason>" }, so pull that out
// and use it as the message everyone sees. The parsed body is kept on
// error.body for callers that need flags like soldOut.
const rawInvoke = supabase.functions.invoke.bind(supabase.functions);
(supabase.functions as any).invoke = async (name: string, options?: any) => {
  const res: any = await rawInvoke(name, options);
  const ctx = res?.error?.context;
  if (ctx && typeof ctx.clone === 'function') {
    try {
      const body = await ctx.clone().json();
      if (body && typeof body.error === 'string' && body.error) {
        res.error.message = body.error;
      }
      res.error.body = body;
    } catch {
      // body wasn't JSON — keep supabase-js's message
    }
  }
  return res;
};
