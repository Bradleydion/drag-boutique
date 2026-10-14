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

/** Re-checks the database: can this user receive ticket money yet? */
export async function hasReadyPayouts(): Promise<boolean> {
  await loadPayoutAccount();
  return !!(_account?.stripe_account_id && _account.payouts_enabled);
}

/**
 * Called before a host publishes (or saves) a show that charges for tickets.
 * If their payouts aren't set up, asks them what to do. Resolves to:
 *   'go'    — payouts are ready, or the host chose to publish anyway
 *   'setup' — the host chose to set up payouts now (caller navigates)
 *   'stop'  — the host backed out
 */
export function checkPayoutsBeforePaidPublish(
  Alert: { alert: (title: string, msg?: string, buttons?: any[], opts?: any) => void },
  ticketPrice: number,
  verb: 'publish' | 'save' = 'publish',
): Promise<'go' | 'setup' | 'stop'> {
  if (!(ticketPrice > 0)) return Promise.resolve('go');
  return hasReadyPayouts().then(ready => {
    if (ready) return 'go' as const;
    return new Promise<'go' | 'setup' | 'stop'>(resolve => {
      Alert.alert(
        'Set up payouts to sell tickets',
        `This show charges $${ticketPrice.toFixed(2)} a ticket, but you haven’t set up payouts yet, so fans can’t buy tickets. ` +
          'It takes about 5 minutes with Stripe, and it’s how ticket money gets to your bank.' +
          (verb === 'publish' ? '\n\nIf you publish anyway, the show will say “not on sale yet” until you finish.' : ''),
        [
          { text: 'Set Up Payouts', onPress: () => resolve('setup') },
          { text: verb === 'publish' ? 'Publish Anyway' : 'Save Anyway', onPress: () => resolve('go') },
          { text: 'Cancel', style: 'cancel', onPress: () => resolve('stop') },
        ],
        { cancelable: true, onDismiss: () => resolve('stop') },
      );
    });
  }).catch(() => 'go' as const); // never block a publish on a failed status check
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
export type PayoutCountry = 'US' | 'CA';

/**
 * country only matters the first time (it's fixed on the Stripe account once
 * created). Sequins is available in the US and Canada.
 */
export async function startPayoutOnboarding(country: PayoutCountry = 'US'): Promise<OnboardingResult> {
  const session = getSession();
  if (!session || isGuest()) throw new Error('Must be signed in to set up payouts.');

  const redirectUrl = Linking.createURL('payouts/return');

  const { data, error } = await supabase.functions.invoke('create-connect-account', {
    body: { returnUrl: redirectUrl, country },
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
