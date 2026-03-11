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

function pickChapter(text: string): string {
  const l = text.toLowerCase();
  if (/release|rollout|campaign|single|album|ep\b|drop|pre-save/.test(l)) return CHAPTERS[1];
  if (/artist|develop|grow|fanbase|audience|talent/.test(l)) return CHAPTERS[2];
  if (/revenue|deal|advance|recoup|royalt|split|contract|money/.test(l)) return CHAPTERS[4];
  if (/team|roster|hire|staff|manage|operation|company/.test(l)) return CHAPTERS[3];
  return CHAPTERS[0];
}

const DEFAULT_HANDLES = [
  "BrianZisook",
  "thatdonnyslater",
  "WorldWideTy",
  "BarryHefner",
];

async function runApifyActor(apifyToken: string, handles: string[], maxTweets: number): Promise<any[]> {
  // Using apidojo/tweet-scraper with startUrls format
  const actorId = "apidojo~tweet-scraper";

  const startResp = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: handles.map(h => ({ url: `https://x.com/${h}` })),
        maxItems: maxTweets,
        sort: "Latest",
        tweetLanguage: "en",
      }),
    }
  );

  if (!startResp.ok) {
    const errText = await startResp.text();
    throw new Error(`Apify start failed [${startResp.status}]: ${errText}`);
  }

  const runData = await startResp.json();
  const runId = runData?.data?.id;
  if (!runId) throw new Error("No run ID returned from Apify");

  console.log(`Apify run started: ${runId}`);

  const maxWait = 5 * 60 * 1000;
  const pollInterval = 10_000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, pollInterval));

    const statusResp = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`
    );
    if (!statusResp.ok) {
      await statusResp.text();
      continue;
    }

    const statusData = await statusResp.json();
    const status = statusData?.data?.status;
    console.log(`Run ${runId} status: ${status}`);

    if (status === "SUCCEEDED") {
      const datasetId = statusData?.data?.defaultDatasetId;
      if (!datasetId) throw new Error("No dataset ID");

      const itemsResp = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&limit=10000`
      );
      if (!itemsResp.ok) {
        const t = await itemsResp.text();
        throw new Error(`Dataset fetch failed: ${t}`);
      }

      return await itemsResp.json();
    }

    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new Error(`Apify run ${status}`);
    }
  }

  throw new Error("Apify run timed out waiting for completion");
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

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let handles = DEFAULT_HANDLES;
    let maxTweets = 2000;
    try {
      const body = await req.json();
      if (body?.handles?.length) handles = body.handles;
      if (body?.maxTweets) maxTweets = Math.min(body.maxTweets, 10000);
    } catch {
      // No body, use defaults
    }

    console.log(`Scraping ${maxTweets} tweets from: ${handles.join(", ")}`);

    const tweets = await runApifyActor(apifyToken, handles, maxTweets);
    console.log(`Got ${tweets.length} tweets from Apify`);

    // Debug: return raw first 3 tweets in response to diagnose field names
    const debugRaw = tweets.slice(0, 3).map(t => {
      const keys = Object.keys(t || {});
      return { keys, snippet: JSON.stringify(t).substring(0, 500) };
    });

    // Debug: log first 3 raw tweet objects to identify field names
    for (let d = 0; d < Math.min(3, tweets.length); d++) {
      console.log(`RAW TWEET ${d}:`, JSON.stringify(tweets[d]).substring(0, 1500));
    }

    const stats = { total_tweets: tweets.length, matched: 0, inserted: 0, duplicates: 0 };

    const seen = new Set<string>();
    const toInsert: { content: string; chapter: string }[] = [];

    for (const tweet of tweets) {
      // Try multiple possible field names from different actors
      const text = tweet?.full_text || tweet?.text || tweet?.tweetText || tweet?.tweet_text || tweet?.content || "";
      if (!text || text.length < 20) continue;

      stats.matched++;

      const anonymized = anonymize(text);
      if (anonymized.length < 20) continue;

      const key = anonymized.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 120);
      if (key.length < 15 || seen.has(key)) {
        stats.duplicates++;
        continue;
      }
      seen.add(key);

      toInsert.push({
        content: anonymized.substring(0, 5000),
        chapter: pickChapter(anonymized),
      });
    }

    console.log(`${toInsert.length} unique insights to insert`);

    // Batch insert (chunks of 50)
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
      debug_raw: debugRaw,
      sample: toInsert.slice(0, 3).map(u => ({
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
