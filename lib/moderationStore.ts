// lib/moderationStore.ts
// Report & block (App Store Guideline 1.2).
//
//  * Report: anyone signed in can report a performer profile, event, Shop
//    listing or account. Goes through the report-content edge function, which
//    saves it to content_reports and emails the moderator.
//  * Block: hides everything a user posted (profiles, events, listings) from
//    the blocker. Stored in user_blocks (RLS: you only see your own blocks).
//  * Whatever you report is hidden from you right away, before anyone reviews it.
//
// Feeds call filterBlocked*() so blocked/reported content never renders.

import { supabase } from './supabase';
import { getSession, isGuest } from './authStore';

export type ReportTargetType = 'performer' | 'event' | 'listing' | 'user';
export type ReportReason =
  | 'spam' | 'harassment' | 'hate' | 'sexual' | 'violence' | 'impersonation' | 'scam' | 'other';

export const REPORT_REASONS: { key: ReportReason; label: string }[] = [
  { key: 'harassment',    label: 'Harassment or bullying' },
  { key: 'hate',          label: 'Hate speech or symbols' },
  { key: 'sexual',        label: 'Sexual content or nudity' },
  { key: 'violence',      label: 'Violence or threats' },
  { key: 'impersonation', label: 'Pretending to be someone else' },
  { key: 'scam',          label: 'Scam or fraud' },
  { key: 'spam',          label: 'Spam or misleading' },
  { key: 'other',         label: 'Something else' },
];

let _blocked = new Set<string>();               // user ids I've blocked
let _reported = new Set<string>();              // `${type}:${id}` I've reported
let _loadedFor: string | null = null;           // user id the cache belongs to
const _listeners = new Set<() => void>();

const key = (type: ReportTargetType, id: string) => `${type}:${id}`;
function emit() { _listeners.forEach((l) => { try { l(); } catch { /* ignore */ } }); }

/** Re-render when blocks/reports change. Returns an unsubscribe function. */
export function subscribeToModeration(listener: () => void): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}

/** Load my blocks and reports. Cheap to call often; refetches only when the signed-in user changes. */
export async function loadModeration(force = false): Promise<void> {
  const session = getSession();
  const uid = session && !isGuest() ? session.user.id : null;
  if (!uid) {
    if (_loadedFor !== null) { _blocked = new Set(); _reported = new Set(); _loadedFor = null; emit(); }
    return;
  }
  if (!force && _loadedFor === uid) return;

  const [blocks, reports] = await Promise.all([
    supabase.from('user_blocks').select('blocked_id').eq('blocker_id', uid),
    supabase.from('content_reports').select('target_type, target_id').eq('reporter_id', uid),
  ]);
  _blocked = new Set((blocks.data ?? []).map((r: { blocked_id: string }) => r.blocked_id));
  _reported = new Set((reports.data ?? []).map((r: { target_type: ReportTargetType; target_id: string }) => key(r.target_type, r.target_id)));
  _loadedFor = uid;
  emit();
}

export function isBlocked(userId?: string | null): boolean {
  return !!userId && _blocked.has(userId);
}

export function wasReported(type: ReportTargetType, id: string): boolean {
  return _reported.has(key(type, id));
}

/** True when this item should be hidden from me (I blocked its owner, or I reported it). */
export function isHidden(type: ReportTargetType, id: string, ownerId?: string | null): boolean {
  return isBlocked(ownerId) || wasReported(type, id);
}

export function getBlockedIds(): string[] {
  return Array.from(_blocked);
}

// ── Filters for feeds ────────────────────────────────────────────────────────

export function filterBlockedEvents<T extends { id: string; hostId?: string | null }>(events: T[]): T[] {
  if (_blocked.size === 0 && _reported.size === 0) return events;
  return events.filter((e) => !isHidden('event', e.id, e.hostId));
}

export function filterBlockedPerformers<T extends { id: string; userId?: string | null }>(performers: T[]): T[] {
  if (_blocked.size === 0 && _reported.size === 0) return performers;
  return performers.filter((p) => !isHidden('performer', p.id, p.userId));
}

export function filterBlockedListings<T extends { id: string; sellerId?: string | null }>(listings: T[]): T[] {
  if (_blocked.size === 0 && _reported.size === 0) return listings;
  return listings.filter((l) => !isHidden('listing', l.id, l.sellerId));
}

// ── Actions ──────────────────────────────────────────────────────────────────

async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  try {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.json();
      if (body?.error) return String(body.error);
    }
  } catch { /* ignore */ }
  return fallback;
}

/** Send a report. The item is hidden for me immediately. Returns the owner's user id when known (so the UI can offer Block). */
export async function reportContent(input: {
  targetType: ReportTargetType;
  targetId: string;
  targetLabel?: string;
  reason: ReportReason;
  details?: string;
}): Promise<{ ownerId: string | null }> {
  if (!getSession() || isGuest()) throw new Error('Sign in to report content.');
  const { data, error } = await supabase.functions.invoke('report-content', { body: input });
  if (error) throw new Error(await functionErrorMessage(error, 'Could not send the report. Please try again.'));
  if (data?.error) throw new Error(data.error);
  _reported.add(key(input.targetType, input.targetId));
  emit();
  return { ownerId: (data?.ownerId as string | null) ?? null };
}

export async function blockUser(userId: string): Promise<void> {
  const session = getSession();
  if (!session || isGuest()) throw new Error('Sign in to block accounts.');
  if (userId === session.user.id) throw new Error("You can't block yourself.");
  const { error } = await supabase
    .from('user_blocks')
    .upsert({ blocker_id: session.user.id, blocked_id: userId }, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true });
  if (error) throw new Error('Could not block this account. Please try again.');
  _blocked.add(userId);
  emit();
}

export async function unblockUser(userId: string): Promise<void> {
  const session = getSession();
  if (!session) return;
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', session.user.id)
    .eq('blocked_id', userId);
  if (error) throw new Error('Could not unblock. Please try again.');
  _blocked.delete(userId);
  emit();
}
