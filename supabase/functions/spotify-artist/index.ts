// Spotify artist detail edge function - fetches banner, monthly listeners
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
  if (!resp.ok) throw new Error("Spotify token error: " + resp.status);
  const data = await resp.json();
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let spotifyId = "";
    if (req.method === "POST") {
      try {
        const body = await req.json();
        spotifyId = body.spotify_id || "";
      } catch (e) {
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

    // Fetch artist info from API
    const artistResp = await fetchWithRetry(`https://api.spotify.com/v1/artists/${spotifyId}`);
    if (!artistResp.ok) throw new Error("Spotify artist error: " + artistResp.status);
    const artist = await artistResp.json();

    const images = artist.images ?? [];
    const largestImage = images.length > 0 ? images[0].url : null;

    // Scrape monthly listeners and header/banner image from Spotify's public artist page
    let monthlyListeners = 0;
    let bannerUrl: string | null = null;
    try {
      const pageResp = await fetch(`https://open.spotify.com/artist/${spotifyId}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      });
      if (pageResp.ok) {
        const html = await pageResp.text();
        // Monthly listeners
        const listenersMatch = html.match(/"monthlyListeners"\s*:\s*(\d+)/);
        if (listenersMatch) {
          monthlyListeners = parseInt(listenersMatch[1], 10);
        }
        // Header/banner image - look for the visual/header image patterns in embedded data
        // Spotify embeds header images as "headerImage" or in "extractedColors" with wide images
        const headerMatch = html.match(/"headerImage"\s*:\s*\{\s*"url"\s*:\s*"([^"]+)"/);
        if (headerMatch) {
          bannerUrl = headerMatch[1];
        }
        // Fallback: look for wide banner images in the visuals data
        if (!bannerUrl) {
          const visualsMatch = html.match(/"visuals"\s*:\s*\{[^}]*"headerImage"\s*:\s*\{[^}]*"sources"\s*:\s*\[\s*\{\s*"url"\s*:\s*"([^"]+)"/);
          if (visualsMatch) {
            bannerUrl = visualsMatch[1];
          }
        }
        // Another pattern: look for wide i.scdn.co images (typically 2660x1140 or similar banner dims)
        if (!bannerUrl) {
          const allImages = [...html.matchAll(/https:\/\/i\.scdn\.co\/image\/[a-f0-9]+/g)].map(m => m[0]);
          // Try to find the banner by checking for unique images not in the profile images list
          const profileImageUrls = new Set(images.map((img: any) => img.url));
          const uniqueImages = allImages.filter(url => !profileImageUrls.has(url));
          // The header image is typically the first unique wide image referenced
          if (uniqueImages.length > 0) {
            bannerUrl = uniqueImages[0];
          }
        }
      }
    } catch (e) {
      console.warn("Could not scrape artist page:", e);
    }

    return new Response(JSON.stringify({
      id: artist.id,
      name: artist.name,
      monthly_listeners: monthlyListeners || (artist.followers?.total ?? 0),
      followers: artist.followers?.total ?? 0,
      genres: artist.genres ?? [],
      images,
      banner_url: bannerUrl,
      popularity: artist.popularity ?? 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Spotify function error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
