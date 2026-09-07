// lib/ticketStore.ts
// Manages ticket purchases backed by Supabase `tickets` table.
// Paid tickets flow through the Stripe `create-payment-intent` Edge Function.
//
// Payment flow:
//   1. App calls createPaymentIntent(amount, eventId) → gets Stripe clientSecret
//   2. App presents Stripe payment sheet (handled in the screen)
//   3. On payment success, app calls buyTicket(eventId, price, paymentIntentId)
//   4. Ticket is recorded in Supabase with payment_status = 'paid'
//
// Free tickets skip steps 1-3 entirely.

import { getSession, isGuest } from './authStore';
import { supabase } from './supabase';
import { addNotification } from './notificationsStore';
import { fetchEventById } from './eventsStore';

export type PaymentStatus = 'free' | 'pending' | 'paid' | 'failed' | 'refunded';

export type Ticket = {
  id: string;
  user_id: string;
  event_id: string;
  price: number;
  purchased_at: string;
  checked_in_at?: string | null;
  stripe_payment_intent_id?: string | null;
  payment_status: PaymentStatus;
};

export type CheckInResult =
  | { ok: true;  ticket: Ticket }
  | { ok: false; reason: 'not_found' | 'wrong_event' | 'already_checked_in' };

// Local cache
let _tickets: Ticket[] = [];
let _loaded  = false;

// ─── Bootstrap ───────────────────────────────────────────────────────────────

export async function loadTickets(): Promise<void> {
  const session = getSession();
  if (!session || isGuest()) { _tickets = []; _loaded = true; return; }

  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('user_id', session.user.id)
    .order('purchased_at', { ascending: false });

  if (!error && data) _tickets = data as Ticket[];
  _loaded = true;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export function getTickets(): Ticket[] { return _tickets; }
export function hasTicket(eventId: string): boolean {
  return _tickets.some(t => t.event_id === eventId);
}
export function ticketsLoaded(): boolean { return _loaded; }

// ─── Stripe: create payment intent ───────────────────────────────────────────

/**
 * Calls the Supabase Edge Function to create a Stripe PaymentIntent.
 * Returns the clientSecret needed to present the Stripe payment sheet,
 * plus the paymentIntentId to store on the ticket after success.
 *
 * Throws on network/Stripe errors — caller should catch and show an alert.
 */
export async function createPaymentIntent(
  amount: number,
  eventId: string,
  eventTitle: string,
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const session = getSession();
  if (!session || isGuest()) throw new Error('Must be signed in to purchase tickets.');

  const { data, error } = await supabase.functions.invoke('create-payment-intent', {
    body: { amount, eventId, eventTitle },
  });

  if (error) throw new Error(error.message ?? 'Could not initialise payment.');
  if (!data?.clientSecret) throw new Error('Invalid response from payment service.');

  return { clientSecret: data.clientSecret, paymentIntentId: data.paymentIntentId };
}

// ─── Purchase ─────────────────────────────────────────────────────────────────

/**
 * Record a ticket in Supabase after payment is confirmed.
 *
 * For FREE events:    call with price=0, no paymentIntentId needed.
 * For PAID events:    call after Stripe payment sheet succeeds, pass paymentIntentId.
 */
export async function buyTicket(
  eventId: string,
  price: number,
  paymentIntentId?: string,
): Promise<Ticket> {
  const session = getSession();
  if (!session || isGuest()) throw new Error('Must be signed in to buy tickets.');

  const existing = _tickets.find(t => t.event_id === eventId);
  if (existing) return existing;

  const payment_status: PaymentStatus = price === 0 ? 'free' : 'paid';

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      user_id: session.user.id,
      event_id: eventId,
      price,
      payment_status,
      stripe_payment_intent_id: paymentIntentId ?? null,
    })
    .select()
    .single();

  if (error) {
    // Handle duplicate (race condition)
    if (error.code === '23505') {
      await loadTickets();
      const found = _tickets.find(t => t.event_id === eventId);
      if (found) return found;
    }
    throw error;
  }

  const ticket = data as Ticket;
  _tickets = [ticket, ..._tickets];

  // Notify host of ticket sale (non-fatal)
  try {
    const event = await fetchEventById(eventId);
    if (event?.hostId && event.hostId !== session.user.id) {
      await addNotification({
        userId: event.hostId,
        type:   'ticket_sold',
        title:  `New ticket sold — ${event.title}`,
        body:   price === 0
          ? 'A free ticket was claimed.'
          : `$${price.toFixed(2)} ticket purchased via Stripe.`,
        link: `/event/${eventId}`,
      });
    }
  } catch { /* non-fatal */ }

  return ticket;
}

// ─── Door check-in ───────────────────────────────────────────────────────────

export async function checkInTicket(
  ticketId: string,
  eventId: string,
): Promise<CheckInResult> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .maybeSingle();

  if (error || !data) return { ok: false, reason: 'not_found' };

  const ticket = data as Ticket;
  if (ticket.event_id !== eventId)   return { ok: false, reason: 'wrong_event' };
  if (ticket.checked_in_at)          return { ok: false, reason: 'already_checked_in' };

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('tickets')
    .update({ checked_in_at: now })
    .eq('id', ticketId);

  if (updateError) return { ok: false, reason: 'not_found' };
  return { ok: true, ticket: { ...ticket, checked_in_at: now } };
}

export async function getEventTicketStats(
  eventId: string,
): Promise<{ total: number; checkedIn: number }> {
  const { data, error } = await supabase
    .from('tickets')
    .select('checked_in_at')
    .eq('event_id', eventId);

  if (error || !data) return { total: 0, checkedIn: 0 };
  return {
    total:     data.length,
    checkedIn: data.filter(t => t.checked_in_at).length,
  };
}
