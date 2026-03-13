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
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await sb.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { items, team_id } = await req.json();

    if (!team_id) {
      return new Response(JSON.stringify({ error: "team_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all artists for this team to resolve names → IDs
    const { data: artists } = await sb
      .from("artists")
      .select("id, name")
      .eq("team_id", team_id);

    const artistMap = new Map<string, string>();
    (artists ?? []).forEach((a: any) => {
      artistMap.set(a.name.toLowerCase(), a.id);
    });

    const resolveArtistId = (name?: string): string | null => {
      if (!name) return artists?.[0]?.id || null;
      const lower = name.toLowerCase();
      // Exact match
      if (artistMap.has(lower)) return artistMap.get(lower)!;
      // Fuzzy match
      for (const [key, id] of artistMap) {
        if (key.includes(lower) || lower.includes(key)) return id;
      }
      return artists?.[0]?.id || null;
    };

    const results: { type: string; success: boolean; title: string; error?: string }[] = [];

    // Separate items by type
    const campaigns = items.filter((i: any) => i.type === "campaign");
    const tasks = items.filter((i: any) => i.type === "task");
    const milestones = items.filter((i: any) => i.type === "milestone");
    const budgets = items.filter((i: any) => i.type === "budget");

    // 1. Create initiatives (campaigns) first
    const campaignIdMap = new Map<string, string>();
    for (const c of campaigns) {
      const artistId = resolveArtistId(c.artist_name);
      if (!artistId) {
        results.push({ type: "campaign", success: false, title: c.title, error: "Artist not found" });
        continue;
      }
      const { data, error } = await sb.from("initiatives").insert({
        artist_id: artistId,
        name: c.title,
        description: c.description || null,
        start_date: c.date || null,
        end_date: c.end_date || null,
      }).select("id").single();

      if (error) {
        results.push({ type: "campaign", success: false, title: c.title, error: error.message });
      } else {
        campaignIdMap.set(c.title.toLowerCase(), data.id);
        results.push({ type: "campaign", success: true, title: c.title });
      }
    }

    // 2. Create tasks
    for (const t of tasks) {
      const artistId = resolveArtistId(t.artist_name);
      if (!artistId) {
        results.push({ type: "task", success: false, title: t.title, error: "Artist not found" });
        continue;
      }

      // Try to link to an initiative
      let initiativeId: string | null = null;
      if (t.campaign_name) {
        const lower = t.campaign_name.toLowerCase();
        for (const [key, id] of campaignIdMap) {
          if (key.includes(lower) || lower.includes(key)) {
            initiativeId = id;
            break;
          }
        }
      }

      const { error } = await sb.from("tasks").insert({
        artist_id: artistId,
        title: t.title,
        description: t.description || null,
        due_date: t.date || null,
        initiative_id: initiativeId,
        status: "todo",
        created_by: user.id,
      });

      if (error) {
        results.push({ type: "task", success: false, title: t.title, error: error.message });
      } else {
        results.push({ type: "task", success: true, title: t.title });
      }
    }

    // 3. Create milestones
    for (const m of milestones) {
      const artistId = resolveArtistId(m.artist_name);
      if (!artistId) {
        results.push({ type: "milestone", success: false, title: m.title, error: "Artist not found" });
        continue;
      }
      const { error } = await sb.from("artist_milestones").insert({
        artist_id: artistId,
        title: m.title,
        date: m.date || new Date().toISOString().split("T")[0],
        description: m.description || null,
      });

      if (error) {
        results.push({ type: "milestone", success: false, title: m.title, error: error.message });
      } else {
        results.push({ type: "milestone", success: true, title: m.title });
      }
    }

    // 4. Create budgets
    for (const b of budgets) {
      const artistId = resolveArtistId(b.artist_name);
      if (!artistId) {
        results.push({ type: "budget", success: false, title: b.title, error: "Artist not found" });
        continue;
      }
      const { error } = await sb.from("budgets").insert({
        artist_id: artistId,
        label: b.title,
        amount: b.amount || 0,
      });

      if (error) {
        results.push({ type: "budget", success: false, title: b.title, error: error.message });
      } else {
        results.push({ type: "budget", success: true, title: b.title });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({
      success: failCount === 0,
      created: successCount,
      failed: failCount,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Execute plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
