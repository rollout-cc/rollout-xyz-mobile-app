// Spotify search edge function
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
  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials not configured");
  }

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(clientId + ":" + clientSecret),
    },
    body: "grant_type=client_credentials",
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error("Spotify token error: " + resp.status + " " + text);
  }

  const data = await resp.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken!;
}

/** Extract Spotify artist ID from a URL like https://open.spotify.com/artist/0WB5rykKeHBde6sSIfg4jj */
function extractSpotifyArtistId(input: string): string | null {
  const trimmed = input.trim();
  // Match open.spotify.com/artist/<id> with optional query/hash
  const match = trimmed.match(/open\.spotify\.com\/artist\/([a-zA-Z0-9]+)/);
  if (match) return match[1];
  // Match spotify:artist:<id> URI format
  const uriMatch = trimmed.match(/^spotify:artist:([a-zA-Z0-9]+)$/);
  if (uriMatch) return uriMatch[1];
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let query = "";
    if (req.method === "POST") {
      const body = await req.json();
      query = body.q || "";
    } else {
      const url = new URL(req.url);
      query = url.searchParams.get("q") || "";
    }

    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ artists: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if input is a Spotify URL/URI — fetch artist directly by ID
    const spotifyId = extractSpotifyArtistId(query);
    if (spotifyId) {
      let token = await getSpotifyToken();
      const artistUrl = `https://api.spotify.com/v1/artists/${spotifyId}`;
      let resp = await fetch(artistUrl, { headers: { Authorization: "Bearer " + token } });
      if (resp.status === 401 || resp.status === 403) {
        cachedToken = null;
        tokenExpiresAt = 0;
        token = await getSpotifyToken();
        resp = await fetch(artistUrl, { headers: { Authorization: "Bearer " + token } });
      }
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error("Spotify API error: " + resp.status + " " + text);
      }
      const a = await resp.json();
      const artists = [{
        id: a.id,
        name: a.name,
        genres: a.genres ?? [],
        images: a.images ?? [],
        followers: a.followers?.total ?? 0,
      }];
      return new Response(JSON.stringify({ artists }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Regular text search
    let token = await getSpotifyToken();
    const spotifyUrl = "https://api.spotify.com/v1/search?q=" + encodeURIComponent(query) + "&type=artist&limit=8";

    let resp = await fetch(spotifyUrl, {
      headers: { Authorization: "Bearer " + token },
    });

    if (resp.status === 401 || resp.status === 403) {
      cachedToken = null;
      tokenExpiresAt = 0;
      token = await getSpotifyToken();
      resp = await fetch(spotifyUrl, {
        headers: { Authorization: "Bearer " + token },
      });
    }

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error("Spotify API error: " + resp.status + " " + text);
    }

    const data = await resp.json();
    const artists = (data.artists?.items ?? []).map((a: Record<string, unknown>) => ({
      id: a.id,
      name: a.name,
      genres: (a.genres as string[]) ?? [],
      images: (a.images as Array<{ url: string }>) ?? [],
      followers: (a.followers as Record<string, number>)?.total ?? 0,
    }));

    return new Response(JSON.stringify({ artists }), {
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
