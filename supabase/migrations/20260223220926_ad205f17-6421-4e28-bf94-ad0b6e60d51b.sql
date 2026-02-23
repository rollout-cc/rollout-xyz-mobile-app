ALTER TABLE public.artist_travel_info
  ADD COLUMN IF NOT EXISTS pro_name text,
  ADD COLUMN IF NOT EXISTS ipi_number text,
  ADD COLUMN IF NOT EXISTS publisher_name text,
  ADD COLUMN IF NOT EXISTS publishing_admin text,
  ADD COLUMN IF NOT EXISTS publisher_pro text,
  ADD COLUMN IF NOT EXISTS isni text,
  ADD COLUMN IF NOT EXISTS spotify_uri text,
  ADD COLUMN IF NOT EXISTS record_label text,
  ADD COLUMN IF NOT EXISTS distributor text;