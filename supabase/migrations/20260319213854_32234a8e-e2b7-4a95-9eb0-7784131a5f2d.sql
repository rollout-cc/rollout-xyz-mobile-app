
ALTER TABLE public.pro_connections ADD COLUMN member_id uuid REFERENCES public.artist_travel_info(id) ON DELETE CASCADE;

CREATE POLICY "Team members can view member pro connections"
ON public.pro_connections FOR SELECT TO authenticated
USING (
  member_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM artist_travel_info ati
    JOIN artists a ON a.id = ati.artist_id
    WHERE ati.id = pro_connections.member_id AND is_team_member(a.team_id)
  )
);

CREATE POLICY "Owners/managers can insert member pro connections"
ON public.pro_connections FOR INSERT TO authenticated
WITH CHECK (
  member_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM artist_travel_info ati
    JOIN artists a ON a.id = ati.artist_id
    WHERE ati.id = pro_connections.member_id AND is_team_owner_or_manager(a.team_id)
  )
);

CREATE POLICY "Owners/managers can update member pro connections"
ON public.pro_connections FOR UPDATE TO authenticated
USING (
  member_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM artist_travel_info ati
    JOIN artists a ON a.id = ati.artist_id
    WHERE ati.id = pro_connections.member_id AND is_team_owner_or_manager(a.team_id)
  )
);

CREATE POLICY "Owners/managers can delete member pro connections"
ON public.pro_connections FOR DELETE TO authenticated
USING (
  member_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM artist_travel_info ati
    JOIN artists a ON a.id = ati.artist_id
    WHERE ati.id = pro_connections.member_id AND is_team_owner_or_manager(a.team_id)
  )
);
