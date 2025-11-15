// lib/createEventStore.ts
// Tiny in-memory store to carry event creation data across steps.
// For MVP this is sufficient; later we can replace with context or persistence.

export type DraftEvent = {
  // Basics
  title?: string;
  description?: string;
  datetimeStart?: string; // ISO string
  datetimeEnd?: string;   // ISO string
  timezone?: string;

  // Venue
  venueName?: string;
  venueAddress?: string;
  venueCity?: string;
  venueState?: string;
  venueZip?: string;
  venueInstagram?: string;

  // Ticketing
  ticketPrice?: number;   // USD
  payoutVenmo?: string;   // @handle (without @ is fine too)
  salesStart?: string;    // ISO
  salesEnd?: string;      // ISO
};

let _draft: DraftEvent = {};

export function getDraft(): DraftEvent {
  return _draft;
}

export function updateDraft(patch: Partial<DraftEvent>) {
  _draft = { ..._draft, ...patch };
}

export function resetDraft() {
  _draft = {};
}
