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

// In-app notification + best-effort Expo push. Never blocks the refund itself.
async function notify(userId: string | null | undefined, title: string, body: string, link: string) {
  if (!userId) return;
  try {
    await supabaseAdmin.from('notifications').insert({ user_id: userId, type: 'refund_update', title, body, link });
    const { data: tokens } = await supabaseAdmin.from('user_push_tokens').select('token').eq('user_id', userId);
    if (tokens?.length) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokens.map((t: { token: string }) => ({ to: t.token, title, body, data: { link }, sound: 'default' }))),
      });
    }
  } catch (e) {
    console.warn('process-refund notify failed:', e);
  }
}

const money = (n: unknown) => `$${Number(n ?? 0).toFixed(2)}`;
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
    let itemTitle = itemType === 'ticket' ? 'your event' : (item.title ?? 'your listing');

    if (itemType === 'ticket') {
      const { data: event } = await supabaseAdmin
        .from('events')
        .select('host_id, title, refund_window_days, all_sales_final, datetime_start')
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
      eventStart = item.occurrence_start ?? event.datetime_start; // the ticket's own date for recurring shows
      itemTitle = event.title ?? itemTitle;
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
      await notify(
        sellerId,
        'Refund requested',
        `A buyer asked for a refund on ${itemTitle} (${money(item.price)})${reason ? `: "${String(reason).slice(0, 120)}"` : ''}.`,
        itemType === 'ticket' ? `/event/${item.event_id}/refunds` : '/marketplace/seller-refunds',
      );
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
      await notify(buyerId, 'Refund declined', `The ${itemType === 'ticket' ? 'host' : 'seller'} declined your refund request for ${itemTitle}.`, itemType === 'ticket' ? '/(tabs)/tickets' : '/(tabs)/profile');
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

    // The Sequins service fee is non-refundable (shown at checkout and in the
    // Terms). Refund the ticket/item price only, and pull exactly that amount
    // back from the host's or seller's payout account. Purchases made before
    // the Oct 2026 fee model stored the full charge as `price`, so they still
    // refund in full, as before.
    const pi = await stripe.paymentIntents.retrieve(item.stripe_payment_intent_id, {
      expand: ['latest_charge'],
    });
    const charge = pi.latest_charge as Stripe.Charge | null;
    const priceCents = Math.round(Number(item.price ?? 0) * 100);
    const refundableCents = charge ? charge.amount - charge.amount_refunded : priceCents;
    const refundCents = Math.min(priceCents, refundableCents);
    const feeKept = pi.metadata?.fee_model === '2026-10';
    const keptFeeCents = feeKept ? Number(pi.metadata?.platform_fee_amount ?? 0) : 0;

    if (refundCents <= 0) {
      return new Response(JSON.stringify({ error: 'Nothing left to refund on this purchase.' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Take the money back from the connected account first. If that fails
    // (for example, their balance is too low), stop before refunding the buyer.
    const transferId = typeof charge?.transfer === 'string' ? charge.transfer : charge?.transfer?.id;
    if (transferId) {
      const transfer = await stripe.transfers.retrieve(transferId);
      const reverseCents = Math.min(refundCents, transfer.amount - transfer.amount_reversed);
      if (reverseCents > 0) {
        await stripe.transfers.createReversal(transferId, {
          amount: reverseCents,
          metadata: { item_type: itemType, item_id: itemId },
        });
      }
    }

    const refund = await stripe.refunds.create({
      payment_intent: item.stripe_payment_intent_id,
      amount: refundCents,
      metadata: { item_type: itemType, item_id: itemId, service_fee_kept_cents: String(keptFeeCents) },
    });

    // Part of this sale went toward a balance the host owed. Since the fan got
    // that money back, the balance is owed again.
    const collectedFromSale = Number(pi.metadata?.owed_collected_cents ?? 0);
    if (collectedFromSale > 0) {
      await supabaseAdmin.from('host_charges').insert({
        host_id: sellerId,
        reason: 'collected_sale_refunded',
        amount: collectedFromSale / 100,
        status: 'owed',
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from(table)
      .update({
        payment_status: 'refunded',
        stripe_refund_id: refund.id,
      })
      .eq('id', itemId);

    if (updateError) throw updateError;
    await notify(buyerId, 'Refund approved', `Your ${money(refundCents / 100)} refund for ${itemTitle} is on its way. It usually lands in 5–10 business days.${keptFeeCents > 0 ? ` The ${money(keptFeeCents / 100)} Sequins service fee isn’t refundable.` : ''}`, itemType === 'ticket' ? '/(tabs)/tickets' : '/(tabs)/profile');

    return new Response(JSON.stringify({ status: 'refunded', refundId: refund.id, refundAmount: refundCents / 100, serviceFeeKept: keptFeeCents / 100 }), {
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
