
CREATE POLICY "Creators can view their teams" ON public.teams
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by);
