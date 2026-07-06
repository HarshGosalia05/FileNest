
-- files metadata table
CREATE TABLE public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_name text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.files TO authenticated;
GRANT ALL ON public.files TO service_role;

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own files" ON public.files
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own files" ON public.files
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own files" ON public.files
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own files" ON public.files
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON public.files
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX files_user_id_uploaded_at_idx ON public.files (user_id, uploaded_at DESC);

-- storage.objects policies for the filenest-files bucket, scoped by user id folder
CREATE POLICY "Users can read own filenest files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'filenest-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own filenest files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'filenest-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own filenest files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'filenest-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own filenest files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'filenest-files' AND auth.uid()::text = (storage.foldername(name))[1]);
