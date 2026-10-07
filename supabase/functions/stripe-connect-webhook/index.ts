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
//   1. "Your account": customer.subscription.created/updated/deleted,
//      payment_intent.succeeded (boosts), charge.dispute.created/updated/closed
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

// ── Boosts (payment_intent.succeeded) ─────────────────────────────────────────
// Same logic as confirm-promotion. The app calls that function right after
// paying; this is the backup (old app builds, app closed mid-payment).
async function applyPromotion(pi: Stripe.PaymentIntent) {
  const m = pi.metadata ?? {};
  const table = m.target_type === 'event' ? 'events' : m.target_type === 'performer' ? 'performers' : null;
  if (!table || !m.target_id) return;
  const days = Number(m.promotion_days ?? '7') || 7;
  const { data: row } = await supabaseAdmin
    .from(table)
    .select('id, promoted_until, promotion_payment_intent_id')
    .eq('id', m.target_id)
    .maybeSingle();
  if (!row || row.promotion_payment_intent_id === pi.id) return;
  const base = Math.max(Date.now(), row.promoted_until ? new Date(row.promoted_until).getTime() : 0);
  const { error } = await supabaseAdmin
    .from(table)
    .update({
      is_promoted: true,
      promoted_until: new Date(base + days * 24 * 60 * 60 * 1000).toISOString(),
      promotion_payment_intent_id: pi.id,
    })
    .eq('id', m.target_id);
  if (error) console.error('Failed to apply promotion:', error);
}

// ── Chargebacks (charge.dispute.*) ────────────────────────────────────────────
function disputeKind(m: Record<string, string>): string {
  if (m.type === 'promotion') return 'promotion';
  if (m.event_id) return 'ticket';
  if (m.listing_id) return 'listing';
  if (m.performer_id || m.type === 'tip') return 'tip';
  return m.type || 'unknown';
}

async function recordDispute(dispute: Stripe.Dispute, isNew: boolean) {
  const piId = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id ?? null;
  let meta: Record<string, string> = {};
  if (piId) {
    try { meta = (await stripe.paymentIntents.retrieve(piId)).metadata ?? {}; } catch { /* ignore */ }
  }
  const kind = disputeKind(meta);
  const row = {
    stripe_dispute_id: dispute.id,
    stripe_charge_id: typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id ?? null,
    payment_intent_id: piId,
    amount: dispute.amount / 100,
    currency: dispute.currency,
    reason: dispute.reason,
    status: dispute.status,
    evidence_due_by: dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000).toISOString() : null,
    kind,
    related_id: meta.event_id || meta.listing_id || meta.target_id || meta.performer_id || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabaseAdmin.from('payment_disputes').upsert(row, { onConflict: 'stripe_dispute_id' });
  if (error) console.error('Failed to save dispute:', error);
  if (!isNew) return;

  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return;
  const to = Deno.env.get('MODERATION_EMAIL') ?? 'bradleydion@thebradleyproject.com';
  const text = [
    `A customer disputed a Sequins payment (chargeback). Sequins pays for disputes, so respond in Stripe before the deadline.`,
    ``,
    `Amount: $${(dispute.amount / 100).toFixed(2)} ${dispute.currency.toUpperCase()}`,
    `Reason: ${dispute.reason}`,
    `What it was for: ${kind}${meta.event_title ? ` (${meta.event_title})` : ''}`,
    `Evidence due: ${row.evidence_due_by ?? 'see Stripe'}`,
    `Payment: ${piId ?? 'unknown'}`,
    ``,
    `Open it: https://dashboard.stripe.com/disputes/${dispute.id}`,
  ].join('\n');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Sequins Payments <noreply@thebradleyproject.com>',
      to: [to],
      subject: `[Sequins] Payment disputed: $${(dispute.amount / 100).toFixed(2)}`,
      text,
    }),
  });
  if (!res.ok) console.error('Dispute email failed:', res.status, await res.text());
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

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.metadata?.type === 'promotion') await applyPromotion(pi);
    }

    if (
      event.type === 'charge.dispute.created' ||
      event.type === 'charge.dispute.updated' ||
      event.type === 'charge.dispute.closed'
    ) {
      await recordDispute(event.data.object as Stripe.Dispute, event.type === 'charge.dispute.created');
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('stripe-connect-webhook handling error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
});
