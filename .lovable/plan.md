

# Distribution Wizard Improvements

## Summary
Seven changes to the distribution wizard: auto-generate tracks by release type, show artist avatars in dropdown, use real platform SVG logos with a comprehensive list of 20+ DSPs, add audio file upload per track, remove split project dependency (handle splits inline), show cover art in review, and clarify the "E" toggle.

## Database Migration

Add `audio_url` column to `release_tracks` for MP3/WAV uploads:

```sql
ALTER TABLE public.release_tracks ADD COLUMN audio_url text;
```

No other schema changes needed — splits are already handled via `split_project_id` link; the inline split flow will create/use existing split infrastructure.

## Changes by File

### 1. `src/components/distribution/StepTracks.tsx` — Major rewrite

- **Artist dropdown with avatars**: Render each `SelectItem` with `<img>` avatar + name (use `a.avatar_url`).
- **Release type auto-populates tracks**: When user picks Single → 1 track row. EP → 3 track rows. Album → 7 track rows. Changing type resets tracks to the minimum count (only if current count is less than required).
- **"E" toggle label**: Add a tooltip or small label clarifying "Explicit Content" next to the E toggle.
- **Audio upload per track**: Add a file input (accept `.mp3,.wav`) next to each track row. Upload to `artist-assets` bucket under `{teamId}/tracks/`. Store URL in `track.audio_url`. Show a small waveform icon or filename when uploaded.
- **Remove split project linking** from this step — move it to Step 5 (Approvals) or make it optional context.

### 2. `src/components/distribution/StepPlatforms.tsx` — Major rewrite

Replace emoji icons with actual SVG logos. Expand platform list to ~20+ services:

**Platforms to include**: Spotify, Apple Music, Tidal, Amazon Music, YouTube Music, Deezer, Pandora, iHeartRadio, SoundCloud, Audiomack, Tencent Music, JioSaavn, Anghami, Boomplay, Napster, TikTok/Resso, Instagram/Facebook (Meta), Shazam, Trebel, Snap (Snapchat)

Store SVG logo components inline or as a utility map. Each card shows the actual brand logo (rendered as small SVGs with brand colors) instead of emojis.

Update `DEFAULT_PLATFORMS` in `ReleaseWizard.tsx` to match the expanded list.

### 3. `src/components/distribution/StepDetails.tsx` — Minor update

No major changes — already handles artwork upload, genre, dates, ISRC codes.

### 4. `src/components/distribution/StepRightsRegistration.tsx` — Update

Currently requires a linked split project to show contributor PRO data. Update to also work when tracks have been entered manually (without a split project), showing a message that PRO/MLC validation will be available once splits are configured in Step 5.

### 5. `src/components/distribution/StepSplitApproval.tsx` — Major update

Instead of only showing data when a split project is linked, allow inline split creation:
- If no split project linked: show a "Create Split Project" button that auto-creates one for this release's artist, then links it via `split_project_id`.
- Show each track from the release, allow adding contributors inline with email, role, and percentage fields.
- Reuse existing `useSplitContributors`, `useCreateSplitEntry`, etc. hooks.
- Keep the approval email flow as-is.

### 6. `src/components/distribution/StepReview.tsx` — Update

- Show **cover art** at the top of the summary card (large artwork image if `form.artwork_url` exists).
- Show track list with audio file status (uploaded/missing).
- Remove "Split Project Linked" as a hard check — make it optional/warning.

### 7. `src/components/distribution/ReleaseWizard.tsx` — Update

- Update `ReleaseFormData` tracks type to include `audio_url?: string`.
- Update `DEFAULT_PLATFORMS` to the expanded 20+ list.
- Pass `updateForm` to `StepSplitApproval` so it can set `split_project_id`.

### 8. `src/hooks/useReleases.ts` — Minor update

Update `useUpsertReleaseTracks` to include `audio_url` in the insert payload.

## New Assets

Platform logos will be rendered as inline SVG components in a `PlatformLogos.tsx` utility file under `src/components/distribution/`. This avoids external image dependencies and keeps logos crisp at any size. Each logo is a simple `<svg>` with the brand's primary color, sized at 32x32.

## Files Modified
- `src/components/distribution/StepTracks.tsx`
- `src/components/distribution/StepPlatforms.tsx`
- `src/components/distribution/StepSplitApproval.tsx`
- `src/components/distribution/StepReview.tsx`
- `src/components/distribution/ReleaseWizard.tsx`
- `src/components/distribution/StepRightsRegistration.tsx`
- `src/hooks/useReleases.ts`

## New Files
- `src/components/distribution/PlatformLogos.tsx` — SVG logo components for 20+ DSPs
- Migration SQL for `audio_url` column

