import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@16';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// ── Sequins service fee (Oct 2026 model) ─────────────────────────────────────
// The FAN pays the service fee on top of the ticket price; the host receives
// 100% of the ticket price. Sequins pays Stripe's processing fee out of the
// service fee (destination charges bill Stripe fees to the platform).
//   fee = tier% of price + $0.50, never less than $0.99
//   tier is set by paid tickets the host has sold this calendar month (UTC):
//     Opening Act 0-99 → 7% · Featured 100-249 → 6% · Headliner 250-499 → 5% · Icon 500+ → 4%
// Keep in sync with lib/feeTiers.ts and create-listing-payment-intent.
const FEE_TIERS = [
  { threshold: 0,   percent: 0.07, name: 'Opening Act' },
  { threshold: 100, percent: 0.06, name: 'Featured' },
  { threshold: 250, percent: 0.05, name: 'Headliner' },
  { threshold: 500, percent: 0.04, name: 'Icon' },
];
const FLAT_FEE_CENTS = 50;
const MIN_FEE_CENTS = 99;

function tierFor(monthlySales: number) {
  let tier = FEE_TIERS[0];
  for (const t of FEE_TIERS) if (monthlySales >= t.threshold) tier = t;
  return tier;
}

function serviceFeeCents(priceCents: number, percent: number): number {
  if (priceCents <= 0) return 0;
  return Math.max(MIN_FEE_CENTS, Math.round(priceCents * percent) + FLAT_FEE_CENTS);
}

function monthStartUtc(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Paid tickets sold across all of this host's events since the 1st of the month. */
async function hostTicketsThisMonth(hostId: string): Promise<number> {
  const { data: events } = await supabaseAdmin.from('events').select('id').eq('host_id', hostId);
  const ids = (events ?? []).map((e: { id: string }) => String(e.id));
  if (!ids.length) return 0;
  const { count } = await supabaseAdmin
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .in('event_id', ids)
    .in('payment_status', ['paid', 'refund_requested'])
    .gte('purchased_at', monthStartUtc());
  return count ?? 0;
}

// ── Balance a host owes Sequins (from cancelled shows) ───────────────────────
// If taking it from their Stripe balance didn't work, it comes out of their
// next ticket sales: up to the full ticket price per sale is kept by Sequins
// until the balance is paid. The fan's price never changes.

/** Settle pending collections (payment finished or abandoned), then return what's still owed, in cents. */
async function hostOutstandingCents(hostId: string): Promise<number> {
  const { data: pending } = await supabaseAdmin
    .from('host_charge_collections')
    .select('id, payment_intent_id, created_at')
    .eq('host_id', hostId)
    .eq('status', 'pending');
  for (const c of pending ?? []) {
    try {
      const pi = await stripe.paymentIntents.retrieve(c.payment_intent_id);
      let status: string | null = null;
      if (pi.status === 'succeeded') status = 'collected';
      else if (pi.status === 'canceled') status = 'released';
      else if (Date.now() - new Date(c.created_at).getTime() > 60 * 60 * 1000) status = 'released'; // abandoned checkout
      if (status) await supabaseAdmin.from('host_charge_collections').update({ status }).eq('id', c.id);
    } catch (e) {
      console.warn('collection reconcile failed', c.payment_intent_id, e);
    }
  }

  const [{ data: charges }, { data: collections }] = await Promise.all([
    supabaseAdmin.from('host_charges').select('id, amount').eq('host_id', hostId).eq('status', 'owed'),
    supabaseAdmin.from('host_charge_collections').select('amount, status').eq('host_id', hostId).in('status', ['pending', 'collected']),
  ]);
  const owedCents = (charges ?? []).reduce((sum: number, c: { amount: number }) => sum + Math.round(Number(c.amount) * 100), 0);
  if (owedCents === 0) return 0;
  const collectedCents = (collections ?? [])
    .filter((c: { status: string }) => c.status === 'collected')
    .reduce((sum: number, c: { amount: number }) => sum + Math.round(Number(c.amount) * 100), 0);
  const pendingCents = (collections ?? [])
    .filter((c: { status: string }) => c.status === 'pending')
    .reduce((sum: number, c: { amount: number }) => sum + Math.round(Number(c.amount) * 100), 0);

  if (collectedCents >= owedCents) {
    // Paid off: close out the charges.
    await supabaseAdmin.from('host_charges').update({ status: 'collected' }).eq('host_id', hostId).eq('status', 'owed');
    return 0;
  }
  return Math.max(0, owedCents - collectedCents - pendingCents);
}

const sameMoment = (a: string | Date, b: string | Date) =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 60_000;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    // quoteOnly: return the price breakdown without creating a payment, so the
    // event page can show the all-in total up front.
    // occurrenceStart: which date of the show this ticket is for (recurring shows).
    const { eventId, eventTitle, quoteOnly, occurrenceStart } = await req.json();

    if (!eventId || typeof eventId !== 'string') {
      return json({ error: 'eventId is required' }, 400);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    let userId = 'unknown';
    try {
      // Supabase already verified the JWT before reaching this function
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      userId = payload.sub ?? 'unknown';
    } catch { /* ignore */ }

    // The ticket price always comes from the database, never from the app.
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, host_id, ticket_price, cancelled_at, cancelled_occurrences')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError || !event) {
      return json({ error: 'Event not found.' }, 404);
    }
    if (event.cancelled_at) {
      return json({ error: 'This show has been cancelled.' }, 400);
    }
    if (occurrenceStart && (event.cancelled_occurrences ?? []).some((c: string) => sameMoment(c, occurrenceStart))) {
      return json({ error: 'This date of the show has been cancelled.' }, 400);
    }

    const priceCents = Math.round(Number(event.ticket_price ?? 0) * 100);
    const monthlySales = await hostTicketsThisMonth(event.host_id);
    const tier = tierFor(monthlySales);
    const feeCents = serviceFeeCents(priceCents, tier.percent);
    const totalCents = priceCents + feeCents;

    const breakdown = {
      ticketPrice: priceCents / 100,
      serviceFee: feeCents / 100,
      total: totalCents / 100,
      platformFeePercent: tier.percent,
      platformFeeAmount: feeCents / 100,
      tierName: tier.name,
    };

    if (quoteOnly) return json(breakdown);

    if (priceCents <= 0) {
      return json({ error: 'This is a free event, so there is nothing to pay.' }, 400);
    }

    // Sold out? Checked before the card is charged. Free tickets are stopped
    // by the tickets_enforce_capacity trigger instead (migration 20261006).
    const { data: seatsLeft, error: seatsErr } = await supabaseAdmin.rpc('event_seats_remaining', {
      p_event_id: String(eventId),
      p_occurrence: occurrenceStart ?? null,
    });
    if (seatsErr) console.error('create-payment-intent: capacity check failed', seatsErr);
    if (typeof seatsLeft === 'number' && seatsLeft <= 0) {
      return json({ error: 'This show is sold out.', soldOut: true }, 409);
    }

    const { data: payoutAccount } = await supabaseAdmin
      .from('payout_accounts')
      .select('stripe_account_id, payouts_enabled')
      .eq('user_id', event.host_id)
      .maybeSingle();

    if (!payoutAccount?.stripe_account_id || !payoutAccount.payouts_enabled) {
      return json({
        error: 'This host hasn’t finished setting up payouts yet, so ticket sales are paused for this event.',
      }, 400);
    }

    // If the host owes Sequins from a cancelled show, keep up to this
    // ticket's price toward that balance.
    const owedCollectCents = Math.min(await hostOutstandingCents(event.host_id), priceCents);

    // Destination charge: the fan pays ticket + fee, the host's account gets
    // the ticket price (minus any balance being collected), and Sequins keeps
    // the service fee.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      application_fee_amount: feeCents + owedCollectCents,
      transfer_data: {
        destination: payoutAccount.stripe_account_id,
      },
      metadata: {
        event_id: eventId,
        event_title: eventTitle ?? '',
        user_id: userId,
        host_id: event.host_id,
        ticket_price_cents: String(priceCents),
        platform_fee_percent: String(tier.percent),
        platform_fee_amount: String(feeCents),
        fee_tier: tier.name,
        fee_model: '2026-10',
        occurrence_start: occurrenceStart ?? '',
        owed_collected_cents: String(owedCollectCents),
      },
    });

    if (owedCollectCents > 0) {
      await supabaseAdmin.from('host_charge_collections').insert({
        host_id: event.host_id,
        payment_intent_id: paymentIntent.id,
        amount: owedCollectCents / 100,
        status: 'pending',
      });
    }

    return json({
      ...breakdown,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    console.error('create-payment-intent error:', err);
    return json({ error: err instanceof Error ? err.message : 'Internal server error' }, 500);
  }
});
