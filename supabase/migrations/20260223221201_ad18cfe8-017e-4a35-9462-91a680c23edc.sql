-- Global clothing brands table (shared across all teams)
CREATE TABLE public.clothing_brands (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clothing_brands_name_unique UNIQUE (name)
);

ALTER TABLE public.clothing_brands ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can view brands (global autocomplete)
CREATE POLICY "Authenticated users can view brands"
  ON public.clothing_brands FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated user can insert new brands
CREATE POLICY "Authenticated users can insert brands"
  ON public.clothing_brands FOR INSERT
  TO authenticated
  WITH CHECK (true);