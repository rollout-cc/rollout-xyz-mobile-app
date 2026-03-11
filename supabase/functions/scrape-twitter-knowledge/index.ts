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

async function scrapeHandle(apifyToken: string, handle: string): Promise<any[]> {
  const actorId = "data-slayer~twitter-user-tweets";

  const startResp = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: handle }),
    }
  );

  if (!startResp.ok) {
    const errText = await startResp.text();
    console.error(`Apify start failed for ${handle}: ${errText}`);
    return [];
  }

  const runData = await startResp.json();
  const runId = runData?.data?.id;
  if (!runId) { console.error(`No run ID for ${handle}`); return []; }

  console.log(`Run started for @${handle}: ${runId}`);

  const maxWait = 5 * 60 * 1000;
  const pollInterval = 10_000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, pollInterval));

    const statusResp = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`
    );
    if (!statusResp.ok) { await statusResp.text(); continue; }

    const statusData = await statusResp.json();
    const status = statusData?.data?.status;
    console.log(`@${handle} run ${runId}: ${status}`);

    if (status === "SUCCEEDED") {
      const datasetId = statusData?.data?.defaultDatasetId;
      if (!datasetId) return [];

      const itemsResp = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&limit=10000`
      );
      if (!itemsResp.ok) return [];
      return await itemsResp.json();
    }

    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      console.error(`@${handle} run ${status}`);
      return [];
    }
  }

  console.error(`@${handle} timed out`);
  return [];
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
  const prompt = `You are a music industry content classifier. For each numbered tweet below, determine:
1. Is it relevant to the MUSIC INDUSTRY? (artist development, streaming, releases, marketing, A&R, deals, publishing, labels, touring, fan engagement, music business strategy, etc.)
2. If relevant, which chapter best fits:
   - "Industry Strategy Insights" (general strategy, market trends)
   - "Release Strategy Patterns" (releases, rollouts, campaigns, singles, albums)
   - "Artist Development Tactics" (artist growth, fanbase, talent development)
   - "Music Business Operations" (team, roster, hiring, operations, management)
   - "Revenue & Deal Strategy" (revenue, deals, advances, royalties, splits, contracts)

Personal opinions, lifestyle posts, relationship advice, food, sports, and general life commentary are NOT relevant.

Tweets:
${tweets.map((t, i) => `[${i}] ${t}`).join("\n")}

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

  // Extract JSON array from response
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
    const apifyToken = Deno.env.get("APIFY_API_TOKEN");
    if (!apifyToken) {
      return new Response(JSON.stringify({ error: "APIFY_API_TOKEN not configured" }), {
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

    console.log(`Scraping handles: ${handles.join(", ")}`);

    // Scrape all handles sequentially
    let allTweets: any[] = [];
    for (const handle of handles) {
      const tweets = await scrapeHandle(apifyToken, handle);
      console.log(`@${handle}: ${tweets.length} tweets`);
      allTweets = allTweets.concat(tweets);
    }

    console.log(`Total tweets from all handles: ${allTweets.length}`);

    const stats = { total_tweets: allTweets.length, matched: 0, relevant: 0, inserted: 0, duplicates: 0 };
    const seen = new Set<string>();

    // Extract and deduplicate tweet texts
    const tweetTexts: { text: string; anonymized: string }[] = [];
    for (const tweet of allTweets) {
      const text = tweet?.text || tweet?.full_text || "";
      if (!text || text.length < 20) continue;
      stats.matched++;

      const anonymized = anonymize(text);
      if (anonymized.length < 20) continue;

      const key = anonymized.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 120);
      if (key.length < 15 || seen.has(key)) { stats.duplicates++; continue; }
      seen.add(key);

      tweetTexts.push({ text, anonymized });
    }

    console.log(`${tweetTexts.length} unique tweets to classify`);

    // Classify in batches of 20
    const toInsert: { content: string; chapter: string }[] = [];
    const BATCH_SIZE = 20;

    for (let i = 0; i < tweetTexts.length; i += BATCH_SIZE) {
      const batch = tweetTexts.slice(i, i + BATCH_SIZE);
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

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < tweetTexts.length) {
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
