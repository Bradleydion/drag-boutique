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

type ItemType = 'ticket' | 'listing';
type Action = 'request' | 'approve' | 'deny';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const { itemType, itemId, action, reason } = await req.json() as {
      itemType: ItemType; itemId: string; action: Action; reason?: string;
    };

    if (!itemType || !['ticket', 'listing'].includes(itemType)) {
      return new Response(JSON.stringify({ error: 'itemType must be \'ticket\' or \'listing\'' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    if (!itemId || !action || !['request', 'approve', 'deny'].includes(action)) {
      return new Response(JSON.stringify({ error: 'itemId and a valid action are required' }), {
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

    const table = itemType === 'ticket' ? 'tickets' : 'listings';

    const { data: item, error: itemError } = await supabaseAdmin
      .from(table)
      .select('*')
      .eq('id', itemId)
      .maybeSingle();

    if (itemError || !item) {
      return new Response(JSON.stringify({ error: `${itemType} not found.` }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const buyerId = itemType === 'ticket' ? item.user_id : item.buyer_id;

    // For tickets, the "seller" whose approval is needed is the event's host.
    // For listings, it's the listing's own seller.
    let sellerId: string;
    let policyWindowDays: number | null = null;
    let policyAllSalesFinal = false;
    let eventStart: string | null = null;

    if (itemType === 'ticket') {
      const { data: event } = await supabaseAdmin
        .from('events')
        .select('host_id, refund_window_days, all_sales_final, datetime_start')
        .eq('id', item.event_id)
        .maybeSingle();
      if (!event) {
        return new Response(JSON.stringify({ error: 'Event not found for this ticket.' }), {
          status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      sellerId = event.host_id;
      policyWindowDays = event.refund_window_days;
      policyAllSalesFinal = !!event.all_sales_final;
      eventStart = event.datetime_start;
    } else {
      sellerId = item.seller_id;
      policyWindowDays = item.refund_window_days;
      policyAllSalesFinal = !!item.all_sales_final;
    }

    if (action === 'request') {
      if (userId !== buyerId) {
        return new Response(JSON.stringify({ error: 'Only the buyer can request a refund for this purchase.' }), {
          status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      if (item.payment_status !== 'paid') {
        return new Response(JSON.stringify({ error: `This ${itemType} isn’t eligible for a refund request (status: ${item.payment_status}).` }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      if (policyAllSalesFinal) {
        return new Response(JSON.stringify({ error: 'The seller has marked this as All Sales Final — refunds aren’t offered for this purchase.' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      // Ticket-specific window check: refund_window_days counts back from the event start.
      if (itemType === 'ticket' && policyWindowDays != null && eventStart) {
        const deadline = new Date(eventStart);
        deadline.setDate(deadline.getDate() - policyWindowDays);
        if (new Date() > deadline) {
          return new Response(JSON.stringify({ error: 'The refund window for this event has closed.' }), {
            status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
          });
        }
      }
      // Listing-specific window check: refund_window_days counts forward from purchase.
      if (itemType === 'listing' && policyWindowDays != null && item.purchased_at) {
        const deadline = new Date(item.purchased_at);
        deadline.setDate(deadline.getDate() + policyWindowDays);
        if (new Date() > deadline) {
          return new Response(JSON.stringify({ error: 'The refund window for this purchase has closed.' }), {
            status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
          });
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from(table)
        .update({
          payment_status: 'refund_requested',
          refund_reason: reason ?? null,
          refund_requested_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (updateError) throw updateError;
      return new Response(JSON.stringify({ status: 'refund_requested' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // approve / deny require the seller/host
    if (userId !== sellerId) {
      return new Response(JSON.stringify({ error: 'Only the seller or host can approve or deny a refund.' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    if (item.payment_status !== 'refund_requested') {
      return new Response(JSON.stringify({ error: 'This item doesn’t have a pending refund request.' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'deny') {
      const { error: updateError } = await supabaseAdmin
        .from(table)
        .update({ payment_status: 'paid' })
        .eq('id', itemId);
      if (updateError) throw updateError;
      return new Response(JSON.stringify({ status: 'denied' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // action === 'approve' -> actually refund via Stripe
    if (!item.stripe_payment_intent_id) {
      return new Response(JSON.stringify({ error: 'No payment on file to refund (this may have been a free item).' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const refund = await stripe.refunds.create({
      payment_intent: item.stripe_payment_intent_id,
      reverse_transfer: true, // pulls the funds back from the connected account too
    });

    const { error: updateError } = await supabaseAdmin
      .from(table)
      .update({
        payment_status: 'refunded',
        stripe_refund_id: refund.id,
      })
      .eq('id', itemId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ status: 'refunded', refundId: refund.id }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('process-refund error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
});
