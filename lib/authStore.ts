// lib/authStore.ts
// Manages auth state. MVP supports guest mode and email (stubbed).
// Social login (Apple, Google) will be wired in a future sprint.

import AsyncStorage from '@react-native-async-storage/async-storage';

export type AuthMethod = 'guest' | 'email';

export interface AuthState {
  method: AuthMethod;
  email?: string;       // set for email sign-in
  displayName?: string; // set once profile is created
}

const AUTH_KEY = '@sequins/auth';

let _auth: AuthState | null = null;

export function getAuth(): AuthState | null {
  return _auth;
}

export function isAuthenticated(): boolean {
  return _auth !== null;
}

export async function signInAsGuest(): Promise<void> {
  _auth = { method: 'guest' };
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(_auth));
}

export async function signInWithEmail(email: string, _password: string): Promise<void> {
  // TODO: replace with real API call (Supabase / Firebase / custom backend)
  _auth = { method: 'email', email: email.toLowerCase().trim() };
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(_auth));
}

export async function loadAuth(): Promise<AuthState | null> {
  const stored = await AsyncStorage.getItem(AUTH_KEY);
  if (stored) {
    try {
      _auth = JSON.parse(stored) as AuthState;
    } catch {
      _auth = null;
    }
  }
  return _auth;
}

export async function updateDisplayName(name: string): Promise<void> {
  if (!_auth) return;
  _auth = { ..._auth, displayName: name.trim() };
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(_auth));
}

export async function signOut(): Promise<void> {
  _auth = null;
  await AsyncStorage.removeItem(AUTH_KEY);
}
