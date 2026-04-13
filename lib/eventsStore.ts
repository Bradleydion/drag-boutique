// lib/eventsStore.ts
// Minimal in-memory event list and a publish helper for MVP.
// Later, replace with server storage or SQLite.

import type { DraftEvent } from './createEventStore';

export type EventRecord = {
  id: string;
  title: string;
  description?: string;
  datetimeStart?: string;
  datetimeEnd?: string;
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
    price?: number; // USD
    payoutVenmo?: string; // handle without @
    salesStart?: string;
    salesEnd?: string;
  };
};

const _events: EventRecord[] = [];

export function getEvents(): EventRecord[] {
  return _events;
}

export function clearEvents() {
  _events.length = 0;
}

function makeId() {
  return 'evt_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
}

export function publishDraft(d: DraftEvent): EventRecord {
  const rec: EventRecord = {
    id: makeId(),
    title: d.title || 'Untitled Event',
    description: d.description,
    datetimeStart: d.datetimeStart,
    datetimeEnd: d.datetimeEnd,
    timezone: d.timezone,
    venue: {
      name: d.venueName,
      address: d.venueAddress,
      city: d.venueCity,
      state: d.venueState,
      zip: d.venueZip,
      instagram: d.venueInstagram,
    },
    ticketing: {
      price: d.ticketPrice,
      payoutVenmo: d.payoutVenmo,
      salesStart: d.salesStart,
      salesEnd: d.salesEnd,
    },
  };
  _events.unshift(rec);
  return rec;
}