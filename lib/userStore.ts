// lib/userStore.ts
// Stores the current user's selected role.
// Persisted to AsyncStorage so it survives app restarts.
// In a future auth sprint this will be backed by a real user record.

import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'fan' | 'artist' | 'host';

const ROLE_KEY = '@sequins/userRole';

let _role: UserRole | null = null;

export function getRole(): UserRole | null {
  return _role;
}

export async function setRole(role: UserRole): Promise<void> {
  _role = role;
  await AsyncStorage.setItem(ROLE_KEY, role);
}

export async function loadRole(): Promise<UserRole | null> {
  const stored = await AsyncStorage.getItem(ROLE_KEY);
  if (stored === 'fan' || stored === 'artist' || stored === 'host') {
    _role = stored;
  }
  return _role;
}

export function hasRole(): boolean {
  return _role !== null;
}

export async function clearRole(): Promise<void> {
  _role = null;
  await AsyncStorage.removeItem(ROLE_KEY);
}

export const ROLES: {
  id: UserRole;
  emoji: string;
  title: string;
  tagline: string;
  perks: string[];
}[] = [
  {
    id: 'fan',
    emoji: '🎟️',
    title: 'Fan',
    tagline: 'Discover and support the drag scene',
    perks: [
      'Browse and buy tickets to local shows',
      'Follow your favorite performers',
      'Send tips directly to artists',
    ],
  },
  {
    id: 'artist',
    emoji: '💃',
    title: 'Artist',
    tagline: 'Grow your drag career',
    perks: [
      'Build a public performer profile',
      'Get discovered and booked for shows',
      'Accept tips and track your earnings',
    ],
  },
  {
    id: 'host',
    emoji: '🎪',
    title: 'Host',
    tagline: 'Run the whole show',
    perks: [
      'Create and publish events with ticketing',
      'Manage staff — DJs, door crew, tip takers',
      'Pay your team via Venmo or Stripe',
      'Generate invoices and track finances',
    ],
  },
];
