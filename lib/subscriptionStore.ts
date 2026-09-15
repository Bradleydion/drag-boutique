// lib/subscriptionStore.ts
// Sequins Pro subscriptions for hosts: free tier is limited to 1 new event
// per calendar month and monthly-only recurring shows; Pro is unlimited
// events with any recurring cadence (weekly included).
//
// The hard limit is enforced server-side by a Postgres trigger
// (events_tier_limit_trigger) so it can't be bypassed -- the checks in this
// file are for good UX (warn before you fill out a whole form), not the only
// line of defense.

import { getSession, isGuest } from './authStore';
import { supabase } from './supabase';
import { getHostEventCountThisMonth } from './eventsStore';

export type SubscriptionTier = 'free' | 'pro';

export type Subscription = {
  tier: SubscriptionTier;
  status: string; // 'inactive' | Stripe subscription status ('active','trialing','past_due','canceled', etc.)
  currentPeriodEnd?: string;
};

const FREE_SUB: Subscription = { tier: 'free', status: 'inactive' };

// Placeholder -- mirror of the price set server-side in
// create-subscription-checkout (PRO_PRICE_USD_CENTS). Keep these in sync.
export const PRO_PRICE_LABEL = '$9.99/mo';

let _subscription: Subscription = FREE_SUB;
let _loaded = false;

export function getSubscription(): Subscription { return _subscription; }
export function isPro(): boolean { return _subscription.tier === 'pro' && ['active', 'trialing'].includes(_subscription.status); }
export function subscriptionLoaded(): boolean { return _loaded; }

export async function loadSubscription(): Promise<void> {
  const session = getSession();
  if (!session || isGuest()) { _subscription = FREE_SUB; _loaded = true; return; }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('tier, status, current_period_end')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!error && data) {
    _subscription = {
      tier: data.tier === 'pro' ? 'pro' : 'free',
      status: data.status,
      currentPeriodEnd: data.current_period_end ?? undefined,
    };
  } else {
    _subscription = FREE_SUB;
  }
  _loaded = true;
}

export type EventGateCheck =
  | { allowed: true }
  | { allowed: false; reason: 'monthly_limit' | 'recurring_frequency' };

/** Client-side pre-check before starting the create-event flow, so a free
 *  host who's used their monthly post sees an upsell instead of filling out
 *  the whole multi-step form only to get rejected on publish. */
export async function canCreateNewEvent(): Promise<EventGateCheck> {
  const session = getSession();
  if (!session || isGuest()) return { allowed: true }; // auth screen will catch this separately

  // Always re-fetch here rather than trusting whatever's cached -- this is
  // the gate right before entering the create-event flow, so it needs to be
  // right even if the user hasn't visited Profile/Subscription this session.
  await loadSubscription();
  if (isPro()) return { allowed: true };

  const countThisMonth = await getHostEventCountThisMonth(session.user.id);
  if (countThisMonth >= 1) return { allowed: false, reason: 'monthly_limit' };

  return { allowed: true };
}

/** Whether the given recurring frequency is available on the current plan. */
export function canUseRecurringFrequency(frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'): boolean {
  if (isPro()) return true;
  return frequency === 'monthly';
}

// ─── Checkout / billing ────────────────────────────────────────────────────

export async function startProCheckout(): Promise<{ alreadyPro: true } | { clientSecret: string }> {
  const session = getSession();
  if (!session || isGuest()) throw new Error('Must be signed in to upgrade.');

  const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {});
  if (error) throw new Error(error.message ?? 'Could not start subscription checkout.');
  if (data?.alreadyPro) return { alreadyPro: true };
  if (!data?.clientSecret) throw new Error('Invalid response from subscription service.');
  return { clientSecret: data.clientSecret };
}

/** Opens Stripe's hosted Billing Portal for a Pro subscriber to update their
 *  card or cancel. Returns the URL to open in an in-app browser. */
export async function getBillingPortalUrl(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-billing-portal-session', {
    body: { returnUrl: 'sequins://subscription' },
  });
  if (error) throw new Error(error.message ?? 'Could not open billing portal.');
  if (!data?.url) throw new Error('Invalid response from billing portal service.');
  return data.url;
}

/** Parses the FREE_TIER_* prefix a Postgres trigger raises so the app can
 *  show a friendly upsell instead of a raw database error. */
export function parseTierLimitError(message: string): 'monthly_limit' | 'recurring_frequency' | null {
  if (message.includes('FREE_TIER_EVENT_LIMIT')) return 'monthly_limit';
  if (message.includes('FREE_TIER_RECURRING_LIMIT')) return 'recurring_frequency';
  return null;
}
