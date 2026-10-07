import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@16';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Called by the app right after the boost payment sheet reports success.
// The app can no longer set is_promoted / promoted_until itself (see the
// guard_promotion_columns trigger, migration 20261006), so this function
// checks the payment with Stripe and applies the boost as service_role.
// stripe-connect-webhook (payment_intent.succeeded) applies the same boost
// as a backup, e.g. for old app builds; applying twice is a no-op.

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-06-20' });
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export async function applyPromotion(pi: Stripe.PaymentIntent) {
  const m = pi.metadata ?? {};
  if (m.type !== 'promotion') throw new Error('Not a promotion payment.');
  const table = m.target_type === 'event' ? 'events' : m.target_type === 'performer' ? 'performers' : null;
  if (!table || !m.target_id) throw new Error('Promotion payment is missing its target.');
  const days = Number(m.promotion_days ?? '7') || 7;

  const { data: row, error } = await admin
    .from(table)
    .select('id, promoted_until, promotion_payment_intent_id')
    .eq('id', m.target_id)
    .maybeSingle();
  if (error || !row) throw new Error('Promoted item not found.');
  if (row.promotion_payment_intent_id === pi.id) return row; // already applied

  // Stack on top of time already left (e.g. a founding member's free feature).
  const base = Math.max(Date.now(), row.promoted_until ? new Date(row.promoted_until).getTime() : 0);
  const promotedUntil = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
  const { data: updated, error: upErr } = await admin
    .from(table)
    .update({ is_promoted: true, promoted_until: promotedUntil, promotion_payment_intent_id: pi.id })
    .eq('id', m.target_id)
    .select()
    .single();
  if (upErr) throw new Error(upErr.message);
  return updated;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: auth } = await admin.auth.getUser(jwt);
    const userId = auth?.user?.id;
    if (!userId) return json({ error: 'Please sign in again.' }, 401);

    const { paymentIntentId } = await req.json();
    if (!paymentIntentId || typeof paymentIntentId !== 'string') return json({ error: 'paymentIntentId is required.' }, 400);

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.metadata?.type !== 'promotion') return json({ error: 'Not a promotion payment.' }, 400);
    if (pi.metadata?.user_id !== userId) return json({ error: 'This payment belongs to a different account.' }, 403);
    if (pi.status !== 'succeeded') return json({ error: 'The payment has not gone through yet.' }, 409);

    const row = await applyPromotion(pi);
    return json({ ok: true, row });
  } catch (err) {
    console.error('confirm-promotion error:', err);
    return json({ error: err instanceof Error ? err.message : 'Internal server error' }, 500);
  }
});
