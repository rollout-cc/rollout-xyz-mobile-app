
ALTER TABLE public.artist_travel_info
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS ktn_number text,
  ADD COLUMN IF NOT EXISTS tsa_precheck_number text,
  ADD COLUMN IF NOT EXISTS preferred_seat text,
  ADD COLUMN IF NOT EXISTS preferred_airline text,
  ADD COLUMN IF NOT EXISTS shirt_size text,
  ADD COLUMN IF NOT EXISTS pant_size text,
  ADD COLUMN IF NOT EXISTS shoe_size text,
  ADD COLUMN IF NOT EXISTS dress_size text,
  ADD COLUMN IF NOT EXISTS hat_size text,
  ADD COLUMN IF NOT EXISTS favorite_brands text;
