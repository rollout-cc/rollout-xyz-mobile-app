CREATE POLICY "Team owners/managers can update listener history"
ON public.monthly_listener_history
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM artists a
    JOIN team_memberships tm ON tm.team_id = a.team_id
    WHERE a.id = monthly_listener_history.artist_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('team_owner', 'manager')
  )
);