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

const DEFAULT_HANDLES = [
  "BrianZisook",
  "thatdonnyslater",
  "WorldWideTy",
  "BarryHefner",
];

async function scrapeHandle(firecrawlKey: string, handle: string): Promise<string[]> {
  const url = `https://x.com/${handle}`;
  console.log(`Scraping ${url} via Firecrawl...`);

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
      waitFor: 3000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Firecrawl scrape failed for @${handle}: ${response.status} ${errText}`);
    return [];
  }

  const data = await response.json();
  const markdown = data?.data?.markdown || data?.markdown || "";

  if (!markdown || markdown.length < 50) {
    console.log(`No meaningful content scraped for @${handle}`);
    return [];
  }

  // Split markdown into individual tweet-like blocks
  // Twitter/X pages typically have content separated by line breaks
  const blocks = markdown
    .split(/\n{2,}/)
    .map((b: string) => b.trim())
    .filter((b: string) => b.length >= 30 && b.length <= 2000);

  console.log(`@${handle}: extracted ${blocks.length} text blocks from scraped content`);
  return blocks;
}

interface ClassifiedTweet {
  index: number;
  relevant: boolean;
  chapter: string;
}

async function classifyTweets(
  apiKey: string,
  tweets: string[]
): Promise<ClassifiedTweet[]> {
  const prompt = `You are a music industry content classifier. For each numbered text block below, determine:
1. Is it relevant to the MUSIC INDUSTRY? (artist development, streaming, releases, marketing, A&R, deals, publishing, labels, touring, fan engagement, music business strategy, etc.)
2. If relevant, which chapter best fits:
   - "Industry Strategy Insights" (general strategy, market trends)
   - "Release Strategy Patterns" (releases, rollouts, campaigns, singles, albums)
   - "Artist Development Tactics" (artist growth, fanbase, talent development)
   - "Music Business Operations" (team, roster, hiring, operations, management)
   - "Revenue & Deal Strategy" (revenue, deals, advances, royalties, splits, contracts)

Personal opinions, lifestyle posts, relationship advice, food, sports, UI navigation elements, follower counts, and general life commentary are NOT relevant.

Text blocks:
${tweets.map((t, i) => `[${i}] ${t}`).join("\n\n")}

Return ONLY a JSON array of objects with fields: index (number), relevant (boolean), chapter (string or null if not relevant). No other text.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    console.error("AI classification failed:", resp.status, await resp.text());
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
    console.error("Failed to parse AI classification:", e);
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

    let handles = DEFAULT_HANDLES;
    try {
      const body = await req.json();
      if (body?.handles?.length) handles = body.handles;
    } catch { /* No body, use defaults */ }

    console.log(`Scraping handles via Firecrawl: ${handles.join(", ")}`);

    const stats = { total_blocks: 0, unique: 0, relevant: 0, inserted: 0, duplicates: 0 };
    const seen = new Set<string>();
    const allBlocks: { text: string; anonymized: string }[] = [];

    // Scrape each handle sequentially (to avoid rate limits)
    for (const handle of handles) {
      const blocks = await scrapeHandle(firecrawlKey, handle);
      stats.total_blocks += blocks.length;

      for (const text of blocks) {
        const anonymized = anonymize(text);
        if (anonymized.length < 30) continue;

        const key = anonymized.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 120);
        if (key.length < 15 || seen.has(key)) { stats.duplicates++; continue; }
        seen.add(key);

        allBlocks.push({ text, anonymized });
      }

      // Delay between handles
      if (handles.indexOf(handle) < handles.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    stats.unique = allBlocks.length;
    console.log(`${allBlocks.length} unique blocks to classify`);

    // Classify in batches of 20
    const toInsert: { content: string; chapter: string }[] = [];
    const BATCH_SIZE = 20;

    for (let i = 0; i < allBlocks.length; i += BATCH_SIZE) {
      const batch = allBlocks.slice(i, i + BATCH_SIZE);
      const textsForAI = batch.map(t => t.text);

      console.log(`Classifying batch ${Math.floor(i / BATCH_SIZE) + 1}...`);
      const classifications = await classifyTweets(lovableApiKey, textsForAI);

      for (const c of classifications) {
        if (c.relevant && c.chapter && c.index >= 0 && c.index < batch.length) {
          const chapter = CHAPTERS.includes(c.chapter) ? c.chapter : CHAPTERS[0];
          toInsert.push({
            content: batch[c.index].anonymized.substring(0, 5000),
            chapter,
          });
          stats.relevant++;
        }
      }

      if (i + BATCH_SIZE < allBlocks.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    console.log(`${toInsert.length} relevant music industry insights to insert`);

    // Insert in batches of 50
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50).map(entry => ({
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
      handles_scraped: handles,
      sample: toInsert.slice(0, 5).map(u => ({
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
