

# Anonymize All Knowledge Sources

## Current State

Good news: there are **no references** to "Donny Slater" or "Brian Zisook" anywhere in the codebase or knowledge base right now. The DJBooth entries are attributed to "Ty Baisden and Yoh" which is fine.

## What Changes

When we implement the Firecrawl tweet scraping (from the approved plan), we will:

1. **Never attribute sources by Twitter handle or name** in `rolly_knowledge` inserts. Instead of chapters like "Industry Voice: Donny Slater", use generic labels like "Industry Strategy Insights", "Release Strategy Patterns", "Artist Development Tactics"

2. **Update the system prompt** to add an explicit rule:
   - Add to the style section: "Never cite or attribute your knowledge to specific people, accounts, articles, or publications. Present all insights as your own understanding of the industry."

3. **Strip attribution from Firecrawl results** before inserting into the knowledge base — remove @handles, "according to X", bylines, etc.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/rolly-chat/index.ts` | Add "never attribute sources" rule to system prompt |
| `supabase/functions/scrape-twitter-knowledge/index.ts` | Strip handles/names before inserting knowledge rows |

