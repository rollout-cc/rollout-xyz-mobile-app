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
  "tour", "merch", "brand", "distribution", "split", "copyright", "master",
  "catalog", "a&r", "signing", "budget", "team", "roster", "indie", "major",
  "radio", "promotion", "fanbase", "audience", "tiktok", "spotify",
  "apple music", "youtube", "music video", "production", "producer",
  "songwriter", "contract", "negotiate", "commission", "profit",
  "business", "invest", "monetize", "growth",
];

const CHAPTERS = [
  "Industry Strategy Insights",
  "Release Strategy Patterns",
  "Artist Development Tactics",
  "Music Business Operations",
  "Revenue & Deal Strategy",
];

function anonymize(text: string): string {
  let c = text;
  c = c.replace(/@\w+/g, "");
  c = c.replace(/\b(donny\s*slater|brian\s*"?z"?\s*zisook|zisook|donny|slater|djbooth)\b/gi, "");
  c = c.replace(/according to\s+\w+(\s+\w+){0,2}/gi, "");
  c = c.replace(/\bvia\s+@?\w+/gi, "");
  c = c.replace(/\b(says|said|wrote|posted by|tweeted by)\s+\w+(\s+\w+)?/gi, "");
  c = c.replace(/https?:\/\/\S+/g, "");
  c = c.replace(/\s{2,}/g, " ").trim();
  return c;
}

function pickChapter(text: string): string {
  const l = text.toLowerCase();
  if (/release|rollout|campaign|single|album|ep\b|drop|pre-save/.test(l)) return CHAPTERS[1];
  if (/artist|develop|grow|fanbase|audience|talent/.test(l)) return CHAPTERS[2];
  if (/revenue|deal|advance|recoup|royalt|split|contract|money/.test(l)) return CHAPTERS[4];
  if (/team|roster|hire|staff|manage|operation|company/.test(l)) return CHAPTERS[3];
  return CHAPTERS[0];
}

function hasKeywords(text: string): boolean {
  const l = text.toLowerCase();
  let hits = 0;
  for (const kw of KEYWORD_FILTER) {
    if (l.includes(kw)) hits++;
    if (hits >= 2) return true;
  }
  return false;
}

// Extract meaningful paragraphs from article markdown
function extractParagraphs(markdown: string): string[] {
  const paragraphs: string[] = [];
  // Split into paragraphs
  const blocks = markdown.split(/\n{2,}/);
  for (const block of blocks) {
    // Remove markdown formatting but keep text
    const cleaned = block
      .replace(/^[#*>\-\d.]+\s*/gm, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // markdown links -> text
      .replace(/[*_~`]/g, "")
      .trim();

    // Must be substantial prose (not nav, not too short, not too long)
    if (cleaned.length < 60 || cleaned.length > 3000) continue;
    if (/^(home|menu|subscribe|sign up|log in|cookie|privacy|share|follow|©)/i.test(cleaned)) continue;
    if (/^\d+\s*(likes?|views|comments|shares|min read)/i.test(cleaned)) continue;

    paragraphs.push(cleaned);
  }
  return paragraphs;
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

    // Step 1: Search for articles featuring their insights
    const searchQueries = [
      '"Donny Slater" music management strategy advice',
      '"Brian Zisook" DJBooth music business independent artist',
      '"Donny Slater" rollout release campaign label',
    ];

    const articleUrls: string[] = [];
    const stats = { searches: 0, urls_found: 0, paragraphs_scraped: 0, matched: 0, inserted: 0 };

    for (const query of searchQueries) {
      console.log(`Searching: ${query}`);
      stats.searches++;
      try {
        const resp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, limit: 5 }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const results = data?.data || [];
          for (const r of results) {
            if (r.url && !r.url.includes("x.com") && !r.url.includes("twitter.com")) {
              articleUrls.push(r.url);
            }
          }
        } else {
          await resp.text();
        }
      } catch (e) {
        console.warn("Search error:", e);
      }
    }

    // Deduplicate URLs
    const uniqueUrls = [...new Set(articleUrls)].slice(0, 5); // Cap at 5 to avoid timeout
    stats.urls_found = uniqueUrls.length;
    console.log(`Found ${uniqueUrls.length} article URLs to scrape`);

    // Step 2: Scrape each article for full content
    const allInsights: string[] = [];

    for (const url of uniqueUrls) {
      console.log(`Scraping article: ${url}`);
      try {
        const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            formats: ["markdown"],
            onlyMainContent: true,
            timeout: 30000,
          }),
        });

        if (!resp.ok) {
          await resp.text();
          continue;
        }

        const data = await resp.json();
        const markdown = data?.data?.markdown || data?.markdown || "";
        if (!markdown) continue;

        const paragraphs = extractParagraphs(markdown);
        stats.paragraphs_scraped += paragraphs.length;

        for (const p of paragraphs) {
          if (hasKeywords(p)) {
            stats.matched++;
            const anonymized = anonymize(p);
            if (anonymized.length > 40) {
              allInsights.push(anonymized);
            }
          }
        }
      } catch (e) {
        console.warn(`Scrape error for ${url}:`, e);
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    const unique: { content: string; chapter: string }[] = [];
    for (const content of allInsights) {
      const key = content.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 120);
      if (key.length < 30 || seen.has(key)) continue;
      seen.add(key);
      unique.push({ content: content.substring(0, 5000), chapter: pickChapter(content) });
    }

    console.log(`${unique.length} unique insights from ${stats.matched} matches`);

    // Insert
    for (const entry of unique) {
      const { error } = await adminClient.from("rolly_knowledge").insert({
        source: "industry_insights",
        chapter: entry.chapter,
        content: entry.content,
      });
      if (!error) stats.inserted++;
      else console.warn("Insert error:", error.message);
    }

    console.log("Done:", JSON.stringify(stats));

    return new Response(JSON.stringify({
      success: true,
      stats,
      urls_scraped: uniqueUrls,
      sample: unique.slice(0, 3).map(u => ({
        chapter: u.chapter,
        preview: u.content.substring(0, 200),
      })),
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
