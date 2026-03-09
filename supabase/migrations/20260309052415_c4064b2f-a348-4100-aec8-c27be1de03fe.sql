
ALTER TABLE public.artists 
  ADD COLUMN IF NOT EXISTS objective_1_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS objective_1_target numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS objective_2_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS objective_2_target numeric DEFAULT NULL;
