-- Applied to the live project 2026-10-13 (migrations iap_revenuecat_pro_and_boosts
-- + iap_boost_redemptions_user_nullable).
alter table public.subscriptions
  add column if not exists store text check (store in ('app_store','play_store')),
  add column if not exists store_product_id text;

create or replace function public.has_active_pro(p_user_id uuid)
 returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select exists (
    select 1 from subscriptions s
    where s.user_id = p_user_id and s.tier = 'pro' and s.status in ('active', 'trialing')
      and (case
        when s.stripe_subscription_id is null and s.store is null
          then s.current_period_end is not null and s.current_period_end > now()
        else s.current_period_end is null or s.current_period_end + interval '3 days' > now()
      end)
  );
$function$;

create table if not exists public.iap_boost_redemptions (
  store_transaction_id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  store text not null,
  product_id text not null,
  target_type text not null check (target_type in ('event','performer')),
  target_id text not null,
  created_at timestamptz not null default now()
);
alter table public.iap_boost_redemptions enable row level security;
