import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Keeps Sequins Pro in step with purchases made through Apple / Google
// (via RevenueCat). Two callers:
//   1. The app, right after a purchase or "Restore Purchases"
//      (Authorization: the user's Supabase session token).
//   2. RevenueCat's webhook on renewals, cancellations, expirations, etc.
//      (Authorization: the shared REVENUECAT_WEBHOOK_AUTH value set in the
//      RevenueCat dashboard).
// Either way we re-read the customer from RevenueCat's API (never trust the
// request body for who is Pro) and write the result to `subscriptions`.
// verify_jwt is OFF because the webhook doesn't send a Supabase token; the
// app path checks the token itself below.

const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const RC_SECRET = Deno.env.get('REVENUECAT_SECRET_KEY') ?? '';
const WEBHOOK_AUTH = Deno.env.get('REVENUECAT_WEBHOOK_AUTH') ?? '';
const ENTITLEMENT = 'pro';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function fetchSubscriber(appUserId: string) {
  if (!RC_SECRET) throw new Error('Purchases aren’t set up on the server yet (missing REVENUECAT_SECRET_KEY).');
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${RC_SECRET}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`RevenueCat lookup failed (${res.status}).`);
  const body = await res.json();
  return body.subscriber ?? {};
}

async function syncPro(userId: string) {
  const sub = await fetchSubscriber(userId);
  const ent = sub.entitlements?.[ENTITLEMENT];
  const expires = ent?.expires_date ? new Date(ent.expires_date) : null;
  const active = !!ent && (!expires || expires.getTime() > Date.now());
  const productId: string | null = ent?.product_identifier ?? null;
  const rcStore = productId ? sub.subscriptions?.[productId]?.store : null;
  const store = rcStore === 'app_store' || rcStore === 'play_store' ? rcStore : null;

  const { data: existing } = await admin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  // A live Stripe subscription wins; don't touch it.
  if (existing?.stripe_subscription_id && ['active', 'trialing', 'past_due'].includes(existing.status)) {
    return { pro: true, source: 'stripe', currentPeriodEnd: existing.current_period_end };
  }

  if (active) {
    // A founding-member comp that runs longer than the store period stays as is.
    const compEnd = existing && !existing.stripe_subscription_id && !existing.store && existing.tier === 'pro'
      ? (existing.current_period_end ? new Date(existing.current_period_end).getTime() : 0)
      : 0;
    if (compEnd && expires && compEnd > expires.getTime()) {
      return { pro: true, source: 'comp', currentPeriodEnd: existing!.current_period_end };
    }
    const row = {
      user_id: userId,
      tier: 'pro',
      status: 'active',
      current_period_end: expires ? expires.toISOString() : null,
      store,
      store_product_id: productId,
      updated_at: new Date().toISOString(),
    };
    const { error } = await admin.from('subscriptions').upsert(row, { onConflict: 'user_id' });
    if (error) throw new Error(error.message);
    return { pro: true, source: store, currentPeriodEnd: row.current_period_end };
  }

  // Not active in RevenueCat. Only downgrade rows that came from a store.
  if (existing?.store) {
    const { error } = await admin
      .from('subscriptions')
      .update({ tier: 'free', status: 'expired', current_period_end: expires ? expires.toISOString() : existing.current_period_end, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  }
  return { pro: false, source: existing?.store ?? null, currentPeriodEnd: null };
}

const isUuid = (s: unknown): s is string =>
  typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const auth = req.headers.get('Authorization') ?? '';

  try {
    // ── RevenueCat webhook ──────────────────────────────────────────────────
    if (WEBHOOK_AUTH && (auth === WEBHOOK_AUTH || auth === `Bearer ${WEBHOOK_AUTH}`)) {
      const body = await req.json().catch(() => ({}));
      const ev = body?.event ?? {};
      const ids = new Set<string>();
      for (const id of [ev.app_user_id, ev.original_app_user_id, ...(ev.transferred_to ?? []), ...(ev.transferred_from ?? [])]) {
        if (isUuid(id)) ids.add(id);
      }
      for (const id of ids) await syncPro(id);
      return json({ ok: true, synced: [...ids] });
    }

    // ── App: sync the signed-in user ────────────────────────────────────────
    const jwt = auth.replace('Bearer ', '');
    const { data: u } = await admin.auth.getUser(jwt);
    const userId = u?.user?.id;
    if (!userId) return json({ error: 'Please sign in again.' }, 401);

    const result = await syncPro(userId);
    return json({ ok: true, ...result });
  } catch (err) {
    console.error('revenuecat-sync error:', err);
    // 500 so RevenueCat retries the webhook.
    return json({ error: err instanceof Error ? err.message : 'Internal server error' }, 500);
  }
});
