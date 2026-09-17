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

// Creates (or reuses) a Stripe Express connected account for the calling
// user and returns a fresh onboarding link. Used for both hosts (ticket sale
// payouts) and performers (commission + tip payouts) -- the account type and
// flow are identical, only what it's used for downstream differs.
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const { returnUrl } = await req.json().catch(() => ({ returnUrl: undefined }));

    // Identify the calling user from the verified JWT (Supabase already
    // verified it before invoking this function since verify_jwt=true).
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

    // Reuse an existing connected account if we already made one for this user.
    const { data: existing } = await supabaseAdmin
      .from('payout_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    let accountId: string | undefined = existing?.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: userEmail,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { supabase_user_id: userId },
      });
      accountId = account.id;

      const { error: insertError } = await supabaseAdmin.from('payout_accounts').insert({
        user_id: userId,
        stripe_account_id: accountId,
      });
      if (insertError) throw insertError;
    }

    const fallbackReturnUrl = returnUrl ?? 'sequins://payouts/return';

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: fallbackReturnUrl,
      return_url: fallbackReturnUrl,
      type: 'account_onboarding',
    });

    return new Response(JSON.stringify({ url: accountLink.url, accountId }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-connect-account error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
});
