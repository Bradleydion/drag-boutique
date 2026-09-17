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

// Volume-based sliding scale for Sequins' ticket-sale service fee: starts at
// 7%, floors at 4%, based on how many shows the host has posted on Sequins.
// NOTE: exact thresholds are a placeholder pending final numbers from the
// founder -- this function is the single source of truth, easy to retune.
function ticketFeePercent(showsPosted: number): number {
  if (showsPosted >= 31) return 0.04;
  if (showsPosted >= 16) return 0.05;
  if (showsPosted >= 6)  return 0.06;
  return 0.07;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const { amount, eventId, eventTitle } = await req.json();

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'amount must be a positive number (in dollars)' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }
    if (!eventId || typeof eventId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'eventId is required' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    // Extract user ID from the verified JWT so we can tag the PaymentIntent
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    let userId = 'unknown';
    try {
      // JWT payload is base64url-encoded JSON — decode without verification
      // (Supabase already verified the JWT before reaching this function)
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      userId = payload.sub ?? 'unknown';
    } catch { /* ignore */ }

    // Look up the event's host and their Stripe Connect payout account —
    // paid tickets are a destination charge that splits the sale between
    // Sequins' service fee and the host's connected account.
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, host_id')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: 'Event not found.' }),
        { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const { data: payoutAccount } = await supabaseAdmin
      .from('payout_accounts')
      .select('stripe_account_id, payouts_enabled')
      .eq('user_id', event.host_id)
      .maybeSingle();

    if (!payoutAccount?.stripe_account_id || !payoutAccount.payouts_enabled) {
      return new Response(
        JSON.stringify({
          error: 'This host hasn’t finished setting up payouts yet, so ticket sales are paused for this event.',
        }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    // Fee tier is based on how many shows this host has posted, all-time.
    const { count: showsPosted } = await supabaseAdmin
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('host_id', event.host_id);

    const feePercent = ticketFeePercent(showsPosted ?? 0);
    const amountCents = Math.round(amount * 100); // dollars -> cents
    const applicationFeeAmount = Math.round(amountCents * feePercent);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: payoutAccount.stripe_account_id,
      },
      metadata: {
        event_id: eventId ?? '',
        event_title: eventTitle ?? '',
        user_id: userId,
        host_id: event.host_id,
        platform_fee_percent: String(feePercent),
        platform_fee_amount: String(applicationFeeAmount),
      },
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        platformFeePercent: feePercent,
        platformFeeAmount: applicationFeeAmount / 100,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('create-payment-intent error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
});
