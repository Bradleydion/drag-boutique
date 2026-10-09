import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@16';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// In-app account deletion (App Store 5.1.1(v); audit item 4, Oct 2026).
// Replaces the old delete_user() RPC, which failed for Shop buyers, erased
// fans' tickets from hosts' sales records, left performer profiles public,
// kept Stripe Pro subscriptions billing and left hosts' shows on sale.
//
// Order:
//   1. Hosts with tickets sold for upcoming dates are stopped: they must
//      cancel those shows first (Cancel Show refunds the buyers).
//   2. Stripe Pro subscription cancelled immediately.
//   3. Upcoming shows with no tickets are taken off sale (cancelled_at).
//   4. Performer profile(s) deleted; unsold Shop listings deleted.
//   5. Auth user deleted. Tickets and sold listings stay for the other
//      party's records with user_id / seller_id / buyer_id set to NULL
//      (FKs changed in migration 20261009b).

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-06-20' });
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const HELD = ['free', 'paid', 'pending', 'refund_requested'];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: auth } = await admin.auth.getUser(jwt);
    const userId = auth?.user?.id;
    if (!userId) return json({ error: 'Please sign in again.' }, 401);

    const now = new Date();

    // ── 1. Host's live shows ────────────────────────────────────────────────
    const { data: events } = await admin
      .from('events')
      .select('id, title, datetime_start, is_recurring, cancelled_at')
      .eq('host_id', userId)
      .is('cancelled_at', null);
    const live = (events ?? []).filter(
      (e: { datetime_start: string | null; is_recurring: boolean | null }) =>
        e.is_recurring || !e.datetime_start || new Date(e.datetime_start) > now,
    );

    const blocking: string[] = [];
    for (const e of live) {
      const { data: tix } = await admin
        .from('tickets')
        .select('occurrence_start')
        .eq('event_id', String(e.id))
        .in('payment_status', HELD);
      const upcoming = (tix ?? []).some((t: { occurrence_start: string | null }) => {
        const when = t.occurrence_start ?? e.datetime_start;
        return !when || new Date(when) > now;
      });
      if (upcoming) blocking.push(e.title ?? 'Untitled show');
    }
    if (blocking.length) {
      return json({
        error:
          `You have tickets sold for upcoming shows: ${blocking.join(', ')}. ` +
          'Cancel those shows first (Organize → your show → Cancel Show refunds everyone), then delete your account.',
        blockingEvents: blocking,
      }, 409);
    }

    // ── 2. Stripe Pro subscription ──────────────────────────────────────────
    const { data: subs } = await admin
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', userId);
    for (const s of subs ?? []) {
      if (!s.stripe_subscription_id || ['canceled', 'incomplete_expired'].includes(s.status)) continue;
      try {
        await stripe.subscriptions.cancel(s.stripe_subscription_id);
      } catch (e) {
        // Already cancelled / missing in Stripe is fine; anything else stops the deletion.
        const code = (e as { code?: string }).code;
        if (code !== 'resource_missing') {
          console.error('delete-account: subscription cancel failed', e);
          return json({ error: 'Could not cancel your Sequins Pro subscription. Please try again or email bradleydion@thebradleyproject.com.' }, 502);
        }
      }
    }

    // ── 3. Take upcoming shows (no tickets) off sale ────────────────────────
    if (live.length) {
      const { error } = await admin
        .from('events')
        .update({ cancelled_at: now.toISOString() })
        .in('id', live.map((e: { id: string }) => e.id));
      if (error) console.error('delete-account: event cancel failed', error);
    }

    // ── 4. Performer profile + unsold Shop listings ─────────────────────────
    await admin.from('performers').delete().eq('user_id', userId);
    await admin.from('listings').delete().eq('seller_id', userId).eq('sold', false).neq('payment_status', 'paid');

    // ── 5. Delete the login itself ──────────────────────────────────────────
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error('delete-account: auth delete failed', delErr);
      return json({ error: 'Could not delete your account. Please try again or email bradleydion@thebradleyproject.com.' }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error('delete-account error:', err);
    return json({ error: 'Could not delete your account. Please try again or email bradleydion@thebradleyproject.com.' }, 500);
  }
});
