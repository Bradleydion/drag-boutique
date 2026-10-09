-- Audit item 1 (Oct 2026): paid tickets are created only by the server.
--
-- Before: the "buy ticket" RLS rule only checked user_id, so a signed-in user
-- could insert payment_status = 'paid' (or 'free' on a paid show) through the
-- API and get a valid QR code without paying.
--
-- After:
--   * App inserts (authenticated/anon) are rewritten by this trigger:
--       - free show  -> payment_status 'free', price 0, no Stripe fields
--       - paid show  -> payment_status 'pending' (NOT valid at the door);
--                       confirm-ticket / the Stripe webhook verify the payment
--                       and upgrade it to 'paid'. Old app builds keep working.
--   * App updates may only set checked_in_at (host / door staff check-in),
--     and only on a ticket that is free, paid or refund_requested.
--   * service_role (edge functions) and the SQL editor are not affected.
-- Named tickets_aa_* so it runs before tickets_block_cancelled_event and
-- tickets_enforce_capacity (BEFORE triggers fire in name order).

create or replace function public.tickets_guard_client_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ev_price numeric;
begin
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select coalesce(e.ticket_price, 0) into ev_price
    from public.events e where e.id::text = new.event_id;
    if not found then
      raise exception 'Event not found.';
    end if;

    new.purchased_at        := now();
    new.checked_in_at       := null;
    new.refund_requested_at := null;
    new.refund_reason       := null;
    new.stripe_refund_id    := null;

    if ev_price > 0 then
      new.payment_status := 'pending';
      new.price          := ev_price;
    else
      new.payment_status           := 'free';
      new.price                    := 0;
      new.stripe_payment_intent_id := null;
      new.platform_fee_percent     := null;
      new.platform_fee_amount      := null;
    end if;
    return new;
  end if;

  -- UPDATE from the app: check-in only. (user_id -> NULL is allowed: that's
  -- the ON DELETE SET NULL from account deletion via the old delete_user RPC.)
  if new.user_id is distinct from old.user_id and new.user_id is not null then
    raise exception 'Only check-in can be changed from the app.';
  end if;
  if (new.event_id, new.price, new.payment_status, new.stripe_payment_intent_id,
      new.refund_requested_at, new.refund_reason, new.stripe_refund_id,
      new.platform_fee_percent, new.platform_fee_amount, new.occurrence_start, new.purchased_at)
     is distinct from
     (old.event_id, old.price, old.payment_status, old.stripe_payment_intent_id,
      old.refund_requested_at, old.refund_reason, old.stripe_refund_id,
      old.platform_fee_percent, old.platform_fee_amount, old.occurrence_start, old.purchased_at) then
    raise exception 'Only check-in can be changed from the app.';
  end if;

  if new.checked_in_at is not null and old.checked_in_at is null
     and new.payment_status not in ('free', 'paid', 'refund_requested') then
    raise exception 'TICKET_NOT_VALID: This ticket isn''t paid.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists tickets_aa_guard_client_write on public.tickets;
create trigger tickets_aa_guard_client_write
  before insert or update on public.tickets
  for each row execute function public.tickets_guard_client_write();

-- Stale 'pending' rows (paid show, payment never finished) stop holding a
-- seat after 30 minutes.
create or replace function public.event_tickets_held(p_event_id text, p_occurrence timestamptz)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.tickets
  where event_id = p_event_id
    and occurrence_start is not distinct from p_occurrence
    and (payment_status in ('free', 'paid', 'refund_requested')
         or (payment_status = 'pending' and purchased_at > now() - interval '30 minutes'));
$$;
