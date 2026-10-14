// lib/eventTime.ts
// Show times in the VENUE's time zone, not the phone's. Someone in Portland
// looking at a St. Pete show should see 8 PM (the time on the flyer), with a
// small "ET" so it's clear. Shows in the viewer's own zone get no label.

const deviceTz = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; }
})();

function safeFormat(d: Date, opts: Intl.DateTimeFormatOptions, tz?: string | null): string {
  try {
    return d.toLocaleString('en-US', tz ? { ...opts, timeZone: tz } : opts);
  } catch {
    return d.toLocaleString('en-US', opts); // unknown zone name: fall back to the phone's
  }
}

/** " ET", " CT", etc. when the venue is in a different zone than the phone; "" otherwise. */
export function tzLabel(iso: string | undefined | null, tz?: string | null): string {
  if (!iso || !tz || tz === deviceTz) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date(iso));
    const name = parts.find(p => p.type === 'timeZoneName')?.value ?? '';
    // "EDT"/"EST" → "ET" reads better on a flyer-style line.
    const simple = /^([ECMP])[SD]T$/.test(name) ? name[0] + 'T' : name;
    return simple ? ` ${simple}` : '';
  } catch {
    return '';
  }
}

/** "Friday, October 23 at 8:00 PM" (+ " ET" when it's another zone). */
export function formatEventLong(iso?: string | null, tz?: string | null): string {
  if (!iso) return 'Date TBD';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return (
    safeFormat(d, { weekday: 'long', month: 'long', day: 'numeric' }, tz) +
    ' at ' +
    safeFormat(d, { hour: 'numeric', minute: '2-digit' }, tz) +
    tzLabel(iso, tz)
  );
}

/** "Oct 23, 8:00 PM" (+ zone label when different). */
export function formatEventShort(iso?: string | null, tz?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return safeFormat(d, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }, tz) + tzLabel(iso, tz);
}

/** Date part only, e.g. "Fri, Oct 23". */
export function formatEventDay(iso?: string | null, tz?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return safeFormat(d, { weekday: 'short', month: 'short', day: 'numeric' }, tz);
}

/** Time part only, e.g. "8:00 PM ET". */
export function formatEventClock(iso?: string | null, tz?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return safeFormat(d, { hour: 'numeric', minute: '2-digit' }, tz) + tzLabel(iso, tz);
}

/** "Wed, Oct 14, 12:00 PM" style, used for ticket sale windows. */
export function formatEventMoment(iso?: string | null, tz?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso ?? '';
  return safeFormat(d, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }, tz) + tzLabel(iso, tz);
}
