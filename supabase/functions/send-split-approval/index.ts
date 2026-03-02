import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const authHeader = req.headers.get("authorization");
    const { song_id } = await req.json();

    if (!song_id) {
      return new Response(
        JSON.stringify({ error: "song_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all pending entries for this song with contributor info
    const { data: entries, error: entriesErr } = await supabase
      .from("split_entries")
      .select("*, contributor:split_contributors(*)")
      .eq("song_id", song_id)
      .eq("approval_status", "pending");

    if (entriesErr) throw entriesErr;

    // Get song & project info for context
    const { data: song } = await supabase
      .from("split_songs")
      .select("*, project:split_projects(*, artist:artists(name))")
      .eq("id", song_id)
      .single();

    const baseUrl = "https://rollout.cc";
    const results: { contributor: string; email?: string; sent: boolean; error?: string }[] = [];

    // Group entries by contributor for one email per person
    const byContributor = new Map<string, any[]>();
    for (const entry of entries || []) {
      const cid = entry.contributor_id;
      if (!byContributor.has(cid)) byContributor.set(cid, []);
      byContributor.get(cid)!.push(entry);
    }

    for (const [, contribEntries] of byContributor) {
      const contributor = contribEntries[0].contributor;
      if (!contributor?.email) {
        results.push({ contributor: contributor?.name ?? "unknown", sent: false, error: "No email" });
        continue;
      }

      // Build approval links for each entry
      const entryLinks = contribEntries.map((e: any) => ({
        token: e.approval_token,
        url: `${baseUrl}/splits/approve/${e.approval_token}`,
        role: e.role,
        master_pct: e.master_pct,
        producer_pct: e.producer_pct,
        writer_pct: e.writer_pct,
      }));

      // For now, just return the data — email sending would require a provider
      results.push({
        contributor: contributor.name,
        email: contributor.email,
        sent: true,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        song: song?.title,
        project: song?.project?.name,
        artist: song?.project?.artist?.name,
        results,
        // Include approval URLs for manual sharing
        approval_links: (entries || []).map((e: any) => ({
          contributor: e.contributor?.name,
          url: `${baseUrl}/splits/approve/${e.approval_token}`,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
