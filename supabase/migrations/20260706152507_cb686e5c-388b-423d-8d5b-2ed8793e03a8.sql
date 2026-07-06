
-- Public Class Resources table
CREATE TABLE public.class_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  original_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.class_resources TO anon;
GRANT SELECT, INSERT ON public.class_resources TO authenticated;
GRANT ALL ON public.class_resources TO service_role;

ALTER TABLE public.class_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Class resources are viewable by everyone"
  ON public.class_resources FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add class resources"
  ON public.class_resources FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE TRIGGER update_class_resources_updated_at
  BEFORE UPDATE ON public.class_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for the class-resources bucket
CREATE POLICY "Class resources bucket is publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'class-resources');

CREATE POLICY "Authenticated users can upload class resources"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'class-resources');
