-- 2026-10-06 launch hardening (gap audit items 2, 3, 5)

-- ── 2. Only the server can turn on promotion ────────────────────────────────
-- Before this, owners could set is_promoted / promoted_until on their own
-- events and performer profiles straight through the API and skip the paid
-- boost. Now app users (authenticated / anon) can't change those columns at
-- all: changes are silently kept at their old values, so old app builds don't
-- error. Promotions are applied by the stripe-connect-webhook
-- (payment_intent.succeeded) and the confirm-promotion edge function, both of
-- which run as service_role. Claude/SQL editor (postgres) can still comp.
create or replace function public.guard_promotion_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.is_promoted := false;
      new.promoted_until := null;
      new.promotion_payment_intent_id := null;
    else
      new.is_promoted := old.is_promoted;
      new.promoted_until := old.promoted_until;
      new.promotion_payment_intent_id := old.promotion_payment_intent_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists events_guard_promotion on public.events;
create trigger events_guard_promotion
  before insert or update on public.events
  for each row execute function public.guard_promotion_columns();

drop trigger if exists performers_guard_promotion on public.performers;
create trigger performers_guard_promotion
  before insert or update on public.performers
  for each row execute function public.guard_promotion_columns();

-- ── 3. Capacity ─────────────────────────────────────────────────────────────
-- Capacity is per date for recurring shows (tickets.occurrence_start).
-- A ticket "holds a seat" while free, paid, pending or refund_requested.

create index if not exists tickets_event_occurrence_idx
  on public.tickets (event_id, occurrence_start);

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
    and payment_status in ('free', 'paid', 'pending', 'refund_requested');
$$;

-- Seats left for a show date; null when the host set no capacity.
-- Fans can't read other people's tickets (RLS), so the app asks this instead.
create or replace function public.event_seats_remaining(p_event_id text, p_occurrence timestamptz default null)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case when e.capacity is null then null
              else greatest(e.capacity - public.event_tickets_held(p_event_id, p_occurrence), 0) end
  from public.events e
  where e.id::text = p_event_id;
$$;

revoke all on function public.event_tickets_held(text, timestamptz) from public, anon, authenticated;
grant execute on function public.event_seats_remaining(text, timestamptz) to anon, authenticated;

-- Hard stop for FREE tickets once a show date is full. Paid tickets are gated
-- before the card is charged (create-payment-intent); they are not blocked here,
-- because refusing the row after the fan has paid would leave them charged with
-- no ticket. The row lock serializes inserts per event so two free claims can't
-- both take the last seat.
create or replace function public.tickets_enforce_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap integer;
begin
  if new.payment_status <> 'free' then
    return new;
  end if;
  select capacity into cap from public.events where id::text = new.event_id for update;
  if cap is null then
    return new;
  end if;
  if public.event_tickets_held(new.event_id, new.occurrence_start) >= cap then
    raise exception 'SOLD_OUT: This show is sold out.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.tickets_enforce_capacity() from public, anon, authenticated;

drop trigger if exists tickets_enforce_capacity on public.tickets;
create trigger tickets_enforce_capacity
  before insert on public.tickets
  for each row execute function public.tickets_enforce_capacity();

-- ── 5. Chargebacks ──────────────────────────────────────────────────────────
-- Written by stripe-connect-webhook on charge.dispute.* ; Sequins pays for
-- disputes on destination charges, so every one gets an email and a row here.
create table if not exists public.payment_disputes (
  id                 uuid primary key default gen_random_uuid(),
  stripe_dispute_id  text not null unique,
  stripe_charge_id   text,
  payment_intent_id  text,
  amount             numeric not null,
  currency           text not null default 'usd',
  reason             text,
  status             text not null,
  evidence_due_by    timestamptz,
  kind               text,          -- ticket / listing / tip / promotion / subscription / unknown
  related_id         text,          -- event_id, listing id, etc. from the PaymentIntent metadata
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
alter table public.payment_disputes enable row level security;
revoke all on public.payment_disputes from anon, authenticated;

-- Housekeeping from the security advisor
alter function public.events_guard_cancelled_at() set search_path = public;
