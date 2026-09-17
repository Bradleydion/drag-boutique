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

// Tips are the one payment type Sequins takes ZERO service fee on -- 100% of
// the tip amount is transferred to the performer's connected Stripe account.
// (Stripe's own processing fee is still deducted from Sequins' platform
// balance on a destination charge with no application_fee_amount, which is
// the intended behavior here: Sequins absorbs that cost rather than the
// performer.)
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const { amount, performerId, performerUserId, performerName } = await req.json();

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'amount must be a positive number (in dollars)' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }
    if (!performerUserId || typeof performerUserId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'performerUserId is required' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    let userId = 'unknown';
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      userId = payload.sub ?? 'unknown';
    } catch { /* ignore */ }

    if (userId === performerUserId) {
      return new Response(JSON.stringify({ error: 'You can’t tip yourself.' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { data: payoutAccount } = await supabaseAdmin
      .from('payout_accounts')
      .select('stripe_account_id, payouts_enabled')
      .eq('user_id', performerUserId)
      .maybeSingle();

    if (!payoutAccount?.stripe_account_id || !payoutAccount.payouts_enabled) {
      return new Response(
        JSON.stringify({
          error: 'This performer hasn’t set up Stripe payouts yet, so in-app tipping isn’t available for them.',
        }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const amountCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      // No application_fee_amount -- tips are never subject to a Sequins fee.
      transfer_data: {
        destination: payoutAccount.stripe_account_id,
      },
      metadata: {
        type: 'tip',
        performer_id: performerId ?? '',
        performer_name: performerName ?? '',
        performer_user_id: performerUserId,
        tipper_id: userId,
      },
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('create-tip-intent error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
});
