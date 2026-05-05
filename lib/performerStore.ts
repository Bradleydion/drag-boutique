// lib/performerStore.ts
// Supabase-backed performer profiles.
//
// Required Supabase setup — run once in SQL editor:
//
//   create table performers (
//     id text primary key default gen_random_uuid()::text,
//     user_id uuid references auth.users(id) on delete set null,
//     stage_name text not null,
//     bio text,
//     photo_url text,
//     booking_info text,
//     venmo_handle text,
//     instagram_url text,
//     tiktok_url text,
//     website_url text,
//     commissions_enabled boolean default false,
//     commission_blurb text,
//     commission_pricing text,
//     created_at timestamptz default now(),
//     updated_at timestamptz default now()
//   );
//
//   alter table performers enable row level security;
//   create policy "anyone can read performers" on performers for select using (true);
//   create policy "create own profile" on performers for insert to authenticated
//     with check (auth.uid() = user_id);
//   create policy "edit own profile" on performers for update to authenticated
//     using (auth.uid() = user_id) with check (auth.uid() = user_id);
//
//   -- Add performer tagging to events:
//   alter table events add column if not exists performer_ids text[] default '{}';
//
//   -- Booking requests:
//   create table booking_requests (
//     id uuid primary key default gen_random_uuid(),
//     performer_id text not null,
//     requester_id uuid references auth.users(id) on delete set null,
//     requester_name text,
//     requester_email text,
//     message text,
//     event_date text,
//     request_type text default 'booking',
//     status text default 'pending',
//     created_at timestamptz default now()
//   );
//   alter table booking_requests enable row level security;
//   create policy "send booking request" on booking_requests for insert to authenticated
//     with check (auth.uid() = requester_id);
//   create policy "view sent requests" on booking_requests for select to authenticated
//     using (auth.uid() = requester_id);
//   create policy "performer views requests" on booking_requests for select to authenticated
//     using (performer_id in (select id from performers where user_id = auth.uid()));
//
//   -- Storage buckets (Dashboard > Storage):
//   -- "performer-photos"  → Public: ON
//
//   -- Seed the 6 demo performers:
//   insert into performers (id, stage_name, bio, photo_url, booking_info, venmo_handle, instagram_url, tiktok_url, commissions_enabled, commission_blurb, commission_pricing) values
//     ('p1','Miss Nova Gold','High-energy pop + glam. Portland''s reigning queen of the sequin.','https://picsum.photos/seed/nova/300/300','Portland-based. Travel negotiable.','missnovagold','https://instagram.com/missnovagold',null,true,'Custom wig styling + costumes','Wigs from $150+'),
//     ('p2','DJ Velvet','House, disco, vogue beats. Making dance floors dangerous since 2018.','https://picsum.photos/seed/velvet/300/300',null,'djvelvet',null,null,false,null,null),
//     ('p3','Countess LaRoux','Old Hollywood glamour meets downtown grit. Comedy, lip sync, and chaos.','https://picsum.photos/seed/laroux/300/300','Seattle and PNW. Will travel for the right coin.','countesslaroux','https://instagram.com/countesslaroux','https://tiktok.com/@countesslaroux',true,'Vintage-inspired gowns and headpieces','Starting at $200'),
//     ('p4','Prism Bejeweled','Avant-garde looks and performance art. If it makes you think, it''s working.','https://picsum.photos/seed/prism/300/300','San Francisco based. Gallery shows and nightlife.','prismbejeweled','https://instagram.com/prismbejeweled',null,false,null,null),
//     ('p5','Honey Badger','Comedy drag. Absolutely unhinged. You''ve been warned.','https://picsum.photos/seed/honey/300/300','Chicago. Takes no prisoners.','honeybadgerdrag','https://instagram.com/honeybadgerdrag',null,false,null,null),
//     ('p6','Valentina Vex','Ballroom legend. Vogue, runway, realness.','https://picsum.photos/seed/vex/300/300','New York City. Nationwide bookings.','valentinavex','https://instagram.com/valentinavex','https://tiktok.com/@valentinavex',false,null,null);

import { performers as seedPerformers } from '../data/events';
import { getSession, isGuest } from './authStore';
import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PerformerRecord = {
  id: string;
  userId?: string;
  stageName: string;
  bio?: string;
  photoUrl?: string;
  bookingInfo?: string;
  venmoHandle?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  websiteUrl?: string;
  commissionsEnabled?: boolean;
  commissionBlurb?: string;
  commissionPricing?: string;
  createdAt?: string;
  isPromoted?: boolean;
};

export type UpcomingShow = {
  id: string;
  title: string;
  datetimeStart: string;
  venueName?: string;
  venueCity?: string;
  price: number;
  imageUrl?: string;
};

// ─── Local cache ──────────────────────────────────────────────────────────────

let _performers: PerformerRecord[] = [];
let _loaded = false;

// ─── Mappers ──────────────────────────────────────────────────────────────────

function rowToPerformer(row: Record<string, any>): PerformerRecord {
  return {
    id:                 row.id,
    userId:             row.user_id,
    stageName:          row.stage_name,
    bio:                row.bio,
    photoUrl:           row.photo_url,
    bookingInfo:        row.booking_info,
    venmoHandle:        row.venmo_handle,
    instagramUrl:       row.instagram_url,
    tiktokUrl:          row.tiktok_url,
    websiteUrl:         row.website_url,
    commissionsEnabled: row.commissions_enabled ?? false,
    commissionBlurb:    row.commission_blurb,
    commissionPricing:  row.commission_pricing,
    createdAt:          row.created_at,
    isPromoted:         row.is_promoted ?? false,
  };
}

function seedToRecord(p: any): PerformerRecord {
  return {
    id:                 p.id,
    stageName:          p.stageName,
    bio:                p.bio,
    photoUrl:           p.photoUrl,
    bookingInfo:        p.bookingInfo,
    venmoHandle:        p.venmoHandle,
    instagramUrl:       p.socials?.instagram,
    tiktokUrl:          p.socials?.tiktok,
    websiteUrl:         p.socials?.website,
    commissionsEnabled: p.commissionsEnabled ?? false,
    commissionBlurb:    p.commissionInfo?.blurb,
    commissionPricing:  p.commissionInfo?.pricingNotes,
  };
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

/** Load all performers from Supabase into the local cache. Falls back to seed data. */
export async function loadPerformers(): Promise<void> {
  const { data, error } = await supabase
    .from('performers')
    .select('*')
    .order('stage_name', { ascending: true });

  if (error || !data || data.length === 0) {
    _performers = seedPerformers.map(seedToRecord);
    _loaded = true;
    return;
  }

  _performers = data.map(rowToPerformer);
  _loaded = true;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export function getPerformers(): PerformerRecord[] {
  if (!_loaded) return seedPerformers.map(seedToRecord);
  return _performers;
}

/** Fetch a single performer by ID. Checks cache → Supabase → seed data. */
export async function fetchPerformerById(id: string): Promise<PerformerRecord | null> {
  // Cache hit
  const cached = _performers.find(p => p.id === id);
  if (cached) return cached;

  // Supabase lookup
  const { data, error } = await supabase
    .from('performers')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!error && data) {
    const record = rowToPerformer(data);
    _performers = [..._performers.filter(p => p.id !== id), record];
    return record;
  }

  // Seed fallback
  const seed = seedPerformers.find((p: any) => p.id === id);
  return seed ? seedToRecord(seed) : null;
}

/** Return the cached performer profile owned by the current user, if any. */
export function getMyPerformerProfile(): PerformerRecord | null {
  const session = getSession();
  if (!session) return null;
  return _performers.find(p => p.userId === session.user.id) ?? null;
}

/** Fetch the current user's performer profile directly from Supabase. */
export async function loadMyPerformerProfile(): Promise<PerformerRecord | null> {
  const session = getSession();
  if (!session || isGuest()) return null;

  const { data, error } = await supabase
    .from('performers')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error || !data) return null;

  const record = rowToPerformer(data);
  const idx = _performers.findIndex(p => p.id === record.id);
  if (idx >= 0) _performers[idx] = record;
  else _performers.push(record);

  return record;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Create a brand new performer profile for the current user. */
export async function createPerformerProfile(input: {
  stageName: string;
  bio?: string;
  photoLocalUri?: string;
  bookingInfo?: string;
  venmoHandle?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  websiteUrl?: string;
  commissionsEnabled?: boolean;
  commissionBlurb?: string;
  commissionPricing?: string;
}): Promise<PerformerRecord> {
  const session = getSession();
  if (!session || isGuest()) throw new Error('Must be signed in to create a profile.');

  let photoUrl: string | undefined;
  if (input.photoLocalUri) {
    photoUrl = await uploadPerformerPhoto(input.photoLocalUri);
  }

  const payload = {
    user_id:             session.user.id,
    stage_name:          input.stageName,
    bio:                 input.bio ?? null,
    photo_url:           photoUrl ?? null,
    booking_info:        input.bookingInfo ?? null,
    venmo_handle:        input.venmoHandle ?? null,
    instagram_url:       input.instagramUrl ?? null,
    tiktok_url:          input.tiktokUrl ?? null,
    website_url:         input.websiteUrl ?? null,
    commissions_enabled: input.commissionsEnabled ?? false,
    commission_blurb:    input.commissionBlurb ?? null,
    commission_pricing:  input.commissionPricing ?? null,
  };

  const { data, error } = await supabase
    .from('performers')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const record = rowToPerformer(data);
  _performers = [record, ..._performers];
  return record;
}

/** Update the current user's performer profile. */
export async function updatePerformerProfile(
  id: string,
  patch: Partial<PerformerRecord> & { photoLocalUri?: string },
): Promise<PerformerRecord> {
  const session = getSession();
  if (!session) throw new Error('Must be signed in.');

  let photoUrl = patch.photoUrl;
  if (patch.photoLocalUri) {
    photoUrl = await uploadPerformerPhoto(patch.photoLocalUri);
  }

  // Only include fields that are explicitly set
  const payload: Record<string, any> = { updated_at: new Date().toISOString() };
  if (patch.stageName !== undefined)          payload.stage_name          = patch.stageName;
  if (patch.bio !== undefined)                payload.bio                 = patch.bio;
  if (photoUrl !== undefined)                 payload.photo_url           = photoUrl;
  if (patch.bookingInfo !== undefined)        payload.booking_info        = patch.bookingInfo;
  if (patch.venmoHandle !== undefined)        payload.venmo_handle        = patch.venmoHandle;
  if (patch.instagramUrl !== undefined)       payload.instagram_url       = patch.instagramUrl;
  if (patch.tiktokUrl !== undefined)          payload.tiktok_url          = patch.tiktokUrl;
  if (patch.websiteUrl !== undefined)         payload.website_url         = patch.websiteUrl;
  if (patch.commissionsEnabled !== undefined) payload.commissions_enabled = patch.commissionsEnabled;
  if (patch.commissionBlurb !== undefined)    payload.commission_blurb    = patch.commissionBlurb;
  if (patch.commissionPricing !== undefined)  payload.commission_pricing  = patch.commissionPricing;
  if (patch.isPromoted !== undefined)         payload.is_promoted         = patch.isPromoted;

  const { data, error } = await supabase
    .from('performers')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const record = rowToPerformer(data);
  const idx = _performers.findIndex(p => p.id === id);
  if (idx >= 0) _performers[idx] = record;

  return record;
}

// ─── Photo upload ─────────────────────────────────────────────────────────────

/**
 * Upload a performer photo to the `performer-photos` Supabase Storage bucket.
 * Returns the public URL.
 */
export async function uploadPerformerPhoto(localUri: string): Promise<string> {
  const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const res = await fetch(localUri);
  const blob = await res.blob();

  const { error } = await supabase.storage
    .from('performer-photos')
    .upload(fileName, blob, { contentType: mimeType, upsert: false });

  if (error) throw new Error(`Photo upload failed: ${error.message}`);

  const { data } = supabase.storage.from('performer-photos').getPublicUrl(fileName);
  return data.publicUrl;
}

// ─── Booking requests ─────────────────────────────────────────────────────────

export type BookingRequestStatus = 'pending' | 'accepted' | 'declined';
export type BookingRequestType   = 'booking' | 'commission';

export type BookingRequest = {
  id: string;
  performerId: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  message: string;
  eventDate?: string;
  requestType: BookingRequestType;
  status: BookingRequestStatus;
  createdAt: string;
};

function rowToRequest(row: Record<string, any>): BookingRequest {
  return {
    id:             row.id,
    performerId:    row.performer_id,
    requesterId:    row.requester_id,
    requesterName:  row.requester_name,
    requesterEmail: row.requester_email,
    message:        row.message,
    eventDate:      row.event_date ?? undefined,
    requestType:    row.request_type as BookingRequestType,
    status:         row.status as BookingRequestStatus,
    createdAt:      row.created_at,
  };
}

/** Load all booking requests for a given performer ID. */
export async function loadBookingRequests(performerId: string): Promise<BookingRequest[]> {
  const { data, error } = await supabase
    .from('booking_requests')
    .select('*')
    .eq('performer_id', performerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[performerStore] loadBookingRequests error:', error.message);
    return [];
  }
  return (data ?? []).map(rowToRequest);
}

/** Accept a booking request and notify the requester. */
export async function acceptBookingRequest(requestId: string, performerName: string): Promise<void> {
  const { data, error } = await supabase
    .from('booking_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .select('requester_id, performer_id, request_type')
    .single();

  if (error) throw new Error(error.message);

  // Notify requester
  try {
    const { addNotification } = await import('./notificationsStore');
    await addNotification({
      userId: data.requester_id,
      type:   'booking_accepted',
      title:  `${performerName} accepted your ${data.request_type} request! 🎉`,
      body:   'Reach out to confirm details.',
      link:   `/performer/${data.performer_id}`,
    });
  } catch (_) {}
}

/** Decline a booking request and notify the requester. */
export async function declineBookingRequest(requestId: string, performerName: string): Promise<void> {
  const { data, error } = await supabase
    .from('booking_requests')
    .update({ status: 'declined' })
    .eq('id', requestId)
    .select('requester_id, performer_id, request_type')
    .single();

  if (error) throw new Error(error.message);

  // Notify requester
  try {
    const { addNotification } = await import('./notificationsStore');
    await addNotification({
      userId: data.requester_id,
      type:   'booking_declined',
      title:  `${performerName} isn't available for your ${data.request_type} request`,
      body:   'Check out other artists on Sequins.',
      link:   `/performer/${data.performer_id}`,
    });
  } catch (_) {}
}

// ─── Upcoming shows ───────────────────────────────────────────────────────────

/**
 * Fetch upcoming events for a performer.
 * Queries Supabase events with performer_ids containing this performer,
 * then falls back to static seed events for seed performers.
 */
export async function fetchPerformerUpcomingShows(performerId: string): Promise<UpcomingShow[]> {
  const now = new Date().toISOString();

  // Try Supabase events (requires performer_ids column — see SQL setup above)
  const { data, error } = await supabase
    .from('events')
    .select('id, title, datetime_start, venue_name, venue_city, ticket_price, image_url')
    .contains('performer_ids', [performerId])
    .gte('datetime_start', now)
    .order('datetime_start', { ascending: true })
    .limit(5);

  if (!error && data && data.length > 0) {
    return data.map(row => ({
      id:            row.id as string,
      title:         row.title as string,
      datetimeStart: row.datetime_start as string,
      venueName:     row.venue_name as string | undefined,
      venueCity:     row.venue_city as string | undefined,
      price:         (row.ticket_price as number) ?? 0,
      imageUrl:      row.image_url as string | undefined,
    }));
  }

  // Seed-data fallback for demo performers
  const { events: seedEvents } = require('../data/events') as typeof import('../data/events');
  return seedEvents
    .filter(e => e.performerIds?.includes(performerId) && e.dateTimeStart >= now)
    .map(e => ({
      id:            e.id,
      title:         e.title,
      datetimeStart: e.dateTimeStart,
      venueName:     e.venueName,
      venueCity:     e.city,
      price:         e.price,
      imageUrl:      e.imageUrl,
    }))
    .slice(0, 5);
}
