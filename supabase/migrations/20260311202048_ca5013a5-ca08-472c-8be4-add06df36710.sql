
-- Add source/provenance column to creator_intelligence
ALTER TABLE public.creator_intelligence ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
-- source values: 'creatorcore', 'manual', 'csv_import', 'web_enrichment', 'user_submission', 'screenshot_ocr'

-- Update existing seed data to mark as creatorcore
UPDATE public.creator_intelligence SET source = 'creatorcore' WHERE team_id IS NULL;
