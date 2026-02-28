

## Fix A&R Pipeline: Drag-and-Drop + Spotify Avatars

### Problem 1: Drag-and-Drop Not Working
The pipeline board columns use `min-w-0` without explicit width, making the droppable areas too narrow for `@hello-pangea/dnd` to register drops. The inner `<div className="min-w-0">` needs `flex-1` to fill the available column space.

### Problem 2: No Profile Pictures
The `prospects` table has no `avatar_url` column. The PipelineBoard only renders `AvatarFallback` (the first letter), never an actual image.

---

### Plan

#### 1. Add `avatar_url` column to prospects table
Run a database migration to add `avatar_url text` to the `prospects` table.

#### 2. Store avatar when creating prospect from Spotify
In `ARList.tsx`, the `handleAddFromSpotify` function already receives `artist.images` from Spotify search results. Pass the first image URL as `avatar_url` when calling `createProspect.mutateAsync`.

Update the `useCreateProspect` mutation type to accept `avatar_url`.

#### 3. Fix PipelineBoard layout for drag-and-drop
- Add `flex-1` to the inner column `<div>` so droppable zones have proper width
- Import `AvatarImage` and render it with `p.avatar_url` so Spotify profile pictures display

#### 4. Update ProspectProfile to sync avatar from Spotify
In the `syncSpotifyData` function, also save the Spotify image as `avatar_url` on the prospect (similar to how ArtistDetail does it).

---

### Technical Details

**Migration SQL:**
```sql
ALTER TABLE prospects ADD COLUMN avatar_url text;
```

**Files to modify:**
- `src/hooks/useProspects.ts` -- add `avatar_url` to create mutation type
- `src/pages/ARList.tsx` -- pass `avatar_url: artist.images?.[0]?.url` when creating
- `src/components/ar/PipelineBoard.tsx` -- fix column width (`flex-1`), add `AvatarImage`
- `src/pages/ProspectProfile.tsx` -- save avatar_url during Spotify sync
