-- Delete permissions for Class Resources.
--
-- Class Resources stay publicly viewable (anon + authenticated SELECT), but only the
-- uploader of a record may remove it. Enforcement lives here, not in the UI: the client
-- holds only the publishable anon key, so every path (including a hand-crafted REST call)
-- is subject to these policies.
--
-- This mirrors the existing "My Files" model:
--   public.files        -> 20260706145124_...sql:26-27, 52-54
--   public.class_resources -> 20260706152507_...sql:16, 20260706165421_...sql:2-7

-- ---------------------------------------------------------------------------
-- Table: public.class_resources
-- ---------------------------------------------------------------------------

-- DELETE was never granted to `authenticated`, so the table was append-only.
GRANT DELETE ON public.class_resources TO authenticated;

-- `anon` is intentionally not granted DELETE. It only holds SELECT, so an
-- unauthenticated caller has no privilege to reach the policy below at all.
REVOKE DELETE ON public.class_resources FROM anon;

-- Ownership check: `uploaded_by` is set to the caller's own uid on INSERT (enforced by
-- the existing "Authenticated users can add class resources" policy), and is
-- ON DELETE SET NULL, so an orphaned row can never match a non-null auth.uid() and is
-- therefore undeletable by anyone. That is the intended fail-closed behaviour.
CREATE POLICY "Users delete own class resources"
  ON public.class_resources
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND auth.uid() = uploaded_by);

-- Ownership lookups are not indexed yet. The table has no indexes at all, and the
-- frontend filters the public list by uploader to decide button visibility.
CREATE INDEX IF NOT EXISTS class_resources_uploaded_by_idx
  ON public.class_resources (uploaded_by);

-- ---------------------------------------------------------------------------
-- Storage: bucket 'class-resources'
-- ---------------------------------------------------------------------------

-- Uploads are written as "<auth uid>/<timestamp>-<name>" (see
-- src/components/class-resource-upload.tsx), so scoping by the first path segment keeps
-- the storage policy in lockstep with the row policy above. Without this policy the
-- storage object would outlive the database row.
CREATE POLICY "Users can delete own class resources"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'class-resources'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
