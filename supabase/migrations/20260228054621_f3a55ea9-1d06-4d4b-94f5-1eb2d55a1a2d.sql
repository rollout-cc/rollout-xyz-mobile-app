
-- Pipeline stage enum
CREATE TYPE public.prospect_stage AS ENUM (
  'discovered', 'contacted', 'in_conversation', 'materials_requested',
  'internal_review', 'offer_sent', 'negotiating', 'signed', 'passed', 'on_hold'
);

-- Priority enum
CREATE TYPE public.prospect_priority AS ENUM ('low', 'medium', 'high');

-- Deal status enum
CREATE TYPE public.deal_status AS ENUM (
  'not_discussed', 'discussing', 'offer_sent', 'under_negotiation', 'signed', 'passed'
);

-- Deal type enum
CREATE TYPE public.deal_type AS ENUM (
  'distribution', 'frontline_record', 'partnership', 'publishing'
);

-- Engagement type enum
CREATE TYPE public.engagement_type AS ENUM (
  'call', 'email', 'dm', 'meeting', 'show', 'intro', 'deal_sent'
);

-- Prospects table
CREATE TABLE public.prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  artist_name TEXT NOT NULL,
  primary_genre TEXT,
  city TEXT,
  spotify_uri TEXT,
  instagram TEXT,
  tiktok TEXT,
  youtube TEXT,
  monthly_listeners INTEGER,
  key_songs TEXT[] DEFAULT '{}',
  notes TEXT,
  stage prospect_stage NOT NULL DEFAULT 'discovered',
  priority prospect_priority NOT NULL DEFAULT 'medium',
  owner_id UUID,
  next_follow_up DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- Prospect contacts
CREATE TABLE public.prospect_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prospect_contacts ENABLE ROW LEVEL SECURITY;

-- Prospect engagements
CREATE TABLE public.prospect_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  engagement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  engagement_type engagement_type NOT NULL,
  outcome TEXT,
  next_step TEXT,
  owner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prospect_engagements ENABLE ROW LEVEL SECURITY;

-- Prospect deals
CREATE TABLE public.prospect_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  deal_status deal_status NOT NULL DEFAULT 'not_discussed',
  deal_type deal_type,
  -- Common fields
  term_length TEXT,
  territory TEXT DEFAULT 'Worldwide',
  exclusivity TEXT,
  accounting_frequency TEXT DEFAULT 'Quarterly',
  advance NUMERIC,
  notes TEXT,
  -- Type-specific fields stored as JSON
  type_specific_terms JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prospect_deals ENABLE ROW LEVEL SECURITY;

-- Helper function to get prospect team_id
CREATE OR REPLACE FUNCTION public.get_prospect_team_id(p_prospect_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT team_id FROM public.prospects WHERE id = p_prospect_id
$$;

-- RLS: Prospects
CREATE POLICY "Team members can view prospects"
  ON public.prospects FOR SELECT
  USING (is_team_member(team_id));

CREATE POLICY "Owners/managers can insert prospects"
  ON public.prospects FOR INSERT
  WITH CHECK (is_team_owner_or_manager(team_id));

CREATE POLICY "Owners/managers can update prospects"
  ON public.prospects FOR UPDATE
  USING (is_team_owner_or_manager(team_id));

CREATE POLICY "Owners/managers can delete prospects"
  ON public.prospects FOR DELETE
  USING (is_team_owner_or_manager(team_id));

-- RLS: Prospect contacts
CREATE POLICY "Team members can view prospect contacts"
  ON public.prospect_contacts FOR SELECT
  USING (is_team_member(get_prospect_team_id(prospect_id)));

CREATE POLICY "Owners/managers can insert prospect contacts"
  ON public.prospect_contacts FOR INSERT
  WITH CHECK (is_team_owner_or_manager(get_prospect_team_id(prospect_id)));

CREATE POLICY "Owners/managers can update prospect contacts"
  ON public.prospect_contacts FOR UPDATE
  USING (is_team_owner_or_manager(get_prospect_team_id(prospect_id)));

CREATE POLICY "Owners/managers can delete prospect contacts"
  ON public.prospect_contacts FOR DELETE
  USING (is_team_owner_or_manager(get_prospect_team_id(prospect_id)));

-- RLS: Engagements (all team members can add)
CREATE POLICY "Team members can view engagements"
  ON public.prospect_engagements FOR SELECT
  USING (is_team_member(get_prospect_team_id(prospect_id)));

CREATE POLICY "Team members can insert engagements"
  ON public.prospect_engagements FOR INSERT
  WITH CHECK (is_team_member(get_prospect_team_id(prospect_id)));

CREATE POLICY "Owners/managers can update engagements"
  ON public.prospect_engagements FOR UPDATE
  USING (is_team_owner_or_manager(get_prospect_team_id(prospect_id)));

CREATE POLICY "Owners/managers can delete engagements"
  ON public.prospect_engagements FOR DELETE
  USING (is_team_owner_or_manager(get_prospect_team_id(prospect_id)));

-- RLS: Deals
CREATE POLICY "Team members can view deals"
  ON public.prospect_deals FOR SELECT
  USING (is_team_member(get_prospect_team_id(prospect_id)));

CREATE POLICY "Owners/managers can insert deals"
  ON public.prospect_deals FOR INSERT
  WITH CHECK (is_team_owner_or_manager(get_prospect_team_id(prospect_id)));

CREATE POLICY "Owners/managers can update deals"
  ON public.prospect_deals FOR UPDATE
  USING (is_team_owner_or_manager(get_prospect_team_id(prospect_id)));

CREATE POLICY "Owners/managers can delete deals"
  ON public.prospect_deals FOR DELETE
  USING (is_team_owner_or_manager(get_prospect_team_id(prospect_id)));

-- Updated_at triggers
CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prospect_deals_updated_at
  BEFORE UPDATE ON public.prospect_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
