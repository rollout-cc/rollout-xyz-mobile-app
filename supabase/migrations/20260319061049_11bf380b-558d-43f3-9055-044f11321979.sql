
ALTER TABLE team_memberships ADD COLUMN persona text DEFAULT null;
ALTER TABLE team_memberships ADD COLUMN assists_user_id uuid DEFAULT null;
ALTER TABLE team_memberships ADD COLUMN perm_distribution boolean DEFAULT false;

ALTER TABLE invite_links ADD COLUMN assists_user_id uuid DEFAULT null;
ALTER TABLE invite_links ADD COLUMN perm_distribution boolean DEFAULT false;

CREATE TABLE access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id),
  requester_id uuid NOT NULL,
  request_type text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending',
  reviewed_by uuid DEFAULT null,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team requests"
  ON access_requests FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert requests"
  ON access_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Team owners can update requests"
  ON access_requests FOR UPDATE
  USING (team_id IN (SELECT team_id FROM team_memberships WHERE user_id = auth.uid() AND role = 'team_owner'));
