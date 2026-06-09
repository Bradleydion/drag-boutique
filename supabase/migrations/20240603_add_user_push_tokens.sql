-- Push tokens: one row per device per user
-- A user can have multiple devices; we upsert by (user_id, token) so duplicates are impossible.
create table if not exists public.user_push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  token       text not null,
  platform    text not null check (platform in ('ios', 'android', 'web', 'unknown')),
  updated_at  timestamptz not null default now(),
  unique (user_id, token)
);

-- RLS: users can only read/write their own tokens
alter table public.user_push_tokens enable row level security;

create policy "Users manage own push tokens"
  on public.user_push_tokens
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role (edge functions) can read all tokens to send pushes
create policy "Service role reads all push tokens"
  on public.user_push_tokens
  for select
  using (auth.role() = 'service_role');
