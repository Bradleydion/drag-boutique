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

  // Performers
  performerIds?: string[];

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

  // Media
  imageLocalUri?: string;          // local file URI — uploaded to storage on publish

  // Recurring events
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurringDaysOfWeek?: number[];  // weekly only — 0=Sun, 6=Sat
  recurringEndDate?: string;       // ISO — when the series stops
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

/** Returns true if any field has been filled in. */
export function hasDraft(): boolean {
  return Object.values(_draft).some((v) => v !== undefined && v !== '');
}

/** Returns a plain summary string for dev/debug use. */
export function draftSummary(): string {
  return JSON.stringify(_draft, null, 2);
}
