
-- Create a security definer function to check note ownership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_note_owner(p_note_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_notes
    WHERE id = p_note_id AND user_id = auth.uid()
  )
$$;

-- Create a security definer function to check if user has shared access
CREATE OR REPLACE FUNCTION public.has_note_share(p_note_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.note_shares
    WHERE note_id = p_note_id AND shared_with = auth.uid()
  )
$$;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Note owners can manage shares" ON public.note_shares;
DROP POLICY IF EXISTS "Shared users can view shares" ON public.note_shares;
DROP POLICY IF EXISTS "Users can view shared notes" ON public.user_notes;
DROP POLICY IF EXISTS "Users can view own notes" ON public.user_notes;

-- Recreate user_notes SELECT policy using security definer function
CREATE POLICY "Users can view own or shared notes"
ON public.user_notes
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_note_share(id));

-- Recreate note_shares policies using security definer function
CREATE POLICY "Note owners can manage shares"
ON public.note_shares
FOR ALL
TO authenticated
USING (public.is_note_owner(note_id))
WITH CHECK (public.is_note_owner(note_id));

CREATE POLICY "Shared users can view shares"
ON public.note_shares
FOR SELECT
TO authenticated
USING (shared_with = auth.uid());
