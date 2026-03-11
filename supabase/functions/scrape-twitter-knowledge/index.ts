import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

function anonymizeContent(text: string): string {
  let cleaned = text;
  cleaned = cleaned.replace(/@\w+/g, "");
  cleaned = cleaned.replace(/according to\s+\w+(\s+\w+){0,2}/gi, "");
  cleaned = cleaned.replace(/\b(donny\s*slater|brian\s*zisook|djbooth)\b/gi, "");
  cleaned = cleaned.replace(/\bvia\s+@?\w+/gi, "");
  cleaned = cleaned.replace(/\b(says|said|wrote|posted by|tweeted by)\s+\w+(\s+\w+)?/gi, "");
  cleaned = cleaned.replace(/https?:\/\/\S+/g, "");
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  return cleaned;
}

function matchesKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const kw of KEYWORD_FILTER) {
    if (lower.includes(kw)) hits++;
    if (hits >= 2) return true; // Require 2+ keyword matches for quality
  }
  return false;
}

function pickChapter(text: string): string {
  const lower = text.toLowerCase();
  if (/release|rollout|campaign|single|album|ep\b|drop|pre-save/.test(lower)) return ANONYMOUS_CHAPTERS[1];
  if (/artist|develop|grow|fanbase|audience|talent/.test(lower)) return ANONYMOUS_CHAPTERS[2];
  if (/revenue|deal|advance|recoup|royalt|split|contract|money|pay/.test(lower)) return ANONYMOUS_CHAPTERS[4];
  if (/team|roster|hire|staff|manage|operation|company/.test(lower)) return ANONYMOUS_CHAPTERS[3];
  return ANONYMOUS_CHAPTERS[0];
}

function extractInsights(markdown: string): string[] {
  const insights: string[] = [];
  const blocks = markdown.split(/\n{2,}/);
  for (const block of blocks) {
    const cleaned = block.replace(/^[#*>\-\d.]+\s*/gm, "").trim();
    if (cleaned.length > 40 && cleaned.length < 2000) {
      // Skip nav/boilerplate
      if (/^(home|explore|search|notifications|cookie|privacy|terms|©|subscribe|sign up|log in|menu)/i.test(cleaned)) continue;
      if (/^\d+\s*(likes?|retweets?|replies|views|followers)/i.test(cleaned)) continue;
      insights.push(cleaned);
    }
  }
  return insights;
}

interface SearchConfig {
  query: string;
  label: string;
}

function buildSearchQueries(): SearchConfig[] {
  return [
    { query: '"Donny Slater" music management artist strategy', label: "ds-mgmt" },
    { query: '"Brian Zisook" DJBooth music business artist development', label: "bz-djbooth" },
    { query: '"Donny Slater" OR "Brian Zisook" release rollout streaming revenue', label: "combined" },
  ];
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

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const queries = buildSearchQueries();
    const allInsights: string[] = [];
    const stats = { queries_run: 0, results_found: 0, matched: 0, inserted: 0 };

    for (const { query, label } of queries) {
      console.log(`[${label}] Searching: ${query}`);
      stats.queries_run++;

      try {
        const resp = await fetch("https://api.firecrawl.dev/v1/search", {
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

        if (!resp.ok) {
          const errBody = await resp.text();
          console.warn(`[${label}] Search failed (${resp.status}):`, errBody);
          continue;
        }

        const searchData = await resp.json();
        const results = searchData?.data || [];
        stats.results_found += results.length;
        console.log(`[${label}] Got ${results.length} results`);

        for (const item of results) {
          const md = item.markdown || "";
          if (!md) continue;

          const blocks = extractInsights(md);
          for (const block of blocks) {
            if (matchesKeywords(block)) {
              stats.matched++;
              const anonymized = anonymizeContent(block);
              if (anonymized.length > 30) {
                allInsights.push(anonymized);
              }
            }
          }
        }
      } catch (e) {
        console.warn(`[${label}] Error:`, e);
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    const unique: { content: string; chapter: string }[] = [];
    for (const content of allInsights) {
      const key = content.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 100);
      if (key.length < 20) continue;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push({ content, chapter: pickChapter(content) });
      }
    }

    console.log(`Deduped to ${unique.length} unique insights from ${stats.matched} matches`);

    // Insert into rolly_knowledge
    for (const entry of unique) {
      const { error } = await adminClient.from("rolly_knowledge").insert({
        source: "industry_insights",
        chapter: entry.chapter,
        content: entry.content.substring(0, 5000),
      });
      if (!error) {
        stats.inserted++;
      } else {
        console.warn("Insert error:", error.message);
      }
    }

    console.log("Done. Stats:", JSON.stringify(stats));

    return new Response(JSON.stringify({
      success: true,
      stats,
      sample: unique.slice(0, 3).map(u => ({ chapter: u.chapter, preview: u.content.substring(0, 120) })),
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
