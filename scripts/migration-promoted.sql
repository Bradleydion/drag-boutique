-- ============================================================
-- Sequins — Promoted Events & Performers Migration
-- Run in Supabase Dashboard → SQL Editor
--
-- Adds is_promoted boolean to events and performers tables.
-- Promoted content gets visual treatment in the app:
--   • Events: gold border + "✦ Promoted" badge on event cards
--   • Performers: gold ring on avatar/card
-- ============================================================

-- Add to events table
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_promoted boolean NOT NULL DEFAULT false;

-- Add to performers table
ALTER TABLE public.performers
  ADD COLUMN IF NOT EXISTS is_promoted boolean NOT NULL DEFAULT false;

-- Index for fast promoted-first sorting in queries
CREATE INDEX IF NOT EXISTS events_promoted_idx    ON public.events    (is_promoted DESC, datetime_start ASC);
CREATE INDEX IF NOT EXISTS performers_promoted_idx ON public.performers (is_promoted DESC, stage_name ASC);

-- ─── Example: mark a few seed records as promoted ────────────────────────────
-- Uncomment and adjust IDs after running seed scripts.

-- UPDATE public.events    SET is_promoted = true WHERE title IN ('Friday Night Fabulosa', 'Friday Night at Neighbours', 'Friday Night Oasis');
-- UPDATE public.performers SET is_promoted = true WHERE id IN ('pdx-perf-001', 'sea-perf-001', 'sf-perf-001');
