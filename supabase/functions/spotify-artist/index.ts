// Spotify artist detail edge function
// Fetches artist data from official API + scrapes monthly listeners via Firecrawl
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Spotify credentials not configured");

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(clientId + ":" + clientSecret),
    },
    body: "grant_type=client_credentials",
  });
  const data = await resp.json();
  if (!resp.ok || !data.access_token) throw new Error("Spotify token error: " + resp.status);
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken!;
}

async function fetchWithRetry(url: string): Promise<Response> {
  let token = await getSpotifyToken();
  let resp = await fetch(url, { headers: { Authorization: "Bearer " + token } });
  if (resp.status === 401 || resp.status === 403) {
    cachedToken = null;
    tokenExpiresAt = 0;
    token = await getSpotifyToken();
    resp = await fetch(url, { headers: { Authorization: "Bearer " + token } });
  }
  return resp;
}

/** Scrape monthly listeners from Spotify's public artist page using Firecrawl */
async function scrapeMonthlyListeners(spotifyId: string): Promise<number> {
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey) {
    console.log("FIRECRAWL_API_KEY not configured, skipping monthly listeners scrape");
    return 0;
  }

  try {
    const url = `https://open.spotify.com/artist/${spotifyId}`;
    console.log("Scraping monthly listeners from:", url);

    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlKey}`,
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

    const result = await resp.json();

    if (!resp.ok) {
      console.error("Firecrawl API error:", resp.status, JSON.stringify(result));
      return 0;
    }

    // Extract markdown content from response
    const markdown = result?.data?.markdown || result?.markdown || "";
    
    if (!markdown) {
      console.log("No markdown content returned from Firecrawl");
      return 0;
    }

    // Parse monthly listeners from the scraped content
    // Pattern: "118,474,283 monthly listeners" or similar
    const patterns = [
      /([\d,]+)\s+monthly\s+listener/i,
      /monthly\s+listener[s]?\s*[:\-–]\s*([\d,]+)/i,
      /([\d,]+)\s*monthly/i,
    ];

    for (const pattern of patterns) {
      const match = markdown.match(pattern);
      if (match) {
        const numStr = match[1].replace(/,/g, "");
        const num = parseInt(numStr, 10);
        if (num > 0) {
          console.log("Found monthly listeners:", num);
          return num;
        }
      }
    }

    // Also try to find it in any format like "118.4M monthly listeners"
    const shortMatch = markdown.match(/([\d.]+)\s*([MKB])\s*monthly\s+listener/i);
    if (shortMatch) {
      const base = parseFloat(shortMatch[1]);
      const multiplier = { M: 1e6, K: 1e3, B: 1e9 }[shortMatch[2].toUpperCase()] || 1;
      const num = Math.round(base * multiplier);
      if (num > 0) {
        console.log("Found monthly listeners (short format):", num);
        return num;
      }
    }

    console.log("Could not parse monthly listeners from scraped content. First 500 chars:", markdown.substring(0, 500));
    return 0;
  } catch (err) {
    console.error("Scrape error:", err);
    return 0;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let spotifyId = "";
    if (req.method === "POST") {
      try {
        const body = await req.json();
        spotifyId = body.spotify_id || "";
      } catch {
        spotifyId = new URL(req.url).searchParams.get("spotify_id") || "";
      }
    } else {
      spotifyId = new URL(req.url).searchParams.get("spotify_id") || "";
    }

    if (!spotifyId) {
      return new Response(JSON.stringify({ error: "spotify_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch artist info from official API + scrape monthly listeners in parallel
    const [artistResp, monthlyListeners] = await Promise.all([
      fetchWithRetry(`https://api.spotify.com/v1/artists/${spotifyId}`),
      scrapeMonthlyListeners(spotifyId),
    ]);

    if (!artistResp.ok) {
      const errText = await artistResp.text();
      console.error("Spotify API error:", artistResp.status, errText);
      throw new Error("Spotify artist error: " + artistResp.status);
    }
    const artist = await artistResp.json();

    return new Response(JSON.stringify({
      id: artist.id,
      name: artist.name,
      monthly_listeners: monthlyListeners,
      followers: artist.followers?.total ?? 0,
      genres: artist.genres ?? [],
      images: artist.images ?? [],
      banner_url: null,
      popularity: artist.popularity ?? 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
