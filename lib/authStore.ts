// lib/authStore.ts
// Auth state backed by Supabase. Session tokens are stored securely via
// expo-secure-store (configured inside lib/supabase.ts).
//
// Guest mode is session-scoped only — it is NOT persisted to AsyncStorage.
// A guest who restarts the app is prompted to sign in or create an account.
// This keeps the auth funnel healthy and prevents Android from auto-landing
// in guest mode on every launch.
//
// Social login (Apple, Google) will be added in a future sprint.

import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

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

/**
 * Call once on app start (alongside loadRole) to restore persisted state.
 *
 * Guest mode is intentionally NOT restored — a returning user who was a guest
 * is sent to /auth to encourage account creation. Real Supabase sessions ARE
 * restored (via expo-secure-store) so authenticated users aren't re-prompted.
 */
export async function loadAuth(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  _session = data.session;
  _isGuest = false; // never auto-restore guest across sessions
  return isAuthenticated();
}

// ─── Sign up ─────────────────────────────────────────────────────────────────

/**
 * Creates a new Supabase account.
 * Throws on failure — caller should catch and display the error.
 *
 * emailRedirectTo points to sequins:// so the confirmation email link opens
 * the app (rather than localhost). The deep link handler in _layout.tsx then
 * calls supabase.auth.setSession() with the tokens from the URL fragment.
 *
 * Note: if "Confirm email" is enabled in your Supabase project, the session
 * will be null after sign-up until the user clicks the confirmation link.
 * You must also add "sequins://" to Supabase → Auth → URL Configuration →
 * Redirect URLs for the deep link to be accepted.
 */
export async function signUpWithEmail(email: string, password: string): Promise<void> {
  const { data, error } = await supabase.auth.signUp({
    email: email.toLowerCase().trim(),
    password,
    options: {
      emailRedirectTo: 'sequins://auth',
    },
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

/**
 * Marks the user as a local guest for this session only.
 * Not saved to AsyncStorage — clears on app restart.
 */
export async function signInAsGuest(): Promise<void> {
  _isGuest = true;
  _session = null;
  // Deliberately not persisting to AsyncStorage — guest mode is session-only.
}

// ─── Sign out ────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  if (_session) {
    await supabase.auth.signOut();
  }
  _session = null;
  _isGuest = false;
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
  _session = null;
  _isGuest = false;
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
    options: {
      emailRedirectTo: 'sequins://auth',
    },
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
