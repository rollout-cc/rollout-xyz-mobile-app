// Spotify artist detail edge function - fetches artist data from Spotify API
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

    // Fetch artist info from official API
    const artistResp = await fetchWithRetry(`https://api.spotify.com/v1/artists/${spotifyId}`);
    if (!artistResp.ok) throw new Error("Spotify artist error: " + artistResp.status);
    const artist = await artistResp.json();

    return new Response(JSON.stringify({
      id: artist.id,
      name: artist.name,
      monthly_listeners: artist.followers?.total ?? 0,
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
