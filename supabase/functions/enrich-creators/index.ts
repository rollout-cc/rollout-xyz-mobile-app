import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizeHandle(raw: string): string {
  let h = raw.trim();
  // Remove URL prefixes
  h = h.replace(/^https?:\/\/(www\.)?(instagram\.com|tiktok\.com|twitter\.com|x\.com|youtube\.com)\/@?/i, "");
  // Remove trailing slashes
  h = h.replace(/\/+$/, "");
  // Remove @ prefix
  h = h.replace(/^@/, "");
  // Lowercase
  return h.toLowerCase();
}

function guessPlatformFromHandle(handle: string): string {
  if (/spotify/i.test(handle) || /playlist/i.test(handle)) return "spotify_playlist";
  return "instagram"; // default
}

interface CreatorInput {
  handle: string;
  platform?: string;
  category?: string;
  subcategory?: string;
  genre_fit?: string[];
  audience_type?: string;
  follower_count?: number;
  average_views?: number;
  median_views?: number;
  engagement_rate?: number;
  posting_frequency?: string;
  content_style?: string;
  contact_info?: string;
  rate?: string;
  artist_affinity?: string[];
  notes?: string;
  url?: string;
  source?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { creators, team_id, mode } = await req.json();
    // mode: "paste" | "csv" | "enrich_existing"

    if (!team_id) {
      return new Response(JSON.stringify({ error: "team_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user is owner/manager
    const { data: membership } = await adminClient
      .from("team_memberships")
      .select("role")
      .eq("team_id", team_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["team_owner", "manager"].includes(membership.role)) {
      return new Response(JSON.stringify({ error: "Only owners/managers can manage creators" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "enrich_existing") {
      // Use AI to enrich records with missing fields
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const { data: records } = await adminClient
        .from("creator_intelligence")
        .select("*")
        .or(`team_id.is.null,team_id.eq.${team_id}`)
        .is("category", null)
        .limit(20);

      if (!records || records.length === 0) {
        return new Response(JSON.stringify({ enriched: 0, message: "No records need enrichment" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Batch enrich via AI
      const prompt = `For each creator below, estimate: category (e.g. Culture News, Comedy, Dance, Music, Lifestyle), subcategory, genre_fit (array of genres like hip-hop, r&b, pop, indie), audience_type (street, college, mainstream, niche), and a confidence_score (0.3-0.8).
Return JSON array with objects: { handle, category, subcategory, genre_fit, audience_type, confidence_score }

Creators:
${records.map((r: any) => `- ${r.handle} (${r.platform}, followers: ${r.follower_count || "unknown"})`).join("\n")}`;

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: "You are a music industry data analyst. Return only valid JSON." },
            { role: "user", content: prompt },
          ],
          stream: false,
        }),
      });

      let enriched = 0;
      if (aiRes.ok) {
        const aiResult = await aiRes.json();
        const content = aiResult.choices?.[0]?.message?.content || "";
        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const enrichments = JSON.parse(jsonMatch[0]);
            for (const e of enrichments) {
              const record = records.find((r: any) => r.handle.toLowerCase() === e.handle?.toLowerCase());
              if (record) {
                await adminClient.from("creator_intelligence").update({
                  category: e.category || null,
                  subcategory: e.subcategory || null,
                  genre_fit: e.genre_fit || null,
                  audience_type: e.audience_type || null,
                  confidence_score: e.confidence_score || 0.5,
                  confidence_label: (e.confidence_score || 0.5) >= 0.7 ? "High Confidence" : (e.confidence_score || 0.5) >= 0.4 ? "Medium Confidence" : "Experimental",
                  source: "web_enrichment",
                }).eq("id", record.id);
                enriched++;
              }
            }
          }
        } catch (parseErr) {
          console.error("AI enrichment parse error:", parseErr);
        }
      }

      return new Response(JSON.stringify({ enriched, message: `Enriched ${enriched} records` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // mode === "paste" or "csv" — process incoming creators
    if (!creators || !Array.isArray(creators) || creators.length === 0) {
      return new Response(JSON.stringify({ error: "creators array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch existing handles for dedup
    const { data: existing } = await adminClient
      .from("creator_intelligence")
      .select("id, handle, platform")
      .or(`team_id.is.null,team_id.eq.${team_id}`);

    const existingMap = new Map(
      (existing || []).map((e: any) => [`${e.platform}:${e.handle.toLowerCase()}`, e.id])
    );

    const results = { inserted: 0, duplicates: 0, errors: 0, details: [] as any[] };
    const sourceType = mode === "csv" ? "csv_import" : (mode === "screenshot_ocr" ? "screenshot_ocr" : "manual");

    for (const raw of creators) {
      const handle = normalizeHandle(raw.handle || "");
      if (!handle) {
        results.errors++;
        continue;
      }

      const platform = raw.platform || guessPlatformFromHandle(handle);
      const key = `${platform}:${handle}`;

      if (existingMap.has(key)) {
        // Update existing record with any new non-null fields
        const existingId = existingMap.get(key);
        const updates: any = {};
        if (raw.follower_count && !isNaN(raw.follower_count)) updates.follower_count = Number(raw.follower_count);
        if (raw.average_views && !isNaN(raw.average_views)) updates.average_views = Number(raw.average_views);
        if (raw.engagement_rate && !isNaN(raw.engagement_rate)) updates.engagement_rate = Number(raw.engagement_rate);
        if (raw.rate) updates.rate = raw.rate;
        if (raw.contact_info) updates.contact_info = raw.contact_info;
        if (raw.category) updates.category = raw.category;
        if (raw.notes) updates.notes = raw.notes;
        if (raw.url) updates.url = raw.url;
        updates.last_verified_date = new Date().toISOString().split("T")[0];

        if (Object.keys(updates).length > 1) {
          await adminClient.from("creator_intelligence").update(updates).eq("id", existingId);
        }
        results.duplicates++;
        results.details.push({ handle, status: "updated" });
        continue;
      }

      const confidence = raw.confidence_score || 0.4;
      const { error } = await adminClient.from("creator_intelligence").insert({
        handle,
        platform,
        team_id: raw.global ? null : team_id,
        category: raw.category || null,
        subcategory: raw.subcategory || null,
        genre_fit: raw.genre_fit || null,
        audience_type: raw.audience_type || null,
        follower_count: raw.follower_count ? Number(raw.follower_count) : null,
        average_views: raw.average_views ? Number(raw.average_views) : null,
        median_views: raw.median_views ? Number(raw.median_views) : null,
        engagement_rate: raw.engagement_rate ? Number(raw.engagement_rate) : null,
        posting_frequency: raw.posting_frequency || null,
        content_style: raw.content_style || null,
        contact_info: raw.contact_info || null,
        rate: raw.rate || null,
        artist_affinity: raw.artist_affinity || null,
        notes: raw.notes || null,
        url: raw.url || null,
        source: raw.source || sourceType,
        confidence_score: confidence,
        confidence_label: confidence >= 0.7 ? "High Confidence" : confidence >= 0.4 ? "Medium Confidence" : "Experimental",
        last_verified_date: new Date().toISOString().split("T")[0],
      });

      if (error) {
        results.errors++;
        results.details.push({ handle, status: "error", message: error.message });
      } else {
        results.inserted++;
        results.details.push({ handle, status: "created" });
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-creators error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
