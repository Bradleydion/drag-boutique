-- Sequins Pro now respects current_period_end.
-- Before: the tier check only looked at status, so a comped (free) Pro year
-- for a founding member would never end.
--
-- Rules:
--   * Comps (no stripe_subscription_id): Pro only until current_period_end.
--     A comp with no end date is NOT Pro -- always set an end date.
--   * Paid Stripe subscriptions: Pro until current_period_end + 3 days grace
--     (covers a late renewal webhook). No end date = trust status.

create or replace function public.has_active_pro(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from subscriptions s
    where s.user_id = p_user_id
      and s.tier = 'pro'
      and s.status in ('active', 'trialing')
      and (
        case
          when s.stripe_subscription_id is null
            then s.current_period_end is not null and s.current_period_end > now()
          else s.current_period_end is null
            or s.current_period_end + interval '3 days' > now()
        end
      )
  );
$$;

revoke all on function public.has_active_pro(uuid) from public, anon;
grant execute on function public.has_active_pro(uuid) to authenticated, service_role;

create or replace function public.enforce_event_tier_limits()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_is_pro boolean;
  v_count_this_month int;
begin
  -- Seed/placeholder hosts (e.g. 'seed-data-placeholder') are not real users; skip tier checks.
  if new.host_id is null or new.host_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return new;
  end if;

  v_is_pro := public.has_active_pro(new.host_id::uuid);

  if not v_is_pro then
    if TG_OP = 'INSERT' then
      select count(*) into v_count_this_month
      from events
      where host_id = new.host_id
        and date_trunc('month', created_at) = date_trunc('month', now());

      if v_count_this_month >= 1 then
        raise exception 'FREE_TIER_EVENT_LIMIT: Free plan is limited to 1 new event per month. Upgrade to Sequins Pro for unlimited events.';
      end if;
    end if;

    if new.is_recurring and new.recurring_frequency is not null and new.recurring_frequency <> 'monthly'
       and (TG_OP = 'INSERT'
            or old.is_recurring is distinct from new.is_recurring
            or old.recurring_frequency is distinct from new.recurring_frequency) then
      raise exception 'FREE_TIER_RECURRING_LIMIT: Free plan only supports monthly recurring shows. Upgrade to Sequins Pro for weekly recurring shows.';
    end if;
  end if;

  return new;
end;
$function$;
