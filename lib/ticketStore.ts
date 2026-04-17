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
};

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

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Record a ticket purchase in Supabase.
 * Returns the new ticket on success.
 * Throws if the user is a guest or already has a ticket for this event.
 */
export async function buyTicket(eventId: string, price: number): Promise<Ticket> {
  const session = getSession();
  if (!session || isGuest()) throw new Error('Must be signed in to buy tickets.');

  // Already have one — treat as success and return the existing ticket.
  const existing = _tickets.find(t => t.event_id === eventId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('tickets')
    .insert({ user_id: session.user.id, event_id: eventId, price })
    .select()
    .single();

  if (error) {
    // Unique constraint = somehow already exists
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
