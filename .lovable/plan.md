

# Creator Intelligence Knowledge Layer for ROLLY

## Overview

Build a `creator_intelligence` table to store creators/influencers/pages/playlists as probabilistic outreach targets. Seed it with the uploaded community database (Instagram pages, TikTok repost pages, Spotify playlists, industry contacts, venues). Give ROLLY a new `search_creators` tool so it can recommend creators contextually with confidence labels and disclaimers.

## Data Model

**New table: `creator_intelligence`**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| team_id | uuid | nullable — null = global/shared data |
| handle | text | @clipsbyjam, playlist name, etc. |
| platform | text | instagram, tiktok, spotify_playlist, youtube, venue, contact |
| category | text | Culture News, Comedy, Moshpit, Hipster, etc. |
| subcategory | text | nullable — Dancer/Influencer, HBCU, etc. |
| genre_fit | text[] | hip-hop, r&b, trap, indie-pop, etc. |
| audience_type | text | street, college, indie, mainstream, niche |
| follower_count | integer | nullable |
| average_views | integer | nullable — from TikTok screenshot data |
| median_views | integer | nullable |
| engagement_rate | numeric | nullable — percentage |
| posting_frequency | text | nullable — daily, weekly, etc. |
| content_style | text | nullable — interviews, clips, moshpit, comedy skits |
| contact_info | text | nullable — email, phone, IG DM |
| rate | text | nullable — "$50", "$300 IG / $190 TikTok" |
| artist_affinity | text[] | nullable — genre/style tags this creator aligns with |
| historical_campaigns | jsonb | nullable — past usage notes |
| confidence_score | numeric | 0-1, default 0.5 |
| confidence_label | text | generated: High / Medium / Experimental |
| last_verified_date | date | nullable |
| notes | text | nullable |
| url | text | nullable — profile/playlist URL |
| created_at | timestamptz | default now() |

RLS: team members can view rows where `team_id` matches their team OR `team_id IS NULL` (global). Only owners/managers can insert/update/delete.

**New DB function: `search_creator_intelligence`** — full-text search + filtering by platform, category, genre_fit, confidence, with ranking by confidence and recency.

## Seed Data

Parse and insert all data from the uploaded spreadsheets:
- **Page 1** (~130 Instagram pages): handle, follower_count, category (Platform Type), rate
- **Page 3** (~100 Spotify playlists): handle=playlist name, platform=spotify_playlist, follower_count, genre, rate, contact
- **Page 4** (~28 industry contacts): platform=contact, category from Platform column
- **Page 5** (~11 venues): platform=venue
- **TikTok screenshots** (visible in images): ~100+ TikTok repost pages with views, likes, comments, shares, downloads, engagement rates — these get platform=tiktok with average_views and engagement_rate populated
- **CSV (Doogie Database)**: ~28 local ATL contacts — platform=contact

All seeded with `team_id = NULL` (global), `confidence_score = 0.5` (Medium), `last_verified_date = 2026-03-11`.

## ROLLY Integration

**New tool: `search_creators`** added to `rolly-chat/index.ts`

```text
Parameters:
  - query: text (search term)
  - platform: optional filter (instagram, tiktok, spotify_playlist, etc.)
  - category: optional filter
  - genre: optional filter
  - min_confidence: optional (0-1)
  - limit: default 10
```

The tool queries `search_creator_intelligence`, returns results ranked by confidence + recency. Each result includes the confidence label.

**System prompt addition** — instruct ROLLY to:
1. Always present creators as "suggested outreach targets based on historical content patterns and prior campaign activity"
2. Never imply guaranteed performance, posting, conversion, or results
3. Include disclaimer: "These are directional suggestions based on similar past behavior, not guaranteed outcomes."
4. Label each as High Confidence / Medium Confidence / Experimental
5. Rank by confidence, relevance, and recency

**New edge function tool executor** in `executeTool`: handles `search_creators` by querying the DB and returning formatted results.

## Seed Migration

A single migration will:
1. Create the `creator_intelligence` table with RLS
2. Create the `search_creator_intelligence` function
3. Insert all seed data from the spreadsheets (Instagram, TikTok, Spotify, contacts, venues)

For the TikTok data from screenshots (which can't be parsed programmatically), we'll insert the top ~30 visible accounts with their metrics as representative seed data, with a note that more can be added.

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | New table, function, RLS, seed data |
| `supabase/functions/rolly-chat/index.ts` | Add `search_creators` tool definition + executor + system prompt update |

No frontend UI changes needed — ROLLY surfaces this through conversation.

