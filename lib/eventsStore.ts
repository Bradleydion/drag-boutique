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
    payoutVenmo?: string;
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
      payoutVenmo: row.payout_venmo,
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
  };
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

  // Fetch the local file as a blob (works in Expo / React Native)
  const res = await fetch(localUri);
  const blob = await res.blob();

  const { error } = await supabase.storage
    .from('event-images')
    .upload(fileName, blob, { contentType: mimeType, upsert: false });

  if (error) throw new Error(`Image upload failed: ${error.message}`);

  const { data } = supabase.storage.from('event-images').getPublicUrl(fileName);
  return data.publicUrl;
}

// ─── Public API ───────────────────────────────────────────────────────────────

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
  const hostName = session?.user?.user_metadata?.display_name as string | undefined
                ?? session?.user?.email?.split('@')[0]
                ?? 'Host';

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
    venue_name:    d.venueName,
    venue_address: d.venueAddress,
    venue_city:    d.venueCity,
    venue_state:   d.venueState,
    venue_zip:     d.venueZip,
    venue_instagram: d.venueInstagram,
    ticket_price:  d.ticketPrice ?? 0,
    payout_venmo:  d.payoutVenmo,
    sales_start:   d.salesStart || null,
    sales_end:     d.salesEnd   || null,
    image_url:     imageUrl ?? null,
    performer_ids: d.performerIds ?? [],
    is_recurring:          d.isRecurring ?? false,
    recurring_frequency:   d.isRecurring ? (d.recurringFrequency ?? null) : null,
    recurring_end_date:    d.isRecurring ? (d.recurringEndDate   ?? null) : null,
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
    payoutVenmo: string;
    salesStart: string;
    salesEnd: string;
    isRecurring: boolean;
    recurringFrequency: string;
    recurringEndDate: string;
    imageLocalUri: string;
    performerIds: string[];
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
  if (patch.payoutVenmo !== undefined)      payload.payout_venmo      = patch.payoutVenmo;
  if (patch.salesStart !== undefined)       payload.sales_start       = patch.salesStart   || null;
  if (patch.salesEnd !== undefined)         payload.sales_end         = patch.salesEnd     || null;
  if (patch.isRecurring !== undefined)      payload.is_recurring      = patch.isRecurring;
  if (patch.recurringFrequency !== undefined) payload.recurring_frequency = patch.recurringFrequency || null;
  if (patch.recurringEndDate !== undefined)   payload.recurring_end_date  = patch.recurringEndDate  || null;
  if (patch.performerIds !== undefined)     payload.performer_ids     = patch.performerIds;

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
