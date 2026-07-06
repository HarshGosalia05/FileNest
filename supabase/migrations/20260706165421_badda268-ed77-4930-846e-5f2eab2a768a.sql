DROP POLICY IF EXISTS "Authenticated users can upload class resources" ON storage.objects;
CREATE POLICY "Users can upload class resources under own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'class-resources'
  AND auth.uid()::text = (storage.foldername(name))[1]
);