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
// The BUYER pays the service fee on top of the item price; the seller receives
// 100% of the item price. Sequins pays Stripe's processing fee out of the
// service fee (destination charges bill Stripe fees to the platform).
//   fee = tier% of price + $0.50, never less than $0.99
//   tier is set by paid items the seller has sold this calendar month (UTC):
//     Opening Act 0-99 → 7% · Featured 100-249 → 6% · Headliner 250-499 → 5% · Icon 500+ → 4%
// Keep in sync with lib/feeTiers.ts and create-payment-intent.
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    // quoteOnly: return the price breakdown without creating a payment, so the
    // listing page can show the all-in total up front.
    const { listingId, quoteOnly } = await req.json();
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

    if (!buyerId && !quoteOnly) {
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
    if (!quoteOnly && listing.seller_id === buyerId) {
      return new Response(JSON.stringify({ error: 'You can’t buy your own listing.' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    if (!listing.price || Number(listing.price) <= 0) {
      return new Response(JSON.stringify({ error: 'This listing doesn’t have a fixed price to check out with yet.' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { count: soldThisMonth } = await supabaseAdmin
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', listing.seller_id)
      .eq('sold', true)
      .in('payment_status', ['paid', 'refund_requested'])
      .gte('purchased_at', monthStartUtc());

    const tier = tierFor(soldThisMonth ?? 0);
    const priceCents = Math.round(Number(listing.price) * 100);
    const feeCents = serviceFeeCents(priceCents, tier.percent);
    const totalCents = priceCents + feeCents;

    const breakdown = {
      itemPrice: priceCents / 100,
      serviceFee: feeCents / 100,
      total: totalCents / 100,
      platformFeePercent: tier.percent,
      platformFeeAmount: feeCents / 100,
      tierName: tier.name,
    };

    if (quoteOnly) return json(breakdown);

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

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      application_fee_amount: feeCents,
      transfer_data: {
        destination: payoutAccount.stripe_account_id,
      },
      metadata: {
        listing_id: listingId,
        listing_title: listing.title ?? '',
        listing_type: listing.type ?? '',
        buyer_id: buyerId,
        seller_id: listing.seller_id,
        item_price_cents: String(priceCents),
        platform_fee_percent: String(tier.percent),
        platform_fee_amount: String(feeCents),
        fee_tier: tier.name,
        fee_model: '2026-10',
      },
    });

    return new Response(
      JSON.stringify({
        ...breakdown,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
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
