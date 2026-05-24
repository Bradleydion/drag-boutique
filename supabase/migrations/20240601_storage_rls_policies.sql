-- ============================================================
-- Storage RLS policies for the performer-photos bucket
-- ============================================================
-- Run this once in your Supabase Dashboard:
--   Dashboard → SQL Editor → New query → paste → Run
--
-- Without these policies, photo uploads fail with:
--   "new row violates row level security policy"
-- ============================================================

-- Allow any authenticated user to upload performer photos
CREATE POLICY "Authenticated users can upload performer photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'performer-photos');

-- Allow anyone to read performer photos (the bucket is public)
CREATE POLICY "Public read access to performer photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'performer-photos');

-- Allow authenticated users to overwrite/update their own uploads
CREATE POLICY "Authenticated users can update performer photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'performer-photos');

-- Allow authenticated users to delete performer photos
CREATE POLICY "Authenticated users can delete performer photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'performer-photos');


-- ============================================================
-- Event image storage policies  (same pattern, different bucket)
-- ============================================================
-- If you have an "event-images" bucket, apply the same policies:

CREATE POLICY "Authenticated users can upload event images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-images');

CREATE POLICY "Public read access to event images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'event-images');

CREATE POLICY "Authenticated users can update event images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'event-images');

CREATE POLICY "Authenticated users can delete event images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'event-images');
