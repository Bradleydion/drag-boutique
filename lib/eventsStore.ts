// lib/eventsStore.ts
import { supabase } from './supabase';
import { getSession } from './authStore';
import type { DraftEvent } from './createEventStore';
import { addNotification } from './notificationsStore';
import { fetchPerformerById } from './performerStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventRecord = {
  id: string;
  hostId: string;
  hostName?: string;
  title: string;
  description?: string;
  datetimeStart?: string;   // ISO
  datetimeEnd?: string;     // ISO
  timezone?: string;
  venue?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    instagram?: string;
  };
  ticketing?: {
    price?: number;
    salesStart?: string;
    salesEnd?: string;
  };
  imageUrl?: string;
  capacity?: number;
  createdAt?: string;
  performerIds?: string[];
  // Recurring
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurringEndDate?: string;
  // Promoted placement
  isPromoted?: boolean;
  promotedUntil?: string | null; // real source of truth for "currently boosted" -- see lib/promotionStore.ts
  // Refund policy — set by the host per event
  refundWindowDays?: number | null; // null/undefined = no explicit limit, refundable any time before the event
  allSalesFinal?: boolean;          // true = no refunds offered through the app for this event
  // Cancellation — set only by the cancel-event Edge Function
  cancelledAt?: string | null;
  cancelReason?: string | null;
  cancelledOccurrences?: string[];  // single cancelled dates of a recurring show (start times)
};

// ─── Local cache ──────────────────────────────────────────────────────────────

let _hostEvents: EventRecord[] = [];

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToEvent(row: Record<string, any>): EventRecord {
  return {
    id:           row.id,
    hostId:       row.host_id,
    hostName:     row.host_name,
    title:        row.title,
    description:  row.description,
    datetimeStart: row.datetime_start,
    datetimeEnd:  row.datetime_end,
    timezone:     row.timezone,
    venue: {
      name:      row.venue_name,
      address:   row.venue_address,
      city:      row.venue_city,
      state:     row.venue_state,
      zip:       row.venue_zip,
      instagram: row.venue_instagram,
    },
    ticketing: {
      price:       row.ticket_price,
      salesStart:  row.sales_start,
      salesEnd:    row.sales_end,
    },
    imageUrl:    row.image_url,
    capacity:    row.capacity,
    createdAt:   row.created_at,
    performerIds:       row.performer_ids ?? [],
    isRecurring:        row.is_recurring ?? false,
    recurringFrequency: row.recurring_frequency,
    recurringEndDate:   row.recurring_end_date,
    isPromoted:         row.is_promoted ?? false,
    promotedUntil:      row.promoted_until,
    refundWindowDays:   row.refund_window_days ?? null,
    allSalesFinal:      row.all_sales_final ?? false,
    cancelledAt:        row.cancelled_at ?? null,
    cancelReason:       row.cancel_reason ?? null,
    cancelledOccurrences: row.cancelled_occurrences ?? [],
  };
}

// ─── Fee tier volume ──────────────────────────────────────────────────────────

/** Total shows this host has ever posted -- drives the ticket-sale fee tier. */
export async function getHostEventCount(hostId: string): Promise<number> {
  const { count, error } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('host_id', hostId);
  return error ? 0 : (count ?? 0);
}

/** Events this host has created since the start of the current calendar
 *  month -- drives the free-tier "1 event/month" subscription gate. This is
 *  a client-side convenience check for UX only; the real limit is enforced
 *  server-side by the events_tier_limit_trigger Postgres trigger. */
export async function getHostEventCountThisMonth(hostId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count, error } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('host_id', hostId)
    .gte('created_at', monthStart);
  return error ? 0 : (count ?? 0);
}

// ─── Image upload ─────────────────────────────────────────────────────────────

/**
 * Upload a local image URI to the `event-images` Supabase Storage bucket.
 * Returns the public URL.
 *
 * One-time Supabase setup (run in Dashboard > Storage):
 *   1. Create bucket named "event-images" — toggle Public ON
 *   2. Add RLS policy: allow authenticated users to INSERT (upload)
 *
 * One-time SQL (optional, tighten later):
 *   create policy "host upload" on storage.objects
 *     for insert to authenticated
 *     with check (bucket_id = 'event-images');
 */
export async function uploadEventImage(localUri: string): Promise<string> {
  const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // React Native doesn't support blob() — use ArrayBuffer instead
  const res = await fetch(localUri);
  const arrayBuffer = await res.arrayBuffer();

  const { error } = await supabase.storage
    .from('event-images')
    .upload(fileName, arrayBuffer, { contentType: mimeType, upsert: false });

  if (error) throw new Error(`Image upload failed: ${error.message}`);

  const { data } = supabase.storage.from('event-images').getPublicUrl(fileName);
  return data.publicUrl;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Load ALL upcoming public events (for Discover feed), promoted first.
 *  A one-off event shows if datetime_start >= now.
 *  A recurring event shows if recurring_end_date >= today (still has future occurrences).
 */
export async function loadEvents(): Promise<EventRecord[]> {
  const now = new Date().toISOString();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .or(
      `and(is_recurring.eq.false,datetime_start.gte.${now}),` +
      `and(is_recurring.eq.true,recurring_end_date.gte.${today}),` +
      // Recurring shows with no end date run indefinitely.
      `and(is_recurring.eq.true,recurring_end_date.is.null)`
    )
    .order('is_promoted', { ascending: false })
    .order('datetime_start', { ascending: true });

  if (error) {
    console.warn('[eventsStore] loadEvents error:', error.message);
    return [];
  }
  return (data ?? [])
    .map(rowToEvent)
    .filter(e => !e.cancelledAt) // cancelled shows don't appear in Discover
    .map(rollToNextOccurrence)
    .filter((e): e is EventRecord => e !== null);
}

// ─── Recurring events ─────────────────────────────────────────────────────────
// A recurring show is stored once, with its FIRST date. For listing, move it
// forward to its next upcoming date so it keeps showing in Discover.
// Weekly/daily/yearly step by a fixed interval; monthly keeps the same
// "nth weekday" (e.g. third Saturday), matching how drag nights are scheduled.

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number, ref: Date): Date {
  const first = new Date(year, month, 1, ref.getHours(), ref.getMinutes(), ref.getSeconds());
  const offset = (weekday - first.getDay() + 7) % 7;
  let day = 1 + offset + (n - 1) * 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  while (day > daysInMonth) day -= 7; // "5th" weekday that doesn't exist → last one
  return new Date(year, month, day, ref.getHours(), ref.getMinutes(), ref.getSeconds());
}

function stepOccurrence(d: Date, freq: string, original: Date): Date {
  switch (freq) {
    // Step by calendar days (not milliseconds) so 8 PM stays 8 PM across DST changes.
    case 'daily':   { const n = new Date(d); n.setDate(n.getDate() + 1); return n; }
    case 'weekly':  { const n = new Date(d); n.setDate(n.getDate() + 7); return n; }
    case 'yearly':  { const n = new Date(d); n.setFullYear(n.getFullYear() + 1); return n; }
    case 'monthly':
    default: {
      const n = Math.ceil(original.getDate() / 7);
      return nthWeekdayOfMonth(d.getFullYear(), d.getMonth() + 1, original.getDay(), n, original);
    }
  }
}

const sameMoment = (a: string | Date, b: string | Date) =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 60_000;

/** True if this date of a recurring show was cancelled on its own. */
export function isOccurrenceCancelled(e: EventRecord, startIso?: string | null): boolean {
  if (!startIso) return false;
  return (e.cancelledOccurrences ?? []).some(c => sameMoment(c, startIso));
}

/** Exported for Discover and other listings; returns null once a series has ended.
 *  Skips dates the host cancelled on their own. */
export function rollToNextOccurrence(e: EventRecord): EventRecord | null {
  if (!e.isRecurring || !e.datetimeStart) return e;
  const original = new Date(e.datetimeStart);
  const now = Date.now();
  const cancelled = (d: Date) => isOccurrenceCancelled(e, d.toISOString());
  if (original.getTime() >= now && !cancelled(original)) return e;

  const duration = e.datetimeEnd ? new Date(e.datetimeEnd).getTime() - original.getTime() : 0;
  let next = original;
  for (let i = 0; i < 1000 && (next.getTime() < now || cancelled(next)); i++) {
    next = stepOccurrence(next, e.recurringFrequency ?? 'weekly', original);
  }
  if (e.recurringEndDate && next.toISOString().slice(0, 10) > e.recurringEndDate) return null;

  return {
    ...e,
    datetimeStart: next.toISOString(),
    datetimeEnd: duration > 0 ? new Date(next.getTime() + duration).toISOString() : e.datetimeEnd,
  };
}

/** The next `count` upcoming start times of a recurring show (cancelled dates left out). */
export function upcomingOccurrences(e: EventRecord, count = 8): string[] {
  if (!e.datetimeStart) return [];
  if (!e.isRecurring) return new Date(e.datetimeStart).getTime() >= Date.now() ? [e.datetimeStart] : [];
  const original = new Date(e.datetimeStart);
  const out: string[] = [];
  let next = original;
  for (let i = 0; i < 2000 && out.length < count; i++) {
    if (e.recurringEndDate && next.toISOString().slice(0, 10) > e.recurringEndDate) break;
    if (next.getTime() >= Date.now() && !isOccurrenceCancelled(e, next.toISOString())) out.push(next.toISOString());
    next = stepOccurrence(next, e.recurringFrequency ?? 'weekly', original);
  }
  return out;
}

/** Load upcoming events where this performer is tagged. */
export async function loadPerformerEvents(performerId: string): Promise<EventRecord[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .contains('performer_ids', [performerId])
    .gte('datetime_start', new Date().toISOString())
    .order('datetime_start', { ascending: true });

  if (error) {
    console.warn('[eventsStore] loadPerformerEvents error:', error.message);
    return [];
  }
  return (data ?? []).map(rowToEvent).filter(e => !e.cancelledAt);
}

/** Load all events belonging to the current host into the local cache. */
export async function loadHostEvents(): Promise<void> {
  const session = getSession();
  if (!session?.user) return;

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('host_id', session.user.id)
    .order('datetime_start', { ascending: true });

  if (error) {
    console.warn('[eventsStore] loadHostEvents error:', error.message);
    return;
  }
  _hostEvents = (data ?? []).map(rowToEvent);
}

/** Return the cached list of this host's events. */
export function getHostEvents(): EventRecord[] {
  return _hostEvents;
}

/** Persist a draft event to Supabase and add it to the cache. */
export async function publishDraft(d: DraftEvent): Promise<EventRecord> {
  const session = getSession();
  const hostId   = session?.user?.id   ?? 'guest';
  const meta = session?.user?.user_metadata ?? {};
  // The name the host chose (display name or host/venue name), never the email.
  const hostName = (meta.display_name as string | undefined)?.trim()
                || (meta.venue_name as string | undefined)?.trim()
                || session?.user?.email?.split('@')[0]
                || 'Host';
  const clean = (v?: string) => (v ?? '').trim() || null;
  const cleanState = (v?: string) => {
    const t = (v ?? '').trim();
    return !t ? null : t.length <= 3 ? t.toUpperCase() : t; // "or" → "OR"
  };

  // Upload event flyer if a local URI was picked
  let imageUrl: string | undefined = undefined;
  if (d.imageLocalUri) {
    imageUrl = await uploadEventImage(d.imageLocalUri);
  }

  const payload = {
    host_id:       hostId,
    host_name:     hostName,
    title:         d.title ?? 'Untitled Event',
    description:   d.description,
    datetime_start: d.datetimeStart || null,
    datetime_end:  d.datetimeEnd   || null,
    timezone:      d.timezone,
    venue_name:    clean(d.venueName),
    venue_address: clean(d.venueAddress),
    venue_city:    clean(d.venueCity),
    venue_state:   cleanState(d.venueState),
    venue_zip:     clean(d.venueZip),
    venue_instagram: clean(d.venueInstagram),
    capacity:      d.capacity ?? null,
    ticket_price:  d.ticketPrice ?? 0,
    sales_start:   d.salesStart || null,
    sales_end:     d.salesEnd   || null,
    image_url:     imageUrl ?? null,
    performer_ids: d.performerIds ?? [],
    is_recurring:          d.isRecurring ?? false,
    recurring_frequency:   d.isRecurring ? (d.recurringFrequency ?? null) : null,
    recurring_end_date:    d.isRecurring ? (d.recurringEndDate   ?? null) : null,
    is_promoted:           false, // promotion is now a paid post-publish action -- see markEventPromoted
    refund_window_days:    d.refundWindowDays ?? null,
    all_sales_final:       d.allSalesFinal ?? false,
  };

  const { data, error } = await supabase
    .from('events')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const record = rowToEvent(data);
  _hostEvents = [record, ..._hostEvents];

  // Notify tagged performers (non-fatal, fire-and-forget)
  if (d.performerIds && d.performerIds.length > 0) {
    const eventTitle = d.title ?? 'Untitled Event';
    Promise.all(
      d.performerIds.map(async (pid) => {
        try {
          const performer = await fetchPerformerById(pid);
          if (performer?.userId) {
            await addNotification({
              userId: performer.userId,
              type:   'performer_tagged',
              title:  `You've been added to "${eventTitle}"`,
              body:   `${hostName} tagged you on a new event.`,
              link:   `/event/${record.id}`,
            });
          }
        } catch (_) { /* non-fatal */ }
      }),
    ).catch(() => {});
  }

  return record;
}

/** Update an existing event. Only the host of the event should call this. */
export async function updateEvent(
  eventId: string,
  patch: Partial<{
    title: string;
    description: string;
    datetimeStart: string;
    datetimeEnd: string;
    timezone: string;
    venueName: string;
    venueAddress: string;
    venueCity: string;
    venueState: string;
    venueZip: string;
    venueInstagram: string;
    ticketPrice: number;
    salesStart: string;
    salesEnd: string;
    isRecurring: boolean;
    recurringFrequency: string;
    recurringEndDate: string;
    imageLocalUri: string;
    performerIds: string[];
    isPromoted: boolean;
    refundWindowDays: number | null;
    allSalesFinal: boolean;
  }>,
): Promise<EventRecord> {
  const payload: Record<string, any> = {};

  if (patch.title !== undefined)            payload.title             = patch.title;
  if (patch.description !== undefined)      payload.description       = patch.description;
  if (patch.datetimeStart !== undefined)    payload.datetime_start    = patch.datetimeStart || null;
  if (patch.datetimeEnd !== undefined)      payload.datetime_end      = patch.datetimeEnd   || null;
  if (patch.timezone !== undefined)         payload.timezone          = patch.timezone;
  if (patch.venueName !== undefined)        payload.venue_name        = patch.venueName;
  if (patch.venueAddress !== undefined)     payload.venue_address     = patch.venueAddress;
  if (patch.venueCity !== undefined)        payload.venue_city        = patch.venueCity;
  if (patch.venueState !== undefined)       payload.venue_state       = patch.venueState;
  if (patch.venueZip !== undefined)         payload.venue_zip         = patch.venueZip;
  if (patch.venueInstagram !== undefined)   payload.venue_instagram   = patch.venueInstagram;
  if (patch.ticketPrice !== undefined)      payload.ticket_price      = patch.ticketPrice;
  if (patch.salesStart !== undefined)       payload.sales_start       = patch.salesStart   || null;
  if (patch.salesEnd !== undefined)         payload.sales_end         = patch.salesEnd     || null;
  if (patch.isRecurring !== undefined)      payload.is_recurring      = patch.isRecurring;
  if (patch.recurringFrequency !== undefined) payload.recurring_frequency = patch.recurringFrequency || null;
  if (patch.recurringEndDate !== undefined)   payload.recurring_end_date  = patch.recurringEndDate  || null;
  if (patch.performerIds !== undefined)     payload.performer_ids     = patch.performerIds;
  if (patch.isPromoted !== undefined)       payload.is_promoted       = patch.isPromoted;
  if (patch.refundWindowDays !== undefined) payload.refund_window_days = patch.refundWindowDays;
  if (patch.allSalesFinal !== undefined)    payload.all_sales_final    = patch.allSalesFinal;

  // Handle image upload if a new local URI was supplied
  if (patch.imageLocalUri) {
    payload.image_url = await uploadEventImage(patch.imageLocalUri);
  }

  const { data, error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const record = rowToEvent(data);
  const idx = _hostEvents.findIndex(e => e.id === eventId);
  if (idx >= 0) _hostEvents[idx] = record;
  else _hostEvents = [record, ..._hostEvents];

  return record;
}

/** Delete one of the host's events. */
export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) throw new Error(error.message);
  _hostEvents = _hostEvents.filter(e => e.id !== eventId);
}

/** Load a single event by ID (for the check-in screen). */
export async function fetchEventById(eventId: string): Promise<EventRecord | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error || !data) return null;
  return rowToEvent(data);
}

/** Applies a paid boost after the Stripe payment sheet reports success.
 *  The server checks the payment and sets promoted_until (the app can't
 *  write those columns any more). `days` is kept for the old signature. */
export async function markEventPromoted(
  eventId: string,
  paymentIntentId: string,
  _days: number,
): Promise<EventRecord> {
  const { data: res, error: fnErr } = await supabase.functions.invoke('confirm-promotion', {
    body: { paymentIntentId },
  });
  if (fnErr || res?.error) throw new Error(res?.error ?? fnErr?.message ?? 'Could not apply the boost.');

  const { data, error } = await supabase.from('events').select('*').eq('id', eventId).single();
  if (error) throw new Error(error.message);

  const record = rowToEvent(data);
  const idx = _hostEvents.findIndex(e => e.id === eventId);
  if (idx >= 0) _hostEvents[idx] = record;

  return record;
}

/** Paid tickets sold across all of this host's events since the 1st of the
 *  month (UTC) -- drives the ticket service fee tier. Mirrors the server
 *  count in create-payment-intent. Hosts can read their own events' tickets. */
export async function getHostTicketsSoldThisMonth(hostId: string): Promise<number> {
  const { data: events, error: evErr } = await supabase.from('events').select('id').eq('host_id', hostId);
  if (evErr || !events?.length) return 0;
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { count, error } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .in('event_id', events.map((e: { id: string }) => String(e.id)))
    .in('payment_status', ['paid', 'refund_requested'])
    .gte('purchased_at', monthStart);
  return error ? 0 : (count ?? 0);
}

// ─── Cancelling a show ────────────────────────────────────────────────────────

export type CancelQuote = {
  eventTitle: string;
  alreadyCancelled: boolean;
  isFreeShow: boolean;
  ticketHolders: number;
  paidTickets: number;
  freeTickets: number;
  singleDate?: boolean;
  dateLabel?: string | null;
  refundToFans: number;        // everything fans paid, service fees included
  ticketSalesReturned: number; // comes back out of the host's payouts
  serviceFeesWaived: number;   // Sequins gives its fees back to fans
  hostStripeFees: number;      // card processing fees the host covers (estimate)
  hostTotalCost: number;       // ticketSalesReturned + hostStripeFees
};

export type CancelResult = {
  cancelled: boolean;
  refundedCount: number;
  refundedTotal: number;
  freeHoldersNotified: number;
  failedCount: number;
  hostCharge: { amount: number; status: 'collected' | 'owed' | string } | null;
};

/** What cancelling this show would cost, without changing anything. */
export type CancelTarget = { occurrenceStart?: string; includeUndated?: boolean };

export async function getCancelQuote(eventId: string, target: CancelTarget = {}): Promise<CancelQuote> {
  const { data, error } = await supabase.functions.invoke('cancel-event', {
    body: { eventId, action: 'quote', ...target },
  });
  if (error) throw new Error(error.message ?? 'Could not load the cancellation details.');
  if (data?.error) throw new Error(data.error);
  return data as CancelQuote;
}

/** Cancel the show: refund every fan in full and charge the host the card processing fees. */
export async function cancelEvent(eventId: string, reason?: string, target: CancelTarget = {}): Promise<CancelResult> {
  const { data, error } = await supabase.functions.invoke('cancel-event', {
    body: { eventId, action: 'confirm', reason, ...target },
  });
  if (error) throw new Error(error.message ?? 'Could not cancel the show.');
  if (data?.error) throw new Error(data.error);
  const idx = _hostEvents.findIndex(e => e.id === eventId);
  if (idx >= 0) {
    const ev = _hostEvents[idx];
    _hostEvents[idx] = target.occurrenceStart
      ? { ...ev, cancelledOccurrences: [...(ev.cancelledOccurrences ?? []), target.occurrenceStart] }
      : { ...ev, cancelledAt: new Date().toISOString(), cancelReason: reason ?? null };
  }
  return data as CancelResult;
}

/** How many people hold a ticket (free or paid, not refunded) for this event. Host-only (RLS). */
export async function getActiveTicketCount(eventId: string): Promise<number> {
  const { count, error } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .in('payment_status', ['paid', 'refund_requested', 'free']);
  return error ? 0 : (count ?? 0);
}

/** What this host still owes Sequins from cancelled shows (dollars). It comes
 *  out of their next ticket sales automatically. Reads their own rows (RLS). */
export async function getHostBalanceOwed(hostId: string): Promise<number> {
  const [{ data: charges }, { data: collections }] = await Promise.all([
    supabase.from('host_charges').select('amount').eq('host_id', hostId).eq('status', 'owed'),
    supabase.from('host_charge_collections').select('amount').eq('host_id', hostId).eq('status', 'collected'),
  ]);
  const owed = (charges ?? []).reduce((s: number, c: { amount: number }) => s + Number(c.amount), 0);
  const paid = (collections ?? []).reduce((s: number, c: { amount: number }) => s + Number(c.amount), 0);
  return Math.max(0, Math.round((owed - paid) * 100) / 100);
}
