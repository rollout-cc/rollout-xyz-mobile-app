import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HANDLES = ["thatdonnyslater", "BrianZisook"];

const KEYWORD_FILTER = [
  "rollout", "release", "dsp", "playlist", "publishing", "sync", "licensing",
  "management", "manager", "artist", "label", "deal", "advance", "recoup",
  "strategy", "campaign", "marketing", "streaming", "revenue", "royalt",
  "tour", "merch", "brand", "distribution", "distributor", "split",
  "copyright", "master", "catalog", "a&r", "signing", "budget",
  "team", "roster", "indie", "major", "record", "radio", "promotion",
  "fanbase", "audience", "content", "social media", "tiktok", "instagram",
  "spotify", "apple music", "youtube", "music video", "visual",
  "production", "producer", "songwriter", "writer", "beat",
  "contract", "negotiate", "commission", "percentage", "profit",
  "business", "invest", "monetize", "leverage", "growth",
];

const ANONYMOUS_CHAPTERS = [
  "Industry Strategy Insights",
  "Release Strategy Patterns",
  "Artist Development Tactics",
  "Music Business Operations",
  "Revenue & Deal Strategy",
];

// Strip @handles, names, bylines, and attribution phrases
function anonymizeContent(text: string): string {
  let cleaned = text;
  // Remove @mentions
  cleaned = cleaned.replace(/@\w+/g, "");
  // Remove common attribution phrases
  cleaned = cleaned.replace(/according to\s+\w+(\s+\w+)?/gi, "");
  cleaned = cleaned.replace(/\b(donny\s*slater|brian\s*zisook|djbooth)\b/gi, "");
  cleaned = cleaned.replace(/\bvia\s+@?\w+/gi, "");
  cleaned = cleaned.replace(/\b(says|said|wrote|posted by)\s+\w+(\s+\w+)?/gi, "");
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  return cleaned;
}

function matchesKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return KEYWORD_FILTER.some((kw) => lower.includes(kw));
}

function pickChapter(text: string): string {
  const lower = text.toLowerCase();
  if (/release|rollout|campaign|single|album|ep\b/.test(lower)) return ANONYMOUS_CHAPTERS[1];
  if (/artist|develop|grow|fanbase|audience/.test(lower)) return ANONYMOUS_CHAPTERS[2];
  if (/revenue|deal|advance|recoup|royalt|split|contract/.test(lower)) return ANONYMOUS_CHAPTERS[4];
  if (/team|roster|hire|staff|manage|operation/.test(lower)) return ANONYMOUS_CHAPTERS[3];
  return ANONYMOUS_CHAPTERS[0];
}

// Extract individual tweet-like blocks from scraped markdown
function extractTweets(markdown: string): string[] {
  const tweets: string[] = [];
  // Split by common tweet separators in scraped X/Twitter content
  const blocks = markdown.split(/\n{2,}|\n---\n|\n\*{3}\n/);
  for (const block of blocks) {
    const cleaned = block.trim();
    // Filter: must be substantial (>30 chars) and not too long (not a full article)
    if (cleaned.length > 30 && cleaned.length < 1500) {
      // Skip navigation/UI elements
      if (/^(home|explore|search|notifications|messages|premium|profile|more|log in|sign up)/i.test(cleaned)) continue;
      if (/^(cookie|privacy|terms|©)/i.test(cleaned)) continue;
      tweets.push(cleaned);
    }
  }
  return tweets;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allInserted: string[] = [];
    const stats: Record<string, { scraped: number; matched: number; inserted: number }> = {};

    for (const handle of HANDLES) {
      stats[handle] = { scraped: 0, matched: 0, inserted: 0 };

      // Strategy 1: Direct profile scrape with JS rendering
      console.log(`Scraping profile: ${handle}`);
      try {
        const profileResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: `https://x.com/${handle}`,
            formats: ["markdown"],
            onlyMainContent: true,
            waitFor: 8000,
            timeout: 60000,
          }),
        });

        if (profileResp.ok) {
          const profileData = await profileResp.json();
          const markdown = profileData?.data?.markdown || profileData?.markdown || "";
          if (markdown) {
            const tweets = extractTweets(markdown);
            stats[handle].scraped += tweets.length;
            for (const tweet of tweets) {
              if (matchesKeywords(tweet)) {
                stats[handle].matched++;
                const anonymized = anonymizeContent(tweet);
                if (anonymized.length > 20) {
                  allInserted.push(anonymized);
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn(`Profile scrape failed for ${handle}:`, e);
      }

      // Strategy 2: Firecrawl search for their indexed tweets
      const searchQueries = [
        `site:x.com from:${handle} music business`,
        `site:x.com from:${handle} artist management strategy`,
        `site:x.com from:${handle} release rollout`,
      ];

      for (const query of searchQueries) {
        console.log(`Searching: ${query}`);
        try {
          const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query,
              limit: 10,
              scrapeOptions: { formats: ["markdown"] },
            }),
          });

          if (searchResp.ok) {
            const searchData = await searchResp.json();
            const results = searchData?.data || [];
            for (const item of results) {
              const md = item.markdown || "";
              if (!md) continue;
              const tweets = extractTweets(md);
              stats[handle].scraped += tweets.length;
              for (const tweet of tweets) {
                if (matchesKeywords(tweet)) {
                  stats[handle].matched++;
                  const anonymized = anonymizeContent(tweet);
                  if (anonymized.length > 20) {
                    allInserted.push(anonymized);
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn(`Search failed for query "${query}":`, e);
        }
      }
    }

    // Deduplicate by normalizing
    const seen = new Set<string>();
    const unique: { content: string; chapter: string }[] = [];
    for (const content of allInserted) {
      const key = content.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 80);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push({ content, chapter: pickChapter(content) });
      }
    }

    // Insert into rolly_knowledge
    let insertedCount = 0;
    for (const entry of unique) {
      const { error } = await adminClient.from("rolly_knowledge").insert({
        source: "industry_insights",
        chapter: entry.chapter,
        content: entry.content,
      });
      if (!error) {
        insertedCount++;
        // Update per-handle stats (approximate)
        for (const handle of HANDLES) {
          if (stats[handle].matched > stats[handle].inserted) {
            stats[handle].inserted++;
            break;
          }
        }
      } else {
        console.warn("Insert error:", error.message);
      }
    }

    console.log("Scrape complete. Stats:", JSON.stringify(stats));
    console.log(`Total unique insights inserted: ${insertedCount}`);

    return new Response(JSON.stringify({
      success: true,
      total_inserted: insertedCount,
      total_unique: unique.length,
      stats,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("scrape-twitter-knowledge error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
