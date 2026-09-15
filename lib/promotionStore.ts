// lib/promotionStore.ts
// Paid, time-boxed "promoted placement" boost for events and performer
// profiles -- floats them to the top of Discover for a fixed number of
// days. Replaces the old free/unlimited is_promoted self-toggle.

import { supabase } from './supabase';
import { getSession, isGuest } from './authStore';
import { markEventPromoted } from './eventsStore';
import { markPerformerPromoted } from './performerStore';

// Placeholder -- mirror of the price/duration set server-side in
// create-promotion-checkout (PROMOTION_PRICE_USD_CENTS / PROMOTION_DAYS).
// Keep these in sync.
export const PROMOTION_PRICE_LABEL = '$4.99';
export const PROMOTION_DAYS = 7;

export type PromotionTarget = 'event' | 'performer';

/** True if `isPromoted` is set AND the paid boost hasn't expired yet. */
export function isCurrentlyPromoted(isPromoted?: boolean, promotedUntil?: string | null): boolean {
  if (!isPromoted) return false;
  if (!promotedUntil) return false; // no expiry stamped -- treat as not (or expired) boost
  return new Date(promotedUntil).getTime() > Date.now();
}

export async function startPromotionCheckout(
  targetType: PromotionTarget,
  targetId: string,
): Promise<{ clientSecret: string; paymentIntentId: string; promotionDays: number }> {
  const session = getSession();
  if (!session || isGuest()) throw new Error('Must be signed in to promote.');

  const { data, error } = await supabase.functions.invoke('create-promotion-checkout', {
    body: { targetType, targetId },
  });

  if (error) throw new Error(error.message ?? 'Could not start promotion checkout.');
  if (!data?.clientSecret || !data?.paymentIntentId) throw new Error('Invalid response from promotion service.');

  return {
    clientSecret: data.clientSecret,
    paymentIntentId: data.paymentIntentId,
    promotionDays: data.promotionDays ?? PROMOTION_DAYS,
  };
}

export async function confirmEventPromotion(eventId: string, paymentIntentId: string, days: number) {
  return markEventPromoted(eventId, paymentIntentId, days);
}

export async function confirmPerformerPromotion(performerId: string, paymentIntentId: string, days: number) {
  return markPerformerPromoted(performerId, paymentIntentId, days);
}

// ─── Ranking dashboard ──────────────────────────────────────────────────────
// Shows a host/performer where they currently land in the same order fans
// see in Discover (promoted-and-not-expired first, then the default sort),
// so "promote to jump to the top" is a real, verifiable claim.

import { loadEvents, type EventRecord } from './eventsStore';
import { loadPerformers, getPerformers, type PerformerRecord } from './performerStore';

export type EventRanking = {
  eventId: string;
  title: string;
  rank: number;
  totalUpcoming: number;
  promotedCount: number;
  isPromoted: boolean;
  promotedUntil?: string | null;
};

function discoverOrderEvents(events: EventRecord[]): EventRecord[] {
  return [...events].sort((a, b) => {
    const aPromoted = isCurrentlyPromoted(a.isPromoted, a.promotedUntil);
    const bPromoted = isCurrentlyPromoted(b.isPromoted, b.promotedUntil);
    if (aPromoted && !bPromoted) return -1;
    if (!aPromoted && bPromoted) return 1;
    const aTime = a.datetimeStart ? new Date(a.datetimeStart).getTime() : Infinity;
    const bTime = b.datetimeStart ? new Date(b.datetimeStart).getTime() : Infinity;
    return aTime - bTime;
  });
}

/** Where each of this host's upcoming events currently ranks among ALL
 *  upcoming events on Sequins, in the same order Discover shows them. */
export async function getHostEventRankings(hostId: string): Promise<EventRanking[]> {
  const allUpcoming = await loadEvents();
  const sorted = discoverOrderEvents(allUpcoming);
  const promotedCount = sorted.filter(e => isCurrentlyPromoted(e.isPromoted, e.promotedUntil)).length;

  return sorted
    .map((e, idx) => ({
      eventId: e.id,
      title: e.title,
      rank: idx + 1,
      totalUpcoming: sorted.length,
      promotedCount,
      isPromoted: isCurrentlyPromoted(e.isPromoted, e.promotedUntil),
      promotedUntil: e.promotedUntil,
    }))
    .filter((_, idx) => sorted[idx].hostId === hostId);
}

export type PerformerRanking = {
  rank: number;
  totalTalent: number;
  promotedCount: number;
  isPromoted: boolean;
  promotedUntil?: string | null;
};

function discoverOrderTalent(performers: PerformerRecord[]): PerformerRecord[] {
  // Mirrors Discover's talent sort: promoted first, otherwise the
  // alphabetical-by-stage-name order performerStore already loads in.
  return [...performers].sort((a, b) => {
    const aPromoted = isCurrentlyPromoted(a.isPromoted, a.promotedUntil);
    const bPromoted = isCurrentlyPromoted(b.isPromoted, b.promotedUntil);
    if (aPromoted && !bPromoted) return -1;
    if (!aPromoted && bPromoted) return 1;
    return 0;
  });
}

/** Where this performer currently ranks in the talent directory Discover
 *  shows fans. */
export async function getPerformerRanking(performerId: string): Promise<PerformerRanking | null> {
  const cached = getPerformers();
  const all = cached.length > 0 ? cached : (await loadPerformers().then(getPerformers));
  const sorted = discoverOrderTalent(all);
  const idx = sorted.findIndex(p => p.id === performerId);
  if (idx === -1) return null;

  const promotedCount = sorted.filter(p => isCurrentlyPromoted(p.isPromoted, p.promotedUntil)).length;
  const me = sorted[idx];
  return {
    rank: idx + 1,
    totalTalent: sorted.length,
    promotedCount,
    isPromoted: isCurrentlyPromoted(me.isPromoted, me.promotedUntil),
    promotedUntil: me.promotedUntil,
  };
}
