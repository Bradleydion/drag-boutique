// lib/followStore.ts
// Manages the follow graph between users and performers.
// Backed by the Supabase `follows` table with RLS.
//
// Required Supabase table (run once in SQL editor):
//
//   create table follows (
//     id uuid primary key default gen_random_uuid(),
//     follower_id uuid not null references auth.users(id) on delete cascade,
//     performer_id text not null,
//     created_at timestamptz default now(),
//     unique(follower_id, performer_id)
//   );
//
//   alter table follows enable row level security;
//   create policy "read follows" on follows for select to authenticated using (true);
//   create policy "follow" on follows for insert to authenticated with check (auth.uid() = follower_id);
//   create policy "unfollow" on follows for delete to authenticated using (auth.uid() = follower_id);

import { getSession, isGuest } from './authStore';
import { supabase } from './supabase';

// Local cache — set of performer IDs the current user follows.
let _followedIds = new Set<string>();
let _loaded = false;

// ─── Bootstrap ───────────────────────────────────────────────────────────────

/** Load the current user's follows from Supabase. Call once on app start. */
export async function loadFollows(): Promise<void> {
  const session = getSession();
  if (!session) { _followedIds = new Set(); _loaded = true; return; }

  const { data, error } = await supabase
    .from('follows')
    .select('performer_id')
    .eq('follower_id', session.user.id);

  if (!error && data) {
    _followedIds = new Set(data.map(r => r.performer_id));
  }
  _loaded = true;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export function isFollowing(performerId: string): boolean {
  return _followedIds.has(performerId);
}

export function getFollowedIds(): string[] {
  return Array.from(_followedIds);
}

export function followsLoaded(): boolean {
  return _loaded;
}

/**
 * Returns the follower count for a performer directly from Supabase.
 * Suitable for a one-off fetch on the performer detail screen.
 */
export async function getFollowerCount(performerId: string): Promise<number> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('performer_id', performerId);

  return error ? 0 : (count ?? 0);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Follow a performer. Returns true on success.
 * Throws if called by a guest — callers should check isGuest() first.
 */
export async function followPerformer(performerId: string): Promise<boolean> {
  const session = getSession();
  if (!session || isGuest()) throw new Error('Must be signed in to follow artists.');

  const { error } = await supabase.from('follows').insert({
    follower_id: session.user.id,
    performer_id: performerId,
  });

  if (!error) {
    _followedIds.add(performerId);
    return true;
  }
  // Unique constraint violation = already following — treat as success.
  if (error.code === '23505') { _followedIds.add(performerId); return true; }
  throw error;
}

/**
 * Unfollow a performer. Returns true on success.
 */
export async function unfollowPerformer(performerId: string): Promise<boolean> {
  const session = getSession();
  if (!session || isGuest()) throw new Error('Must be signed in to unfollow artists.');

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', session.user.id)
    .eq('performer_id', performerId);

  if (!error) {
    _followedIds.delete(performerId);
    return true;
  }
  throw error;
}
