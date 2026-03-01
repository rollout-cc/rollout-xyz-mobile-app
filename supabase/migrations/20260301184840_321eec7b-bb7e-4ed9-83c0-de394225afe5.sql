
-- Drop old single-note table and rebuild as multi-note system
DROP TABLE IF EXISTS public.user_notes;

CREATE TABLE public.user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_notes_user_team ON public.user_notes(user_id, team_id);

-- Note sharing: share individual notes with team members
CREATE TABLE public.note_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.user_notes(id) ON DELETE CASCADE,
  shared_with uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(note_id, shared_with)
);

ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_shares ENABLE ROW LEVEL SECURITY;

-- user_notes policies: owner can CRUD, shared users can view
CREATE POLICY "Users can view own notes"
  ON public.user_notes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view shared notes"
  ON public.user_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.note_shares ns
      WHERE ns.note_id = user_notes.id AND ns.shared_with = auth.uid()
    )
  );

CREATE POLICY "Users can insert own notes"
  ON public.user_notes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notes"
  ON public.user_notes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notes"
  ON public.user_notes FOR DELETE
  USING (user_id = auth.uid());

-- note_shares policies: note owner manages shares, shared users can view
CREATE POLICY "Note owners can manage shares"
  ON public.note_shares FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_notes n
      WHERE n.id = note_shares.note_id AND n.user_id = auth.uid()
    )
  );

CREATE POLICY "Shared users can view shares"
  ON public.note_shares FOR SELECT
  USING (shared_with = auth.uid());
