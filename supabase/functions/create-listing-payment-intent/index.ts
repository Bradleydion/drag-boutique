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

// Volume-based sliding scale for Sequins' commission/marketplace-sale service
// fee: starts at 7%, floors at 4%, based on how many listings this seller has
// already sold on Sequins. Mirrors the ticket-fee tiering in
// create-payment-intent (kept as a separate copy since edge functions can't
// share modules across deployments) -- same placeholder-thresholds caveat.
function saleFeePercent(itemsSold: number): number {
  if (itemsSold >= 31) return 0.04;
  if (itemsSold >= 16) return 0.05;
  if (itemsSold >= 6)  return 0.06;
  return 0.07;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const { listingId } = await req.json();
    if (!listingId || typeof listingId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'listingId is required' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    let buyerId: string | null = null;
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      buyerId = payload.sub ?? null;
    } catch { /* ignore */ }

    if (!buyerId) {
      return new Response(JSON.stringify({ error: 'Could not identify user from token.' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('id, seller_id, price, sold, type, title')
      .eq('id', listingId)
      .maybeSingle();

    if (listingError || !listing) {
      return new Response(JSON.stringify({ error: 'Listing not found.' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    if (listing.sold) {
      return new Response(JSON.stringify({ error: 'This listing has already sold.' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    if (listing.seller_id === buyerId) {
      return new Response(JSON.stringify({ error: 'You can’t buy your own listing.' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    if (!listing.price || Number(listing.price) <= 0) {
      return new Response(JSON.stringify({ error: 'This listing doesn’t have a fixed price to check out with yet.' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { data: payoutAccount } = await supabaseAdmin
      .from('payout_accounts')
      .select('stripe_account_id, payouts_enabled')
      .eq('user_id', listing.seller_id)
      .maybeSingle();

    if (!payoutAccount?.stripe_account_id || !payoutAccount.payouts_enabled) {
      return new Response(
        JSON.stringify({
          error: 'This seller hasn’t finished setting up payouts yet, so this listing can’t be purchased in-app just yet.',
        }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const { count: itemsSold } = await supabaseAdmin
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', listing.seller_id)
      .eq('sold', true);

    const feePercent = saleFeePercent(itemsSold ?? 0);
    const amountCents = Math.round(Number(listing.price) * 100);
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
        listing_id: listingId,
        listing_title: listing.title ?? '',
        listing_type: listing.type ?? '',
        buyer_id: buyerId,
        seller_id: listing.seller_id,
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
    console.error('create-listing-payment-intent error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
});
