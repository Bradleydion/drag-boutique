import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@16';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Handles Stripe webhooks for both Connect accounts (payouts) and platform
// subscriptions (Sequins Pro). Called directly by Stripe (not by the app),
// so it is deployed with verify_jwt=false and instead authenticates the
// request via Stripe's own signature scheme.
//
// Setup (Stripe Dashboard -> Developers -> Workbench -> Webhooks). Two event
// destinations, same endpoint URL
// https://vrlsphktnvxrbuwwuvpk.supabase.co/functions/v1/stripe-connect-webhook :
//   1. "Your account": customer.subscription.created/updated/deleted
//      -> signing secret in Supabase secret STRIPE_CONNECT_WEBHOOK_SECRET
//   2. "Connected accounts": account.updated (hosts'/performers' Express
//      onboarding status) -> signing secret in STRIPE_CONNECTED_ACCOUNTS_WEBHOOK_SECRET
// A "Your account" destination never receives connected accounts' events, which
// is why (2) must exist separately. Signing secrets are pasted in by Bradley,
// never entered by an assistant.

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
});

// Stripe sends platform events (customer.subscription.*) and connected-account
// events (account.updated from hosts'/performers' Express accounts) through two
// SEPARATE event destinations, each with its own signing secret:
//   - "Your account" destination       -> STRIPE_CONNECT_WEBHOOK_SECRET
//   - "Connected accounts" destination -> STRIPE_CONNECTED_ACCOUNTS_WEBHOOK_SECRET
// Both point at this same function; a request is accepted if it verifies
// against either secret.
const webhookSecrets = [
  Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET'),
  Deno.env.get('STRIPE_CONNECTED_ACCOUNTS_WEBHOOK_SECRET'),
].filter((s): s is string => !!s);

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
    if (webhookSecrets.length === 0) throw new Error('No Stripe webhook signing secret is configured');
    let verified: Stripe.Event | null = null;
    let lastErr: unknown = null;
    for (const secret of webhookSecrets) {
      try {
        verified = await stripe.webhooks.constructEventAsync(body, signature, secret);
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!verified) throw lastErr ?? new Error('Signature verification failed');
    event = verified;
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
