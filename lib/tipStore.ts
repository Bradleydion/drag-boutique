// lib/tipStore.ts
// Stripe-powered in-app tipping for performers -- replaces the old Venmo
// deep link. 100% of every tip is transferred to the performer's connected
// Stripe account; Sequins never takes a cut of tips.

import { getSession, isGuest } from './authStore';
import { supabase } from './supabase';

export async function createTipIntent(
  amount: number,
  performerId: string,
  performerUserId: string,
  performerName: string,
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const session = getSession();
  if (!session || isGuest()) throw new Error('Must be signed in to send a tip.');

  const { data, error } = await supabase.functions.invoke('create-tip-intent', {
    body: { amount, performerId, performerUserId, performerName },
  });

  if (error) throw new Error(error.message ?? 'Could not start tip payment.');
  if (!data?.clientSecret) throw new Error('Invalid response from tipping service.');

  return { clientSecret: data.clientSecret, paymentIntentId: data.paymentIntentId };
}
