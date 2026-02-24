// Edge function: scrape ChartMasters artist dashboard for performance data
// Scrapes chartmasters.org/artist/{spotifyId} and extracts streams, revenue, etc.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseNumber(raw: string): number {
  // Handle formats like "335.1m", "1.8m", "308.0k", "164.3k", "$26.1k"
  const cleaned = raw.replace(/[$,]/g, "").trim();
  const match = cleaned.match(/^([\d.]+)\s*([mkbt])?$/i);
  if (!match) return 0;
  const base = parseFloat(match[1]);
  if (isNaN(base)) return 0;
  const suffix = (match[2] || "").toLowerCase();
  const multiplier: Record<string, number> = { t: 1e12, b: 1e9, m: 1e6, k: 1e3 };
  return Math.round(base * (multiplier[suffix] || 1));
}

interface PerformanceData {
  chartmasters_artist_name: string;
  lead_streams_total: number;
  feat_streams_total: number;
  daily_streams: number;
  monthly_streams: number;
  monthly_listeners_all: number;
  est_monthly_revenue: number;
  raw_markdown: string;
}

function parseChartmastersMarkdown(markdown: string): PerformanceData {
  const data: PerformanceData = {
    chartmasters_artist_name: "",
    lead_streams_total: 0,
    feat_streams_total: 0,
    daily_streams: 0,
    monthly_streams: 0,
    monthly_listeners_all: 0,
    est_monthly_revenue: 0,
    raw_markdown: markdown,
  };

  // Extract artist name from markdown (appears as "# ArtistName" after "# Artist dashboard")
  const nameMatch = markdown.match(/# Artist dashboard[\s\S]*?# ([^\n]+)/);
  if (nameMatch) {
    data.chartmasters_artist_name = nameMatch[1].trim();
  }

  // The markdown has lines like:
  // "Lead streams 335.1m"
  // "Feat streams 565.3k"
  // "Daily streams 164.3k"
  // "Monthly streams 5.3m"
  // "Monthly revenue $26.1k"
  // "Monthly listeners 3.0m" (under "On-demand audio streams" section)

  const lines = markdown.split("\n");
  let inOnDemandSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Track which section we're in
    if (/on-demand audio streams/i.test(line)) {
      inOnDemandSection = true;
      continue;
    }
    // Reset section if we hit another major section header
    if (/^(Sales|Social Media|Databases|Trends|Rankings|Milestones)/i.test(line) && !(/on-demand/i.test(line))) {
      inOnDemandSection = false;
    }

    // Parse "Spotify statistics" section (appears first)
    if (!inOnDemandSection) {
      let m;
      m = line.match(/^Lead streams\s+([\d.$]+[mkbt]?)/i);
      if (m && data.lead_streams_total === 0) { data.lead_streams_total = parseNumber(m[1]); continue; }

      m = line.match(/^Feat streams\s+([\d.$]+[mkbt]?)/i);
      if (m && data.feat_streams_total === 0) { data.feat_streams_total = parseNumber(m[1]); continue; }
    }

    // Parse "Trends & Indicators" section
    {
      let m;
      m = line.match(/^Daily streams\s+([\d.$]+[mkbt]?)/i);
      if (m) { data.daily_streams = parseNumber(m[1]); continue; }

      m = line.match(/^Monthly streams\s+([\d.$]+[mkbt]?)/i);
      if (m) { data.monthly_streams = parseNumber(m[1]); continue; }
    }

    // Parse "On-demand audio streams" section
    if (inOnDemandSection) {
      let m;
      m = line.match(/^Lead streams\s+([\d.$]+[mkbt]?)/i);
      if (m) { data.lead_streams_total = parseNumber(m[1]); continue; }

      m = line.match(/^Feat streams\s+([\d.$]+[mkbt]?)/i);
      if (m) { data.feat_streams_total = parseNumber(m[1]); continue; }

      m = line.match(/^Monthly listeners\s+([\d.$]+[mkbt]?)/i);
      if (m) { data.monthly_listeners_all = parseNumber(m[1]); continue; }

      m = line.match(/^Monthly revenue\s+\$?([\d.$]+[mkbt]?)/i);
      if (m) { data.est_monthly_revenue = parseNumber(m[1]); continue; }
    }
  }

  return data;
}

async function scrapeArtistDashboard(spotifyId: string, firecrawlKey: string): Promise<string> {
  const url = `https://chartmasters.org/artist/${spotifyId}`;
  console.log("Scraping ChartMasters:", url);

  const doScrape = async () => {
    return await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 5000,
        timeout: 60000,
      }),
    });
  };

  let resp = await doScrape();
  let result = await resp.json();

  // Retry once on timeout or server error
  if (!resp.ok && (resp.status === 408 || resp.status >= 500)) {
    console.log(`Firecrawl returned ${resp.status}, retrying once...`);
    resp = await doScrape();
    result = await resp.json();
  }

  if (!resp.ok) {
    throw new Error(`Firecrawl error ${resp.status}: ${JSON.stringify(result)}`);
  }

  return result?.data?.markdown || result?.markdown || "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    let artistId = "";
    let spotifyId = "";
    let artistName = "";
    if (req.method === "POST") {
      const body = await req.json();
      artistId = body.artist_id || "";
      spotifyId = body.spotify_id || "";
      artistName = body.artist_name || "";
    }

    if (!artistId || !spotifyId) {
      return new Response(JSON.stringify({ error: "artist_id and spotify_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Scrape ChartMasters
    const markdown = await scrapeArtistDashboard(spotifyId, firecrawlKey);
    if (!markdown) {
      return new Response(JSON.stringify({ error: "No data returned from ChartMasters" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the data
    const perfData = parseChartmastersMarkdown(markdown);

    // Verify artist name matches to prevent ChartMasters ID mismatch
    if (artistName && perfData.chartmasters_artist_name) {
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const ourName = normalize(artistName);
      const cmName = normalize(perfData.chartmasters_artist_name);
      if (ourName && cmName && !cmName.includes(ourName) && !ourName.includes(cmName)) {
        console.warn(`Artist name mismatch: ours="${artistName}", ChartMasters="${perfData.chartmasters_artist_name}"`);
        return new Response(JSON.stringify({
          error: `ChartMasters returned data for "${perfData.chartmasters_artist_name}" instead of "${artistName}". This artist may not be indexed correctly on ChartMasters.`,
          mismatch: true,
          chartmasters_name: perfData.chartmasters_artist_name,
        }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log("Parsed performance data:", JSON.stringify({
      chartmasters_artist: perfData.chartmasters_artist_name,
      lead_streams_total: perfData.lead_streams_total,
      daily_streams: perfData.daily_streams,
      monthly_streams: perfData.monthly_streams,
      est_monthly_revenue: perfData.est_monthly_revenue,
    }));

    // Upsert into artist_performance_snapshots
    const { data: snapshot, error: upsertErr } = await supabase
      .from("artist_performance_snapshots")
      .upsert(
        {
          artist_id: artistId,
          lead_streams_total: perfData.lead_streams_total,
          feat_streams_total: perfData.feat_streams_total,
          daily_streams: perfData.daily_streams,
          monthly_streams: perfData.monthly_streams,
          monthly_listeners_all: perfData.monthly_listeners_all,
          est_monthly_revenue: perfData.est_monthly_revenue,
          raw_markdown: perfData.raw_markdown.substring(0, 10000), // Cap storage
          scraped_at: new Date().toISOString(),
        },
        { onConflict: "artist_id" }
      )
      .select()
      .single();

    if (upsertErr) {
      console.error("Upsert error:", upsertErr);
      throw new Error(`Database error: ${upsertErr.message}`);
    }

    return new Response(JSON.stringify({ success: true, data: snapshot }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("scrape-chartmasters error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
