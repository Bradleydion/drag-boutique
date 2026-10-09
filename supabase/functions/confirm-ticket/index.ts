import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@16';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Called by the app right after the ticket payment sheet reports success.
// Paid tickets are created ONLY by the server (audit item 1, Oct 2026): the
// app can no longer insert a 'paid' ticket itself (tickets_guard_client_write
// trigger turns any app-inserted ticket for a paid show into 'pending').
// This function checks the payment with Stripe and creates or upgrades the
// ticket as service_role. stripe-connect-webhook (payment_intent.succeeded)
// runs the same fulfilTicket() as a backup (app closed or lost signal right
// after paying, old app builds). Running it twice is a no-op.
//
// KEEP fulfilTicket() IN SYNC with the copy in stripe-connect-webhook.

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-06-20' });
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// ── fulfilTicket (shared with stripe-connect-webhook) ────────────────────────
type FulfilResult = { ticket: Record<string, unknown> | null; refunded?: boolean; message?: string };

async function refundDuplicate(pi: Stripe.PaymentIntent, why: string) {
  try {
    await stripe.refunds.create(
      { payment_intent: pi.id, reverse_transfer: true, refund_application_fee: true, metadata: { reason: why } },
      { idempotencyKey: `auto-refund-${pi.id}` },
    );
  } catch (e) {
    console.error('auto-refund failed', pi.id, e);
  }
}

async function notifyHost(hostId: string, userId: string, eventId: string, title: string, price: number) {
  if (!hostId || hostId === userId) return;
  const row = {
    user_id: hostId,
    type: 'ticket_sold',
    title: `New ticket sold — ${title || 'your show'}`.slice(0, 200),
    body: `$${price.toFixed(2)} ticket purchased via Stripe.`,
    link: `/event/${eventId}`,
  };
  const { error } = await admin.from('notifications').insert(row);
  if (error) { console.warn('ticket notification failed', error.message); return; }
  try {
    const { data: tokens } = await admin.from('user_push_tokens').select('token').eq('user_id', hostId);
    if (!tokens?.length) return;
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tokens.map(({ token }: { token: string }) => ({
        to: token, title: row.title, body: row.body, data: { link: row.link }, sound: 'default',
      }))),
    });
  } catch (e) {
    console.warn('ticket push failed', e);
  }
}

export async function fulfilTicket(pi: Stripe.PaymentIntent): Promise<FulfilResult> {
  const m = pi.metadata ?? {};
  if (!m.event_id || !m.user_id || m.user_id === 'unknown') throw new Error('Not a ticket payment.');
  if (pi.status !== 'succeeded') throw new Error('This payment hasn’t gone through yet.');

  const occurrence = m.occurrence_start || null;
  const price = Number(m.ticket_price_cents ?? '0') / 100;
  const paidFields = {
    price,
    payment_status: 'paid',
    stripe_payment_intent_id: pi.id,
    platform_fee_percent: m.platform_fee_percent ? Number(m.platform_fee_percent) : null,
    platform_fee_amount: m.platform_fee_amount ? Number(m.platform_fee_amount) / 100 : null,
  };

  // 1. Already fulfilled for this payment?
  const { data: byPi } = await admin.from('tickets').select('*').eq('stripe_payment_intent_id', pi.id).maybeSingle();
  if (byPi && byPi.payment_status !== 'pending') return { ticket: byPi };

  // 2. Existing row for this fan + show + date (pending from an old build, an
  //    earlier refunded ticket, or a ticket bought twice).
  let q = admin.from('tickets').select('*').eq('user_id', m.user_id).eq('event_id', m.event_id);
  q = occurrence ? q.eq('occurrence_start', occurrence) : q.is('occurrence_start', null);
  const { data: existing } = byPi ? { data: byPi } : await q.maybeSingle();

  if (existing) {
    const status = existing.payment_status as string;
    if (['paid', 'free', 'refund_requested'].includes(status) && existing.stripe_payment_intent_id !== pi.id) {
      // Already has a ticket for this date: give the second payment back.
      await refundDuplicate(pi, 'duplicate_ticket');
      return { ticket: existing, refunded: true, message: 'You already had a ticket for this show, so this payment was refunded.' };
    }
    // pending / refunded / failed → becomes this paid ticket
    const { data: updated, error } = await admin
      .from('tickets')
      .update({
        ...paidFields,
        purchased_at: new Date().toISOString(),
        checked_in_at: null,
        refund_requested_at: null,
        refund_reason: null,
        stripe_refund_id: null,
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await notifyHost(m.host_id, m.user_id, m.event_id, m.event_title, price);
    return { ticket: updated };
  }

  // 3. New ticket.
  const { data: inserted, error } = await admin
    .from('tickets')
    .insert({ user_id: m.user_id, event_id: m.event_id, occurrence_start: occurrence, ...paidFields })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') {
      // The webhook and the app raced; the other one won.
      const { data: again } = await admin.from('tickets').select('*').eq('stripe_payment_intent_id', pi.id).maybeSingle();
      if (again) return { ticket: again };
    }
    if (/cancelled/i.test(error.message)) {
      await refundDuplicate(pi, 'show_cancelled');
      return { ticket: null, refunded: true, message: 'This show was cancelled while you were paying, so your payment was refunded.' };
    }
    throw new Error(error.message);
  }
  await notifyHost(m.host_id, m.user_id, m.event_id, m.event_title, price);
  return { ticket: inserted };
}
// ── end fulfilTicket ─────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: auth } = await admin.auth.getUser(jwt);
    const userId = auth?.user?.id;
    if (!userId) return json({ error: 'Please sign in again.' }, 401);

    const { paymentIntentId } = await req.json();
    if (!paymentIntentId || typeof paymentIntentId !== 'string') return json({ error: 'paymentIntentId is required.' }, 400);

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.metadata?.user_id !== userId) return json({ error: 'This payment belongs to a different account.' }, 403);

    const result = await fulfilTicket(pi);
    return json(result);
  } catch (err) {
    console.error('confirm-ticket error:', err);
    return json({ error: err instanceof Error ? err.message : 'Could not confirm your ticket.' }, 500);
  }
});
