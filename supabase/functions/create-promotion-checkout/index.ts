import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@16';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// One-time payment to boost an event or performer profile to the top of
// Discover for a fixed number of days. This is straight platform revenue --
// no transfer_data/destination, the charge just goes to Sequins' own Stripe
// balance (unlike ticket/marketplace/tip/staff-pay flows, which move money
// to a connected host/performer account).

const PROMOTION_PRICE_USD_CENTS = 499; // $4.99 -- placeholder, confirm with Bradley
const PROMOTION_DAYS = 7;

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const { targetType, targetId } = await req.json();
    if (targetType !== 'event' && targetType !== 'performer') {
      return new Response(JSON.stringify({ error: 'targetType must be "event" or "performer".' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    if (!targetId) {
      return new Response(JSON.stringify({ error: 'targetId is required.' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    let userId: string | null = null;
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      userId = payload.sub ?? null;
    } catch { /* ignore */ }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Could not identify user from token.' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Verify the caller actually owns the thing they're paying to promote.
    const table = targetType === 'event' ? 'events' : 'performers';
    const ownerColumn = targetType === 'event' ? 'host_id' : 'user_id';
    const { data: target, error: targetError } = await supabaseAdmin
      .from(table)
      .select(`id, ${ownerColumn}`)
      .eq('id', targetId)
      .maybeSingle();

    if (targetError || !target || (target as any)[ownerColumn] !== userId) {
      return new Response(JSON.stringify({ error: 'You do not own this ' + targetType + '.' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: PROMOTION_PRICE_USD_CENTS,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        type: 'promotion',
        target_type: targetType,
        target_id: targetId,
        user_id: userId,
        promotion_days: String(PROMOTION_DAYS),
      },
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        promotionDays: PROMOTION_DAYS,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('create-promotion-checkout error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
});
