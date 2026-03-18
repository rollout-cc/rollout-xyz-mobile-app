import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, supabaseKey);

    // Get all unique brands from artist_travel_info favorite_brands
    const { data: travelInfo } = await admin
      .from("artist_travel_info")
      .select("artist_id, favorite_brands, artists!artist_travel_info_artist_id_fkey(name, team_id)")
      .not("favorite_brands", "is", null);

    if (!travelInfo?.length) {
      return new Response(JSON.stringify({ message: "No brands to check" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build brand → artists map
    const brandArtists: Record<string, { artistId: string; artistName: string; teamId: string }[]> = {};
    for (const info of travelInfo) {
      const brands = (info.favorite_brands || "").split(",").map((b: string) => b.trim()).filter(Boolean);
      const artist = info.artists as any;
      if (!artist) continue;
      for (const brand of brands) {
        const key = brand.toLowerCase();
        if (!brandArtists[key]) brandArtists[key] = [];
        brandArtists[key].push({
          artistId: info.artist_id,
          artistName: artist.name,
          teamId: artist.team_id,
        });
      }
    }

    const uniqueBrands = Object.keys(brandArtists);
    let alertsCreated = 0;

    for (const brand of uniqueBrands.slice(0, 5)) {
      // Search for recent drops using Firecrawl search
      try {
        const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `${brand} new collection drop 2026`,
            limit: 3,
            tbs: "qdr:w", // last week
          }),
        });

        if (!searchResp.ok) continue;
        const searchData = await searchResp.json();
        if (!searchData.data?.length) continue;

        // Use AI to evaluate if any result is a genuine new drop
        const summaries = searchData.data
          .map((r: any) => `Title: ${r.title}\nURL: ${r.url}\nDescription: ${r.description || ""}`)
          .join("\n---\n");

        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `You analyze search results to determine if a fashion brand has a new collection, collaboration, or limited edition drop. Return structured data only for GENUINE new releases from the past week.`,
              },
              {
                role: "user",
                content: `Brand: "${brand}"\n\nSearch results:\n${summaries}\n\nIs there a genuine new drop from this brand?`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "report_drop",
                  description: "Report a new brand drop if found",
                  parameters: {
                    type: "object",
                    properties: {
                      is_new_drop: { type: "boolean" },
                      headline: { type: "string", description: "Short headline for the drop" },
                      url: { type: "string", description: "Best URL for the drop" },
                      drop_type: { type: "string", enum: ["collection", "collab", "limited"] },
                    },
                    required: ["is_new_drop"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "report_drop" } },
          }),
        });

        if (!aiResp.ok) continue;
        const aiData = await aiResp.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall?.function?.arguments) continue;

        const parsed = JSON.parse(toolCall.function.arguments);
        if (!parsed.is_new_drop || !parsed.headline) continue;

        // Check if we already have this alert (avoid duplicates)
        const artists = brandArtists[brand];
        const teamIds = [...new Set(artists.map((a) => a.teamId))];

        for (const teamId of teamIds) {
          const { data: existing } = await admin
            .from("brand_alerts")
            .select("id")
            .eq("team_id", teamId)
            .eq("brand_name", brand)
            .eq("headline", parsed.headline)
            .limit(1);

          if (existing?.length) continue;

          const { data: alert } = await admin
            .from("brand_alerts")
            .insert({
              team_id: teamId,
              brand_name: brand,
              headline: parsed.headline,
              url: parsed.url || null,
              drop_type: parsed.drop_type || "collection",
            })
            .select("id")
            .single();

          if (alert) {
            const teamArtists = artists.filter((a) => a.teamId === teamId);
            await admin.from("brand_alert_artist_matches").insert(
              teamArtists.map((a) => ({
                alert_id: alert.id,
                artist_id: a.artistId,
                artist_name: a.artistName,
              }))
            );
            alertsCreated++;
          }
        }
      } catch (e) {
        console.error(`Error checking brand ${brand}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ message: `Checked ${uniqueBrands.length} brands, created ${alertsCreated} alerts` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("check-brand-drops error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
