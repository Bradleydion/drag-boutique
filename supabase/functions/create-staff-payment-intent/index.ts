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

// Lets a host pay a staff member (DJ, door, MC, etc.) they booked for an
// event directly through Stripe, replacing the old Venmo deep link. Like
// tips, this is a zero-fee passthrough -- it's money the host already agreed
// to pay someone for work, so Sequins takes no cut and the host's card is
// simply charged and the full amount transferred to the staff member.
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const { inviteId } = await req.json();
    if (!inviteId || typeof inviteId !== 'string') {
      return new Response(JSON.stringify({ error: 'inviteId is required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
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
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('event_talent')
      .select('id, event_id, talent_id, pay_agreed, payment_status')
      .eq('id', inviteId)
      .maybeSingle();

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: 'Invite not found.' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    if (!invite.pay_agreed || invite.pay_agreed <= 0) {
      return new Response(JSON.stringify({ error: 'No pay was agreed upon for this invite.' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    if (invite.payment_status === 'paid') {
      return new Response(JSON.stringify({ error: 'This staff member has already been paid for this booking.' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('host_id, title')
      .eq('id', invite.event_id)
      .maybeSingle();

    if (eventError || !event) {
      return new Response(JSON.stringify({ error: 'Event not found.' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    if (event.host_id !== userId) {
      return new Response(JSON.stringify({ error: 'Only the host of this event can pay staff for it.' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { data: performer } = await supabaseAdmin
      .from('performers')
      .select('user_id, stage_name')
      .eq('id', invite.talent_id)
      .maybeSingle();

    if (!performer?.user_id) {
      return new Response(JSON.stringify({ error: 'Could not find this staff member’s account.' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { data: payoutAccount } = await supabaseAdmin
      .from('payout_accounts')
      .select('stripe_account_id, payouts_enabled')
      .eq('user_id', performer.user_id)
      .maybeSingle();

    if (!payoutAccount?.stripe_account_id || !payoutAccount.payouts_enabled) {
      return new Response(
        JSON.stringify({
          error: `${performer.stage_name ?? 'This staff member'} hasn’t set up Stripe payouts yet, so they can’t be paid in-app until they do.`,
        }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    // pay_agreed is stored in cents already.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: invite.pay_agreed,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      // No application_fee_amount -- staff pay is a zero-fee passthrough, same as tips.
      transfer_data: {
        destination: payoutAccount.stripe_account_id,
      },
      metadata: {
        type: 'staff_pay',
        invite_id: inviteId,
        event_id: invite.event_id,
        event_title: event.title ?? '',
        talent_id: invite.talent_id ?? '',
        host_id: userId,
      },
    });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('create-staff-payment-intent error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
});
