import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@16';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Host cancels a show, or one date of a recurring show.
//   action 'quote'   → what cancelling would cost, without changing anything
//   action 'confirm' → cancel the show, refund every fan in full (ticket price
//                      AND service fee), and charge the host the Stripe card
//                      processing fees on those sales, which Stripe doesn't
//                      give back on refunds. Sequins waives its own fee.
// Free shows: the show is marked cancelled and ticket holders are told. No
// money moves.
// Safe to run 'confirm' again: tickets already refunded are skipped.
// One date of a recurring show: pass occurrenceStart (the date's start time).
// Tickets bought before tickets carried a date have no occurrence_start; the
// app sends includeUndated=true when the date being cancelled is the next one,
// so those tickets are refunded with it.

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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// Stripe's standard US card pricing, used for the up-front estimate only.
// The real charge to the host uses the actual fee from each Stripe payment.
const estimateStripeFeeCents = (amountCents: number) =>
  amountCents > 0 ? Math.round(amountCents * 0.029) + 30 : 0;

const sameMoment = (a: string | Date, b: string | Date) =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 60_000;

type TicketRow = {
  id: string;
  occurrence_start: string | null;
  user_id: string;
  price: number | null;
  payment_status: string;
  stripe_payment_intent_id: string | null;
  platform_fee_percent: number | null;
  platform_fee_amount: number | null;
};

/** Service fee the buyer paid on top of the price (0 for pre-Oct-2026 tickets). */
function serviceFeeCents(t: TicketRow): number {
  const price = Number(t.price ?? 0);
  const fee = Number(t.platform_fee_amount ?? 0);
  if (!fee || price <= 0) return 0;
  const oldStyle = Math.round(price * Number(t.platform_fee_percent ?? 0) * 100) / 100;
  return fee > oldStyle + 0.004 ? Math.round(fee * 100) : 0;
}

async function notify(userId: string | null | undefined, title: string, body: string, link: string) {
  if (!userId) return;
  try {
    await supabaseAdmin.from('notifications').insert({ user_id: userId, type: 'event_cancelled', title, body, link });
    const { data: tokens } = await supabaseAdmin.from('user_push_tokens').select('token').eq('user_id', userId);
    if (tokens?.length) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokens.map((t: { token: string }) => ({ to: t.token, title, body, data: { link }, sound: 'default' }))),
      });
    }
  } catch (e) {
    console.warn('cancel-event notify failed:', e);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { eventId, action, reason, occurrenceStart, includeUndated } = await req.json() as {
      eventId?: string; action?: 'quote' | 'confirm'; reason?: string;
      occurrenceStart?: string; includeUndated?: boolean;
    };
    if (!eventId || (action !== 'quote' && action !== 'confirm')) {
      return json({ error: 'eventId and action (quote or confirm) are required.' }, 400);
    }

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    let userId: string | null = null;
    try { userId = JSON.parse(atob(jwt.split('.')[1])).sub ?? null; } catch { /* ignore */ }
    if (!userId) return json({ error: 'Please sign in again.' }, 401);

    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id, host_id, title, ticket_price, cancelled_at, cancelled_occurrences, is_recurring, timezone')
      .eq('id', eventId)
      .maybeSingle();
    if (!event) return json({ error: 'Event not found.' }, 404);
    if (event.host_id !== userId) return json({ error: 'Only this show’s host can cancel it.' }, 403);

    const { data: rows, error: ticketsError } = await supabaseAdmin
      .from('tickets')
      .select('id, user_id, occurrence_start, price, payment_status, stripe_payment_intent_id, platform_fee_percent, platform_fee_amount')
      .eq('event_id', String(eventId))
      .in('payment_status', ['paid', 'refund_requested', 'free']);
    if (ticketsError) throw ticketsError;

    const singleDate = !!occurrenceStart;
    const tickets = ((rows ?? []) as TicketRow[]).filter(t =>
      !singleDate
        ? true
        : t.occurrence_start
          ? sameMoment(t.occurrence_start, occurrenceStart!)
          : !!includeUndated,
    );
    const dateLabel = singleDate
      ? new Date(occurrenceStart!).toLocaleString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
          timeZone: event.timezone || 'America/Los_Angeles',
        })
      : null;
    const dateAlreadyCancelled = singleDate &&
      (event.cancelled_occurrences ?? []).some((c: string) => sameMoment(c, occurrenceStart!));
    const paid = tickets.filter(t => t.payment_status !== 'free' && t.stripe_payment_intent_id && Number(t.price ?? 0) > 0);
    const free = tickets.filter(t => !paid.includes(t));

    // ── Quote ────────────────────────────────────────────────────────────────
    let salesCents = 0, feesCents = 0, stripeEstCents = 0;
    for (const t of paid) {
      const priceCents = Math.round(Number(t.price) * 100);
      const feeCents = serviceFeeCents(t);
      salesCents += priceCents;
      feesCents += feeCents;
      stripeEstCents += estimateStripeFeeCents(priceCents + feeCents);
    }
    const quote = {
      eventTitle: event.title,
      alreadyCancelled: singleDate ? dateAlreadyCancelled || !!event.cancelled_at : !!event.cancelled_at,
      singleDate,
      dateLabel,
      isFreeShow: paid.length === 0,
      ticketHolders: tickets.length,
      paidTickets: paid.length,
      freeTickets: free.length,
      refundToFans: (salesCents + feesCents) / 100,  // everything fans paid
      ticketSalesReturned: salesCents / 100,          // comes back out of the host's payouts
      serviceFeesWaived: feesCents / 100,             // Sequins gives its fees back
      hostStripeFees: stripeEstCents / 100,           // what the host is charged (estimate)
      hostTotalCost: (salesCents + stripeEstCents) / 100,
    };
    if (action === 'quote') return json(quote);

    // ── Confirm ──────────────────────────────────────────────────────────────
    if (singleDate) {
      if (!dateAlreadyCancelled) {
        const { error: cancelError } = await supabaseAdmin
          .from('events')
          .update({ cancelled_occurrences: [...(event.cancelled_occurrences ?? []), new Date(occurrenceStart!).toISOString()] })
          .eq('id', eventId);
        if (cancelError) throw cancelError;
      }
    } else if (!event.cancelled_at) {
      const { error: cancelError } = await supabaseAdmin
        .from('events')
        .update({ cancelled_at: new Date().toISOString(), cancel_reason: reason?.trim() || null })
        .eq('id', eventId);
      if (cancelError) throw cancelError;
    }

    const showName = dateLabel ? `${event.title ?? 'Your show'} on ${dateLabel}` : (event.title ?? 'your show');
    const reasonLine = reason?.trim() ? ` The host said: "${reason.trim().slice(0, 140)}"` : '';

    let refundedCount = 0, refundedCents = 0, actualStripeFeeCents = 0, unrecoveredCents = 0, collectedAgainCents = 0;
    const failed: { ticketId: string; error: string }[] = [];

    for (const t of paid) {
      try {
        const pi = await stripe.paymentIntents.retrieve(t.stripe_payment_intent_id!, {
          expand: ['latest_charge.balance_transaction'],
        });
        const charge = pi.latest_charge as Stripe.Charge | null;
        if (!charge) throw new Error('No charge found for this payment.');
        const refundCents = charge.amount - charge.amount_refunded;
        if (refundCents <= 0) {
          // Already refunded in Stripe; just bring our record in line.
          await supabaseAdmin.from('tickets').update({ payment_status: 'refunded' }).eq('id', t.id);
          continue;
        }

        // Pull the ticket money back from the host's payout account. If that
        // fails (e.g. their balance is too low), the fan is refunded anyway
        // and the amount is added to what the host owes.
        const transferId = typeof charge.transfer === 'string' ? charge.transfer : charge.transfer?.id;
        if (transferId) {
          const transfer = await stripe.transfers.retrieve(transferId);
          const reverseCents = transfer.amount - transfer.amount_reversed;
          if (reverseCents > 0) {
            try {
              await stripe.transfers.createReversal(transferId, {
                amount: reverseCents,
                metadata: { reason: 'show_cancelled', event_id: String(eventId), ticket_id: t.id },
              });
            } catch (e) {
              console.warn('cancel-event reversal failed:', e);
              unrecoveredCents += reverseCents;
            }
          }
        }

        const refund = await stripe.refunds.create({
          payment_intent: t.stripe_payment_intent_id!,
          amount: refundCents,
          metadata: { reason: 'show_cancelled', event_id: String(eventId), ticket_id: t.id },
        });

        const bt = charge.balance_transaction as Stripe.BalanceTransaction | string | null;
        actualStripeFeeCents += bt && typeof bt !== 'string' ? bt.fee : estimateStripeFeeCents(charge.amount);
        refundedCount += 1;
        refundedCents += refundCents;

        await supabaseAdmin
          .from('tickets')
          .update({ payment_status: 'refunded', stripe_refund_id: refund.id, refund_reason: 'Show cancelled by host' })
          .eq('id', t.id);

        // Part of this sale had gone toward a balance the host owed; the fan
        // got it back, so it's owed again.
        const collectedFromSale = Number(pi.metadata?.owed_collected_cents ?? 0);
        if (collectedFromSale > 0) collectedAgainCents += collectedFromSale;

        await notify(
          t.user_id,
          'Show cancelled',
          `${showName} has been cancelled. You’ll get a full ${money(refundCents)} refund, service fee included. It usually lands in 5–10 business days.${reasonLine}`,
          '/(tabs)/tickets',
        );
      } catch (e) {
        console.error('cancel-event refund failed for ticket', t.id, e);
        failed.push({ ticketId: t.id, error: e instanceof Error ? e.message : 'Refund failed' });
      }
    }

    for (const t of free) {
      await notify(t.user_id, 'Show cancelled', `${showName} has been cancelled, so your free spot is no longer needed.${reasonLine}`, '/(tabs)/tickets');
    }

    // Charge the host the Stripe fees (plus any ticket money that couldn't be
    // pulled back from their payout).
    const owedCents = actualStripeFeeCents + unrecoveredCents + collectedAgainCents;
    let hostCharge: { amount: number; status: string } | null = null;
    if (owedCents > 0) {
      const { data: chargeRow } = await supabaseAdmin
        .from('host_charges')
        .insert({
          host_id: event.host_id,
          event_id: eventId,
          amount: owedCents / 100,
          stripe_fees: actualStripeFeeCents / 100,
          unrecovered_sales: (unrecoveredCents + collectedAgainCents) / 100,
          tickets_refunded: refundedCount,
          status: 'pending',
        })
        .select('id')
        .single();

      let status = 'owed';
      let transferIdOut: string | null = null;
      let errorText: string | null = null;
      try {
        const { data: payout } = await supabaseAdmin
          .from('payout_accounts')
          .select('stripe_account_id')
          .eq('user_id', event.host_id)
          .maybeSingle();
        if (!payout?.stripe_account_id) throw new Error('Host has no payout account.');
        // Account debit (docs.stripe.com/connect/account-debits): a charge with
        // the host's connected account as the source moves money from their
        // Stripe balance to Sequins. Stripe refuses it if it would take their
        // balance below zero; then the amount is collected from future sales.
        const debit = await stripe.charges.create({
          amount: owedCents,
          currency: 'usd',
          source: payout.stripe_account_id,
          description: `Card processing fees for cancelled show: ${showName}`,
          metadata: { reason: 'show_cancelled', event_id: String(eventId) },
        });
        status = 'collected';
        transferIdOut = debit.id;
      } catch (e) {
        errorText = e instanceof Error ? e.message : String(e);
        console.warn('cancel-event host debit failed, recorded as owed:', errorText);
      }

      if (chargeRow?.id) {
        await supabaseAdmin
          .from('host_charges')
          .update({ status, stripe_transfer_id: transferIdOut, error: errorText })
          .eq('id', chargeRow.id);
      }
      hostCharge = { amount: owedCents / 100, status };
    }

    return json({
      cancelled: true,
      refundedCount,
      refundedTotal: refundedCents / 100,
      freeHoldersNotified: free.length,
      failedCount: failed.length,
      failed,
      hostCharge,
    });
  } catch (err) {
    console.error('cancel-event error:', err);
    return json({ error: err instanceof Error ? err.message : 'Internal server error' }, 500);
  }
});
