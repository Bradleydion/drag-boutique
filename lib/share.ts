// lib/share.ts
// Native share sheet for shows and performer profiles. Until Sequins has
// public web pages for each show, the link is the join page, which sends
// people to the right store/test link for their phone.

import { Share } from 'react-native';
import { formatEventLong } from './eventTime';

export const JOIN_LINK = 'https://www.thebradleyproject.com/sequins#join';

export async function shareEvent(e: {
  title: string;
  datetimeStart?: string | null;
  timezone?: string | null;
  venue?: { name?: string; city?: string; state?: string } | null;
}) {
  const where = [e.venue?.name, e.venue?.city].filter(Boolean).join(', ');
  const when = e.datetimeStart ? formatEventLong(e.datetimeStart, e.timezone) : '';
  const lines = [
    `💜 ${e.title.trim()}`,
    [when, where].filter(Boolean).join(' · '),
    `Tickets and details on Sequins: ${JOIN_LINK}`,
  ].filter(Boolean);
  try { await Share.share({ message: lines.join('\n') }); } catch { /* dismissed */ }
}

export async function sharePerformer(p: { stageName: string }) {
  const msg = `💜 Check out ${p.stageName.trim()} on Sequins: shows, tips and bookings in one place.\n${JOIN_LINK}`;
  try { await Share.share({ message: msg }); } catch { /* dismissed */ }
}
