// lib/authStore.ts
// Auth state backed by Supabase. Session tokens are stored securely via
// expo-secure-store (configured inside lib/supabase.ts).
//
// Guest mode is kept as a local-only concept — no Supabase record is created.
// Social login (Apple, Google) will be added in a future sprint.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

const GUEST_KEY = '@sequins/guest';

let _session: Session | null = null;
let _isGuest = false;

// ─── Reads ────────────────────────────────────────────────────────────────────

export function isAuthenticated(): boolean {
  return _session !== null || _isGuest;
}

export function getSession(): Session | null {
  return _session;
}

export function isGuest(): boolean {
  return _isGuest;
}

export function getEmail(): string | undefined {
  return _session?.user?.email ?? undefined;
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

/** Call once on app start (alongside loadRole) to restore persisted state. */
export async function loadAuth(): Promise<boolean> {
  // Supabase restores the session from SecureStore automatically.
  const { data } = await supabase.auth.getSession();
  _session = data.session;

  if (!_session) {
    // Fall back to guest mode if that was previously set.
    const guest = await AsyncStorage.getItem(GUEST_KEY);
    _isGuest = guest === 'true';
  }

  return isAuthenticated();
}

// ─── Sign up ─────────────────────────────────────────────────────────────────

/**
 * Creates a new Supabase account.
 * Throws on failure — caller should catch and display the error.
 *
 * Note: if "Confirm email" is enabled in your Supabase project, the session
 * will be null after sign-up until the user clicks the confirmation link.
 * Disable it in Supabase → Auth → Email → "Confirm email" for local dev.
 */
export async function signUpWithEmail(email: string, password: string): Promise<void> {
  const { data, error } = await supabase.auth.signUp({
    email: email.toLowerCase().trim(),
    password,
  });
  if (error) throw error;
  _session = data.session;
  _isGuest = false;
}

// ─── Sign in ─────────────────────────────────────────────────────────────────

/** Signs into an existing Supabase account. Throws on failure. */
export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });
  if (error) throw error;
  _session = data.session;
  _isGuest = false;
}

// ─── Guest ───────────────────────────────────────────────────────────────────

/** Marks the user as a local guest — no Supabase record created. */
export async function signInAsGuest(): Promise<void> {
  _isGuest = true;
  _session = null;
  await AsyncStorage.setItem(GUEST_KEY, 'true');
}

// ─── Sign out ────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  if (_session) {
    await supabase.auth.signOut();
  }
  _session = null;
  _isGuest = false;
  await AsyncStorage.removeItem(GUEST_KEY);
}

// ─── Account deletion ─────────────────────────────────────────────────────────

/**
 * Permanently deletes the current user's account.
 *
 * Requires a SQL function in your Supabase project — run this once in the
 * Supabase SQL editor (Dashboard → SQL Editor → New query):
 *
 *   create or replace function delete_user()
 *   returns void
 *   language plpgsql
 *   security definer
 *   as $$
 *   begin
 *     delete from auth.users where id = auth.uid();
 *   end;
 *   $$;
 *
 * After deletion, all local state is cleared and the caller should redirect
 * to /auth.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_user');
  if (error) throw error;
  // Clear everything locally after successful deletion.
  _session = null;
  _isGuest = false;
  await AsyncStorage.removeItem(GUEST_KEY);
}

// ─── Password reset ───────────────────────────────────────────────────────────

/**
 * Sends a password reset email. The link redirects to sequins://auth/reset-password
 * which the deep link handler in _layout.tsx intercepts and routes to the
 * reset-password screen.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.toLowerCase().trim(),
    { redirectTo: 'sequins://auth/reset-password' },
  );
  if (error) throw error;
}

/**
 * Resends the confirmation email for users who haven't verified yet.
 */
export async function resendConfirmationEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.toLowerCase().trim(),
  });
  if (error) throw error;
}

// ─── Profile updates ─────────────────────────────────────────────────────────

export async function updateDisplayName(name: string): Promise<void> {
  if (!_session) return;
  await supabase.auth.updateUser({ data: { display_name: name.trim() } });
}

/**
 * Merges arbitrary key-value pairs into the current user's Supabase
 * user_metadata. Existing keys not present in `data` are left unchanged.
 */
export async function updateUserMetadata(data: Record<string, string>): Promise<void> {
  if (!_session) return;
  const { data: updated, error } = await supabase.auth.updateUser({ data });
  if (error) throw error;
  if (updated.user) {
    // Refresh local session so callers see the latest metadata immediately.
    const { data: sessionData } = await supabase.auth.getSession();
    _session = sessionData.session;
  }
}
