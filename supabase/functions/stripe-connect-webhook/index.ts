import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@16';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Handles Stripe webhooks for both Connect accounts (payouts) and platform
// subscriptions (Sequins Pro). Called directly by Stripe (not by the app),
// so it is deployed with verify_jwt=false and instead authenticates the
// request via Stripe's own signature scheme.
//
// Setup required in the Stripe Dashboard (Bradley must do this manually --
// the webhook signing secret is a new secret that must be pasted in by hand,
// never entered by an assistant):
//   1. Go to Stripe Dashboard -> Developers -> Webhooks -> Add endpoint.
//   2. Endpoint URL: https://vrlsphktnvxrbuwwuvpk.supabase.co/functions/v1/stripe-connect-webhook
//   3. Events to send: account.updated, customer.subscription.created,
//      customer.subscription.updated, customer.subscription.deleted
//   4. Copy the generated "Signing secret" (starts with whsec_...).
//   5. Set it as a Supabase Edge Function secret named STRIPE_CONNECT_WEBHOOK_SECRET
//      (Supabase Dashboard -> Edge Functions -> Secrets, or `supabase secrets set`).
//   (If this endpoint is already set up from the payouts feature, just add
//   the three customer.subscription.* events to it -- no new secret needed.)

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
});

const webhookSecret = Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET') ?? '';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

function tierForStatus(status: string): 'pro' | 'free' {
  return status === 'active' || status === 'trialing' ? 'pro' : 'free';
}

Deno.serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error('Missing stripe-signature header');
    if (!webhookSecret) throw new Error('STRIPE_CONNECT_WEBHOOK_SECRET is not configured');
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('stripe-connect-webhook signature verification failed:', err);
    return new Response(
      `Webhook Error: ${err instanceof Error ? err.message : 'invalid signature'}`,
      { status: 400 },
    );
  }

  try {
    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account;
      const onboardingComplete = !!account.details_submitted && !!account.charges_enabled;

      const { error } = await supabaseAdmin
        .from('payout_accounts')
        .update({
          onboarding_complete: onboardingComplete,
          payouts_enabled: !!account.payouts_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_account_id', account.id);

      if (error) console.error('Failed to update payout_accounts:', error);
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const status = event.type === 'customer.subscription.deleted' ? 'canceled' : subscription.status;

      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          tier: tierForStatus(status),
          status,
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

      if (error) console.error('Failed to update subscriptions:', error);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('stripe-connect-webhook handling error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
});
