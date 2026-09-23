-- Fix: enforce_event_tier_limits blocked ANY update to an existing weekly event
-- owned by a free-tier host (e.g. editing a typo or photo after a Pro downgrade,
-- or correcting seeded events). Now UPDATEs are only blocked when the host is
-- newly turning on / changing to a non-monthly recurring cadence.
CREATE OR REPLACE FUNCTION public.enforce_event_tier_limits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_is_pro boolean;
  v_count_this_month int;
begin
  select exists (
    select 1 from subscriptions
    where user_id = new.host_id::uuid
      and tier = 'pro'
      and status in ('active', 'trialing')
  ) into v_is_pro;

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
