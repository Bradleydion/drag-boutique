// lib/ticketStore.ts
// Manages ticket purchases backed by Supabase `tickets` table.
// Paid tickets flow through the Stripe `create-payment-intent` Edge Function.
//
// Payment flow:
//   1. App calls createPaymentIntent(amount, eventId) → gets Stripe clientSecret
//   2. App presents Stripe payment sheet (handled in the screen)
//   3. On payment success, app calls confirmPaidTicket(paymentIntentId)
//   4. The confirm-ticket Edge Function checks the payment with Stripe and
//      creates the 'paid' ticket server-side (the app can't insert paid
//      tickets itself; the Stripe webhook does the same as a backup).
//
// Free tickets skip steps 1-3 and use buyTicket(eventId, 0).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSession, isGuest } from './authStore';
import { supabase } from './supabase';
import { addNotification } from './notificationsStore';
import { fetchEventById } from './eventsStore';

export type PaymentStatus = 'free' | 'pending' | 'paid' | 'failed' | 'refund_requested' | 'refunded';

export type Ticket = {
  id: string;
  user_id: string;
  event_id: string;
  occurrence_start?: string | null; // which date of the show (recurring shows)
  price: number;
  purchased_at: string;
  checked_in_at?: string | null;
  stripe_payment_intent_id?: string | null;
  payment_status: PaymentStatus;
  platform_fee_percent?: number | null;
  platform_fee_amount?: number | null;
  refund_reason?: string | null;
  refund_requested_at?: string | null;
  stripe_refund_id?: string | null;
};

export type CheckInResult =
  | { ok: true;  ticket: Ticket }
  | { ok: false; reason: 'not_found' | 'wrong_event' | 'already_checked_in' | 'not_paid' };

// Local cache
let _tickets: Ticket[] = [];
let _loaded  = false;

// ─── Bootstrap ───────────────────────────────────────────────────────────────

export async function loadTickets(): Promise<void> {
  const session = getSession();
  if (!session || isGuest()) { _tickets = []; _loaded = true; return; }

  // Show the last-saved tickets first, so they work with no signal at the door.
  const cacheKey = ticketCacheKey(session.user.id);
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) _tickets = JSON.parse(cached) as Ticket[];
  } catch { /* ignore a bad cache */ }

  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('user_id', session.user.id)
    .order('purchased_at', { ascending: false });

  // Offline or failed: keep the cached tickets rather than showing none.
  if (!error && data) {
    _tickets = data as Ticket[];
    AsyncStorage.setItem(cacheKey, JSON.stringify(_tickets)).catch(() => {});
  }
  _loaded = true;
}

// ─── Offline cache ────────────────────────────────────────────────────────────
// Tickets and the events they're for are saved on the device so the Tickets
// tab (and each QR code) still works in airplane mode or a basement venue.

function ticketCacheKey(userId: string) { return `@sequins/tickets:${userId}`; }
function ticketEventsCacheKey(userId: string) { return `@sequins/ticketEvents:${userId}`; }

export async function getCachedTicketEvents<T = unknown>(): Promise<Record<string, T>> {
  const session = getSession();
  if (!session) return {};
  try {
    const raw = await AsyncStorage.getItem(ticketEventsCacheKey(session.user.id));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export async function saveTicketEvents(map: Record<string, unknown>): Promise<void> {
  const session = getSession();
  if (!session) return;
  await AsyncStorage.setItem(ticketEventsCacheKey(session.user.id), JSON.stringify(map)).catch(() => {});
}

function persistTickets() {
  const session = getSession();
  if (session) AsyncStorage.setItem(ticketCacheKey(session.user.id), JSON.stringify(_tickets)).catch(() => {});
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export function getTickets(): Ticket[] { return _tickets; }
const sameMoment = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 60_000;

/** Does the user hold a ticket to this show (and, if given, this date of it)?
 *  Older tickets with no date count for any date. */
export function findTicket(eventId: string, occurrenceStart?: string | null): Ticket | undefined {
  return _tickets.find(t =>
    t.event_id === eventId &&
    (!occurrenceStart || !t.occurrence_start || sameMoment(t.occurrence_start, occurrenceStart)),
  );
}

export function hasTicket(eventId: string, occurrenceStart?: string | null): boolean {
  return !!findTicket(eventId, occurrenceStart);
}
export function ticketsLoaded(): boolean { return _loaded; }

// ─── Stripe: create payment intent ───────────────────────────────────────────

export type TicketPriceBreakdown = {
  ticketPrice: number;
  serviceFee: number;
  total: number;
  platformFeePercent: number;
  platformFeeAmount: number;
  tierName: string;
};

function toBreakdown(data: any): TicketPriceBreakdown {
  return {
    ticketPrice: Number(data.ticketPrice ?? 0),
    serviceFee: Number(data.serviceFee ?? 0),
    total: Number(data.total ?? 0),
    platformFeePercent: Number(data.platformFeePercent ?? 0),
    platformFeeAmount: Number(data.platformFeeAmount ?? 0),
    tierName: data.tierName ?? '',
  };
}

/**
 * Ask the server what a ticket costs right now: ticket price + Sequins
 * service fee = total. Used to show the all-in price on the event page
 * before checkout. Returns null if the quote can't be loaded.
 */
export async function getTicketQuote(eventId: string, occurrenceStart?: string): Promise<TicketPriceBreakdown | null> {
  try {
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: { eventId, quoteOnly: true, occurrenceStart },
    });
    if (error || !data || data.error) return null;
    return toBreakdown(data);
  } catch {
    return null;
  }
}

/**
 * Calls the Supabase Edge Function to create a Stripe PaymentIntent.
 * The server sets the price from the event record and adds the service fee;
 * the buyer is charged `total`. Returns the clientSecret for the payment
 * sheet plus the breakdown to store on the ticket after success.
 *
 * Throws on network/Stripe errors — caller should catch and show an alert.
 */
export async function createPaymentIntent(
  eventId: string,
  eventTitle: string,
  occurrenceStart?: string,
): Promise<TicketPriceBreakdown & { clientSecret: string; paymentIntentId: string }> {
  const session = getSession();
  if (!session || isGuest()) throw new Error('Must be signed in to purchase tickets.');

  const { data, error } = await supabase.functions.invoke('create-payment-intent', {
    body: { eventId, eventTitle, occurrenceStart },
  });

  if (error) throw new Error(error.message ?? 'Could not initialise payment.');
  if (data?.error) throw new Error(data.error);
  if (!data?.clientSecret) throw new Error('Invalid response from payment service.');

  return {
    ...toBreakdown(data),
    clientSecret: data.clientSecret,
    paymentIntentId: data.paymentIntentId,
  };
}

// ─── Purchase ─────────────────────────────────────────────────────────────────

/**
 * Record a ticket in Supabase after payment is confirmed.
 *
 * FREE events only. Paid tickets go through confirmPaidTicket() — the
 * database turns any app-inserted ticket for a paid show into 'pending'.
 */
export async function buyTicket(
  eventId: string,
  price: number,
  paymentIntentId?: string,
  platformFeePercent?: number,
  platformFeeAmount?: number,
  occurrenceStart?: string,
): Promise<Ticket> {
  const session = getSession();
  if (!session || isGuest()) throw new Error('Must be signed in to buy tickets.');

  const existing = findTicket(eventId, occurrenceStart);
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
      platform_fee_percent: platformFeePercent ?? null,
      platform_fee_amount: platformFeeAmount ?? null,
      occurrence_start: occurrenceStart ?? null,
    })
    .select()
    .single();

  if (error) {
    // Handle duplicate (race condition)
    if (error.code === '23505') {
      await loadTickets();
      const found = findTicket(eventId, occurrenceStart);
      if (found) return found;
    }
    throw error;
  }

  const ticket = data as Ticket;
  _tickets = [ticket, ..._tickets];
  persistTickets();

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

/**
 * Paid tickets: call right after the Stripe payment sheet succeeds.
 * The server verifies the payment and creates the ticket. Retries a few
 * times (network blips); if it still can't confirm, the Stripe webhook will
 * create the ticket shortly, so we return null and the caller tells the fan
 * to check their Tickets tab.
 */
export async function confirmPaidTicket(
  paymentIntentId: string,
): Promise<{ ticket: Ticket | null; refunded?: boolean; message?: string }> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke('confirm-ticket', { body: { paymentIntentId } });
      if (error) throw new Error(error.message ?? 'Could not confirm ticket.');
      if (data?.error) throw new Error(data.error);
      const ticket = (data?.ticket ?? null) as Ticket | null;
      if (ticket) {
        _tickets = [ticket, ..._tickets.filter(t => t.id !== ticket.id)];
        persistTickets();
      }
      return { ticket, refunded: !!data?.refunded, message: data?.message };
    } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  console.warn('[ticketStore] confirmPaidTicket failed, webhook will finish it:', lastErr);
  await loadTickets().catch(() => {});
  return { ticket: null };
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
  if (!['free', 'paid', 'refund_requested'].includes(ticket.payment_status)) {
    return { ok: false, reason: 'not_paid' };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('tickets')
    .update({ checked_in_at: now })
    .eq('id', ticketId);

  if (updateError) {
    if (/TICKET_NOT_VALID/.test(updateError.message ?? '')) return { ok: false, reason: 'not_paid' };
    return { ok: false, reason: 'not_found' };
  }
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

// ─── Refunds ──────────────────────────────────────────────────────────────────
//
// Sequins facilitates refunds between the buyer and the host, per each
// event's own refund policy (a window in days, or "All Sales Final"). The
// buyer requests a refund; the host approves (triggers the actual Stripe
// refund, reversing the host's payout) or denies it.

/** Buyer: request a refund for a paid ticket. Throws with a user-facing message on failure. */
export async function requestTicketRefund(ticketId: string, reason?: string): Promise<void> {
  const { error } = await supabase.functions.invoke('process-refund', {
    body: { itemType: 'ticket', itemId: ticketId, action: 'request', reason },
  });
  if (error) throw new Error(error.message ?? 'Could not submit refund request.');
  await loadTickets();
}

/** Host: approve a pending refund request — actually refunds the buyer via Stripe. */
export async function approveTicketRefund(ticketId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('process-refund', {
    body: { itemType: 'ticket', itemId: ticketId, action: 'approve' },
  });
  if (error) throw new Error(error.message ?? 'Could not process refund.');
}

/** Host: deny a pending refund request — reverts the ticket back to paid. */
export async function denyTicketRefund(ticketId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('process-refund', {
    body: { itemType: 'ticket', itemId: ticketId, action: 'deny' },
  });
  if (error) throw new Error(error.message ?? 'Could not deny refund.');
}

/** Host: load pending refund requests for a specific event (bypasses local cache -- always fresh). */
export async function loadEventRefundRequests(eventId: string): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('event_id', eventId)
    .eq('payment_status', 'refund_requested')
    .order('refund_requested_at', { ascending: true });

  if (error || !data) return [];
  return data as Ticket[];
}
