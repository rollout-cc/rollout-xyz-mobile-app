
-- Create the creator_intelligence table
CREATE TABLE public.creator_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  handle text NOT NULL,
  platform text NOT NULL,
  category text,
  subcategory text,
  genre_fit text[],
  audience_type text,
  follower_count integer,
  average_views integer,
  median_views integer,
  engagement_rate numeric,
  posting_frequency text,
  content_style text,
  contact_info text,
  rate text,
  artist_affinity text[],
  historical_campaigns jsonb,
  confidence_score numeric NOT NULL DEFAULT 0.5,
  confidence_label text NOT NULL DEFAULT 'Medium Confidence',
  last_verified_date date,
  notes text,
  url text,
  search_vector tsvector,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_creator_intelligence_search ON public.creator_intelligence USING gin(search_vector);
CREATE INDEX idx_creator_intelligence_platform ON public.creator_intelligence(platform);
CREATE INDEX idx_creator_intelligence_team ON public.creator_intelligence(team_id);

-- Trigger to update search_vector
CREATE OR REPLACE FUNCTION public.creator_intelligence_search_trigger()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.handle, '') || ' ' ||
    coalesce(NEW.platform, '') || ' ' ||
    coalesce(NEW.category, '') || ' ' ||
    coalesce(NEW.subcategory, '') || ' ' ||
    coalesce(NEW.audience_type, '') || ' ' ||
    coalesce(NEW.content_style, '') || ' ' ||
    coalesce(NEW.notes, '') || ' ' ||
    coalesce(array_to_string(NEW.genre_fit, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.artist_affinity, ' '), '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_creator_intelligence_search
  BEFORE INSERT OR UPDATE ON public.creator_intelligence
  FOR EACH ROW EXECUTE FUNCTION public.creator_intelligence_search_trigger();

-- Enable RLS
ALTER TABLE public.creator_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view creator intelligence"
  ON public.creator_intelligence FOR SELECT TO authenticated
  USING (team_id IS NULL OR is_team_member(team_id));

CREATE POLICY "Owners/managers can insert creator intelligence"
  ON public.creator_intelligence FOR INSERT TO authenticated
  WITH CHECK (team_id IS NULL OR is_team_owner_or_manager(team_id));

CREATE POLICY "Owners/managers can update creator intelligence"
  ON public.creator_intelligence FOR UPDATE TO authenticated
  USING (team_id IS NULL OR is_team_owner_or_manager(team_id));

CREATE POLICY "Owners/managers can delete creator intelligence"
  ON public.creator_intelligence FOR DELETE TO authenticated
  USING (team_id IS NULL OR is_team_owner_or_manager(team_id));

-- Search function
CREATE OR REPLACE FUNCTION public.search_creator_intelligence(
  search_query text DEFAULT '',
  platform_filter text DEFAULT NULL,
  category_filter text DEFAULT NULL,
  genre_filter text DEFAULT NULL,
  min_confidence numeric DEFAULT 0,
  match_limit integer DEFAULT 10,
  p_team_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid, handle text, platform text, category text, subcategory text,
  genre_fit text[], audience_type text, follower_count integer,
  average_views integer, median_views integer, engagement_rate numeric,
  posting_frequency text, content_style text, contact_info text,
  rate text, artist_affinity text[], confidence_score numeric,
  confidence_label text, last_verified_date date, notes text, url text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT
    ci.id, ci.handle, ci.platform, ci.category, ci.subcategory,
    ci.genre_fit, ci.audience_type, ci.follower_count,
    ci.average_views, ci.median_views, ci.engagement_rate,
    ci.posting_frequency, ci.content_style, ci.contact_info,
    ci.rate, ci.artist_affinity, ci.confidence_score,
    ci.confidence_label, ci.last_verified_date, ci.notes, ci.url
  FROM public.creator_intelligence ci
  WHERE
    (ci.team_id IS NULL OR ci.team_id = p_team_id)
    AND (platform_filter IS NULL OR ci.platform = platform_filter)
    AND (category_filter IS NULL OR ci.category ILIKE '%' || category_filter || '%')
    AND (genre_filter IS NULL OR genre_filter = ANY(ci.genre_fit))
    AND ci.confidence_score >= min_confidence
    AND (
      search_query = '' OR search_query IS NULL
      OR ci.search_vector @@ plainto_tsquery('english', search_query)
      OR ci.handle ILIKE '%' || search_query || '%'
      OR ci.category ILIKE '%' || search_query || '%'
    )
  ORDER BY ci.confidence_score DESC, ci.last_verified_date DESC NULLS LAST, ci.follower_count DESC NULLS LAST
  LIMIT match_limit;
$$;
