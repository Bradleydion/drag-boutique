// lib/ticketStore.ts
// Manages ticket purchases backed by Supabase `tickets` table.
//
// Required Supabase table (run once in SQL editor):
//
//   create table tickets (
//     id uuid primary key default gen_random_uuid(),
//     user_id uuid not null references auth.users(id) on delete cascade,
//     event_id text not null,
//     price numeric not null,
//     purchased_at timestamptz default now(),
//     checked_in_at timestamptz,
//     unique(user_id, event_id)
//   );
//
//   alter table tickets enable row level security;
//   create policy "read own tickets" on tickets for select to authenticated using (auth.uid() = user_id);
//   create policy "buy ticket" on tickets for insert to authenticated with check (auth.uid() = user_id);

import { getSession, isGuest } from './authStore';
import { supabase } from './supabase';

export type Ticket = {
  id: string;
  user_id: string;
  event_id: string;
  price: number;
  purchased_at: string;
  checked_in_at?: string | null;
};

// ─── Check-in result ─────────────────────────────────────────────────────────

export type CheckInResult =
  | { ok: true;  ticket: Ticket }
  | { ok: false; reason: 'not_found' | 'wrong_event' | 'already_checked_in' };

// Local cache — keyed by event_id for fast lookup.
let _tickets: Ticket[] = [];
let _loaded = false;

// ─── Bootstrap ───────────────────────────────────────────────────────────────

/** Load the current user's tickets from Supabase. Call once on app start or tab focus. */
export async function loadTickets(): Promise<void> {
  const session = getSession();
  if (!session || isGuest()) { _tickets = []; _loaded = true; return; }

  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('user_id', session.user.id)
    .order('purchased_at', { ascending: false });

  if (!error && data) {
    _tickets = data as Ticket[];
  }
  _loaded = true;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export function getTickets(): Ticket[] {
  return _tickets;
}

export function hasTicket(eventId: string): boolean {
  return _tickets.some(t => t.event_id === eventId);
}

export function ticketsLoaded(): boolean {
  return _loaded;
}

// ─── Purchase ─────────────────────────────────────────────────────────────────

/**
 * Record a ticket purchase in Supabase.
 * Returns the new ticket on success.
 * Throws if the user is a guest or already has a ticket for this event.
 */
export async function buyTicket(eventId: string, price: number): Promise<Ticket> {
  const session = getSession();
  if (!session || isGuest()) throw new Error('Must be signed in to buy tickets.');

  const existing = _tickets.find(t => t.event_id === eventId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('tickets')
    .insert({ user_id: session.user.id, event_id: eventId, price })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      await loadTickets();
      const found = _tickets.find(t => t.event_id === eventId);
      if (found) return found;
    }
    throw error;
  }

  const ticket = data as Ticket;
  _tickets = [ticket, ..._tickets];
  return ticket;
}

// ─── Door check-in ───────────────────────────────────────────────────────────

/**
 * Validate a ticket ID for a specific event and mark it as checked in.
 * Called by the host's door check-in screen.
 * Does NOT require the host to be the ticket owner — host has no RLS restriction
 * because we query by ticket ID (which is secret, embedded in the QR).
 */
export async function checkInTicket(
  ticketId: string,
  eventId: string,
): Promise<CheckInResult> {
  // Fetch the ticket by ID regardless of ownership
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, reason: 'not_found' };
  }

  const ticket = data as Ticket;

  if (ticket.event_id !== eventId) {
    return { ok: false, reason: 'wrong_event' };
  }

  if (ticket.checked_in_at) {
    return { ok: false, reason: 'already_checked_in' };
  }

  // Mark checked in
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('tickets')
    .update({ checked_in_at: now })
    .eq('id', ticketId);

  if (updateError) {
    return { ok: false, reason: 'not_found' };
  }

  return { ok: true, ticket: { ...ticket, checked_in_at: now } };
}

/**
 * Fetch all tickets for a given event (host use only, for the check-in counter).
 * Returns { total, checkedIn }.
 */
export async function getEventTicketStats(eventId: string): Promise<{ total: number; checkedIn: number }> {
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
