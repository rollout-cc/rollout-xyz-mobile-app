-- Allow team owners/managers to upload team photos to profile-photos bucket
CREATE POLICY "Team managers can upload team photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos'
  AND is_team_owner_or_manager((storage.foldername(name))[1]::uuid)
);

-- Allow team owners/managers to update team photos
CREATE POLICY "Team managers can update team photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-photos'
  AND is_team_owner_or_manager((storage.foldername(name))[1]::uuid)
);

-- Allow team owners/managers to delete team photos
CREATE POLICY "Team managers can delete team photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos'
  AND is_team_owner_or_manager((storage.foldername(name))[1]::uuid)
);