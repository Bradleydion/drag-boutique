// lib/payoutStore.ts
// Stripe Connect payout account management for hosts and performers.
//
// Flow:
//   1. User taps "Set up payouts" -> startPayoutOnboarding() calls the
//      `create-connect-account` Edge Function, which creates (or reuses) a
//      Stripe Express connected account and returns a one-time onboarding URL.
//   2. The URL opens in an in-app browser (WebBrowser.openAuthSessionAsync).
//      The user completes identity + bank details directly with Stripe.
//   3. Stripe redirects back to `sequins://payouts/return` when done, closing
//      the browser. Stripe also sends an `account.updated` webhook to
//      `stripe-connect-webhook`, which is what actually flips
//      `onboarding_complete` / `payouts_enabled` in the database (the redirect
//      alone doesn't guarantee onboarding finished -- always re-check status).

import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { getSession, isGuest } from './authStore';
import { supabase } from './supabase';

export type PayoutAccount = {
  id: string;
  user_id: string;
  stripe_account_id: string;
  onboarding_complete: boolean;
  payouts_enabled: boolean;
  created_at: string;
  updated_at: string;
};

let _account: PayoutAccount | null = null;
let _loaded = false;

export function getPayoutAccount(): PayoutAccount | null { return _account; }
export function payoutAccountLoaded(): boolean { return _loaded; }

export async function loadPayoutAccount(): Promise<void> {
  const session = getSession();
  if (!session || isGuest()) { _account = null; _loaded = true; return; }

  const { data, error } = await supabase
    .from('payout_accounts')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!error) _account = (data as PayoutAccount) ?? null;
  _loaded = true;
}

export type OnboardingResult =
  | { status: 'complete' }
  | { status: 'incomplete' }
  | { status: 'cancelled' };

/**
 * Kicks off (or resumes) Stripe Express onboarding for the current user.
 * Opens Stripe's hosted onboarding flow in an in-app browser and waits for
 * the user to return, then re-fetches the payout account status.
 */
export async function startPayoutOnboarding(): Promise<OnboardingResult> {
  const session = getSession();
  if (!session || isGuest()) throw new Error('Must be signed in to set up payouts.');

  const redirectUrl = Linking.createURL('payouts/return');

  const { data, error } = await supabase.functions.invoke('create-connect-account', {
    body: { returnUrl: redirectUrl },
  });

  if (error) throw new Error(error.message ?? 'Could not start payout setup.');
  if (!data?.url) throw new Error('Invalid response from payout setup service.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

  if (result.type !== 'success') {
    return { status: 'cancelled' };
  }

  // The webhook that flips onboarding_complete may land a beat after the
  // redirect, so give it a moment before re-checking.
  await new Promise(resolve => setTimeout(resolve, 1500));
  await loadPayoutAccount();

  return _account?.onboarding_complete ? { status: 'complete' } : { status: 'incomplete' };
}
