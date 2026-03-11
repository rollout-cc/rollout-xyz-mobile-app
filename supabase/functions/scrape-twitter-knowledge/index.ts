import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CHAPTERS = [
  "Industry Strategy Insights",
  "Release Strategy Patterns",
  "Artist Development Tactics",
  "Music Business Operations",
  "Revenue & Deal Strategy",
];

const DEFAULT_SOURCES = [
  { url: "https://trapital.co", name: "Trapital" },
  { url: "https://www.musicbusinessworldwide.com", name: "Music Business Worldwide" },
  { url: "https://www.hypebot.com", name: "Hypebot" },
  { url: "https://www.digitalmusicnews.com", name: "Digital Music News" },
  { url: "https://www.complex.com/music", name: "Complex Music" },
];

async function discoverArticles(firecrawlKey: string, siteUrl: string): Promise<string[]> {
  console.log(`Mapping ${siteUrl} for article URLs...`);

  const response = await fetch("https://api.firecrawl.dev/v1/map", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firecrawlKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: siteUrl,
      limit: 50,
      includeSubdomains: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Firecrawl map failed for ${siteUrl}: ${response.status} ${errText}`);
    return [];
  }

  const data = await response.json();
  const links: string[] = data?.links || [];

  // Filter to likely article URLs (not category pages, about pages, etc.)
  const articleUrls = links.filter((url: string) => {
    const path = new URL(url).pathname;
    // Must have a meaningful path depth (likely an article)
    const segments = path.split("/").filter(Boolean);
    if (segments.length < 2) return false;
    // Skip common non-article paths
    if (/\/(tag|category|author|about|contact|privacy|terms|search|login|signup|page\/\d)/.test(path)) return false;
    return true;
  });

  console.log(`${siteUrl}: found ${articleUrls.length} article URLs from ${links.length} total`);
  return articleUrls.slice(0, 15); // Cap at 15 articles per source
}

async function scrapeArticle(firecrawlKey: string, url: string): Promise<string> {
  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firecrawlKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
  });

  if (!response.ok) {
    console.error(`Scrape failed for ${url}: ${response.status}`);
    await response.text(); // consume body
    return "";
  }

  const data = await response.json();
  return data?.data?.markdown || data?.markdown || "";
}

interface ClassifiedChunk {
  index: number;
  relevant: boolean;
  chapter: string;
  insight: string;
}

async function extractInsights(
  apiKey: string,
  articleChunks: string[]
): Promise<ClassifiedChunk[]> {
  const prompt = `You are a music industry knowledge extractor. For each numbered article excerpt below, extract ACTIONABLE music industry insights.

Rules for what counts as a relevant insight:
- Must be about the MUSIC BUSINESS: artist development, streaming strategy, release rollouts, marketing, A&R, deals, publishing, labels, touring, fan engagement, music business operations, revenue models, etc.
- Must be ACTIONABLE or EDUCATIONAL — something a music manager or label exec could learn from
- Must be SPECIFIC — not vague motivational quotes or generic business advice
- Strip all author attributions and present insights as standalone knowledge

Do NOT include:
- News about specific events, awards, or chart positions (too time-bound)
- Celebrity gossip or personal drama
- Generic business advice that isn't music-specific
- Vague one-liners like "work hard" or "be authentic"

Assign each insight to a chapter:
- "Industry Strategy Insights" (market trends, industry shifts, strategic thinking)
- "Release Strategy Patterns" (releases, rollouts, campaigns, singles, albums, playlisting)
- "Artist Development Tactics" (artist growth, fanbase building, branding, talent development)
- "Music Business Operations" (team building, management, hiring, day-to-day operations)
- "Revenue & Deal Strategy" (revenue streams, deals, advances, royalties, splits, contracts, sync, touring revenue)

Article excerpts:
${articleChunks.map((t, i) => `[${i}] ${t.substring(0, 3000)}`).join("\n\n---\n\n")}

Return ONLY a JSON array of objects with fields:
- index (number — which article excerpt)
- relevant (boolean)
- chapter (string or null)
- insight (string — the extracted insight, rewritten as standalone knowledge, 1-3 sentences max)

If an excerpt has multiple insights, create multiple entries with the same index. No other text.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    console.error("AI extraction failed:", resp.status, await resp.text());
    return [];
  }

  const data = await resp.json();
  const raw = data.choices?.[0]?.message?.content || "";

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("No JSON array in AI response:", raw.substring(0, 300));
    return [];
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("Failed to parse AI extraction:", e);
    return [];
  }
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

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let sources = DEFAULT_SOURCES;
    try {
      const body = await req.json();
      if (body?.sources?.length) sources = body.sources;
    } catch { /* No body, use defaults */ }

    console.log(`Scraping ${sources.length} music industry publications via Firecrawl`);

    const stats = { sources_scraped: 0, articles_found: 0, articles_scraped: 0, insights_extracted: 0, inserted: 0 };
    const seen = new Set<string>();
    const allInserts: { content: string; chapter: string }[] = [];

    for (const source of sources) {
      console.log(`\n--- Processing ${source.name} (${source.url}) ---`);
      stats.sources_scraped++;

      // Step 1: Discover article URLs
      const articleUrls = await discoverArticles(firecrawlKey, source.url);
      stats.articles_found += articleUrls.length;

      if (articleUrls.length === 0) {
        console.log(`No articles found for ${source.name}, skipping`);
        continue;
      }

      // Step 2: Scrape articles (batch of 5 at a time)
      const articleContents: string[] = [];
      for (let i = 0; i < articleUrls.length; i += 5) {
        const batch = articleUrls.slice(i, i + 5);
        const results = await Promise.all(
          batch.map(url => scrapeArticle(firecrawlKey, url))
        );
        for (const content of results) {
          if (content && content.length > 200) {
            articleContents.push(content);
            stats.articles_scraped++;
          }
        }
        // Brief delay between batches
        if (i + 5 < articleUrls.length) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      console.log(`${source.name}: scraped ${articleContents.length} articles with content`);

      // Step 3: Extract insights via AI (process 3 articles at a time)
      for (let i = 0; i < articleContents.length; i += 3) {
        const batch = articleContents.slice(i, i + 3);
        console.log(`Extracting insights from articles ${i + 1}-${i + batch.length} of ${articleContents.length}...`);

        const insights = await extractInsights(lovableApiKey, batch);

        for (const ins of insights) {
          if (!ins.relevant || !ins.chapter || !ins.insight) continue;
          if (ins.insight.length < 40) continue;

          const chapter = CHAPTERS.includes(ins.chapter) ? ins.chapter : CHAPTERS[0];
          const key = ins.insight.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 120);
          if (key.length < 20 || seen.has(key)) continue;
          seen.add(key);

          allInserts.push({
            content: ins.insight.substring(0, 5000),
            chapter,
          });
          stats.insights_extracted++;
        }

        if (i + 3 < articleContents.length) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      // Delay between sources
      await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`\nTotal insights to insert: ${allInserts.length}`);

    // Insert in batches of 50
    for (let i = 0; i < allInserts.length; i += 50) {
      const batch = allInserts.slice(i, i + 50).map(entry => ({
        source: "industry_insights",
        chapter: entry.chapter,
        content: entry.content,
      }));

      const { error } = await adminClient
        .from("rolly_knowledge")
        .upsert(batch, { onConflict: "content", ignoreDuplicates: true });

      if (!error) {
        stats.inserted += batch.length;
      } else {
        for (const row of batch) {
          const { error: singleErr } = await adminClient
            .from("rolly_knowledge")
            .insert(row);
          if (!singleErr) stats.inserted++;
          else console.warn("Insert error:", singleErr.message);
        }
      }
    }

    console.log("Done:", JSON.stringify(stats));

    return new Response(JSON.stringify({
      success: true,
      stats,
      sources_scraped: sources.map(s => s.name),
      sample: allInserts.slice(0, 10).map(u => ({
        chapter: u.chapter,
        preview: u.content.substring(0, 250),
      })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("scrape-knowledge error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
