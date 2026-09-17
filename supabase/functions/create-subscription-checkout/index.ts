import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@16';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Starts (or resumes) a Sequins Pro subscription for the calling host.
// Placeholder price: $9.99/mo -- Bradley hasn't set a final number yet, easy
// to change in one place (PRO_PRICE_USD_CENTS below). The underlying Stripe
// Product/Price is created once and cached in platform_settings so we never
// spam Stripe with duplicate Products.

const PRO_PRICE_USD_CENTS = 999; // $9.99/mo -- placeholder, confirm with Bradley

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

async function getOrCreateProPriceId(): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from('platform_settings')
    .select('value')
    .eq('key', 'stripe_pro_price_id')
    .maybeSingle();

  if (existing?.value) return existing.value;

  const product = await stripe.products.create({ name: 'Sequins Pro' });
  const price = await stripe.prices.create({
    product: product.id,
    currency: 'usd',
    unit_amount: PRO_PRICE_USD_CENTS,
    recurring: { interval: 'month' },
  });

  await supabaseAdmin.from('platform_settings').upsert({
    key: 'stripe_pro_price_id',
    value: price.id,
    updated_at: new Date().toISOString(),
  });

  return price.id;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    let userId: string | null = null;
    let userEmail: string | undefined;
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      userId = payload.sub ?? null;
      userEmail = payload.email;
    } catch { /* ignore */ }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Could not identify user from token.' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Already an active/trialing pro subscriber -- nothing to do.
    if (existingSub?.tier === 'pro' && ['active', 'trialing'].includes(existingSub.status)) {
      return new Response(JSON.stringify({ alreadyPro: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    let customerId = existingSub?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
    }

    const priceId = await getOrCreateProPriceId();

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { supabase_user_id: userId },
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

    await supabaseAdmin.from('subscriptions').upsert({
      user_id: userId,
      tier: 'free', // flips to 'pro' once the webhook confirms the first payment succeeded
      status: subscription.status,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        subscriptionId: subscription.id,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('create-subscription-checkout error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
});
