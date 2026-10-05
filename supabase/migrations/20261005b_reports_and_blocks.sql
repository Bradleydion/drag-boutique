-- Report & block (App Store Guideline 1.2: apps with user-generated content
-- must let users report objectionable content and block abusive users, and the
-- developer must act on reports within 24 hours).

-- Reports ---------------------------------------------------------------------
create table if not exists public.content_reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid not null references auth.users(id) on delete cascade,
  target_type     text not null check (target_type in ('performer', 'event', 'listing', 'user')),
  target_id       text not null,
  target_owner_id uuid,               -- the account that posted it, when known
  target_label    text,               -- name/title at the time of the report, for the moderator email
  reason          text not null check (reason in ('spam', 'harassment', 'hate', 'sexual', 'violence', 'impersonation', 'scam', 'other')),
  details         text check (char_length(details) <= 1000),
  status          text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  notified_at     timestamptz,        -- set when the moderator email went out
  resolved_at     timestamptz,
  moderator_note  text,
  created_at      timestamptz not null default now()
);

create index if not exists content_reports_open_idx on public.content_reports (status, created_at) where status = 'open';
create index if not exists content_reports_reporter_idx on public.content_reports (reporter_id);

alter table public.content_reports enable row level security;

-- Reporters can see their own reports (the app hides what you reported).
-- Inserts go through the report-content edge function (service role), which
-- validates, rate-limits, and emails the moderator.
create policy "reporters read own reports" on public.content_reports
  for select to authenticated using (reporter_id = auth.uid());

-- Blocks ----------------------------------------------------------------------
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

create policy "users read own blocks" on public.user_blocks
  for select to authenticated using (blocker_id = auth.uid());

create policy "users add own blocks" on public.user_blocks
  for insert to authenticated with check (blocker_id = auth.uid());

create policy "users remove own blocks" on public.user_blocks
  for delete to authenticated using (blocker_id = auth.uid());
