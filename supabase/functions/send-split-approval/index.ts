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
    const authHeader = req.headers.get("authorization");
    const { project_id } = await req.json();

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: "project_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    // Get project with artist info
    const { data: project, error: projErr } = await supabase
      .from("split_projects")
      .select("*, artist:artists(name)")
      .eq("id", project_id)
      .single();
    if (projErr) throw projErr;

    // Get all songs in the project
    const { data: songs, error: songsErr } = await supabase
      .from("split_songs")
      .select("*")
      .eq("project_id", project_id)
      .order("sort_order", { ascending: true });
    if (songsErr) throw songsErr;

    if (!songs || songs.length === 0) {
      return new Response(
        JSON.stringify({ error: "No tracks found in this project" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const songIds = songs.map((s: any) => s.id);

    // Get all pending entries across all songs
    const { data: entries, error: entriesErr } = await supabase
      .from("split_entries")
      .select("*, contributor:split_contributors(*)")
      .in("song_id", songIds)
      .eq("approval_status", "pending");
    if (entriesErr) throw entriesErr;

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No pending approvals to send" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = "https://app.rollout.cc";
    const songMap = new Map(songs.map((s: any) => [s.id, s]));

    // Group entries by contributor
    const byContributor = new Map<string, any[]>();
    for (const entry of entries) {
      const cid = entry.contributor_id;
      if (!byContributor.has(cid)) byContributor.set(cid, []);
      byContributor.get(cid)!.push(entry);
    }

    const results: { contributor: string; email?: string; sent: boolean; error?: string }[] = [];

    for (const [, contribEntries] of byContributor) {
      const contributor = contribEntries[0].contributor;
      if (!contributor?.email) {
        results.push({ contributor: contributor?.name ?? "unknown", sent: false, error: "No email" });
        continue;
      }

      // Build track list for this contributor
      const trackLines = contribEntries.map((e: any) => {
        const song = songMap.get(e.song_id);
        const parts: string[] = [];
        if (e.master_pct != null) parts.push(`Master ${e.master_pct}%`);
        if (e.producer_pct != null) parts.push(`Producer ${e.producer_pct}%`);
        if (e.writer_pct != null) parts.push(`Writer ${e.writer_pct}%`);
        return `• "${song?.title ?? "Unknown"}" — ${e.role?.replace("_", " ")} · ${parts.join(", ") || "percentages TBD"}`;
      }).join("\n");

      // Use the first entry's approval_token for the link
      const approvalUrl = `${baseUrl}/splits/approve/${contribEntries[0].approval_token}`;

      if (RESEND_API_KEY) {
        try {
          const artistName = (project as any)?.artist?.name ?? "Unknown Artist";
          const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <img src="https://ctnsworqzzguykzzvdme.supabase.co/storage/v1/object/public/email-assets/rollout-flag.png" alt="Rollout" width="40" height="40" />
    </div>
    <h1 style="font-size:20px;font-weight:700;color:#1a1a1a;margin:0 0 8px;">Split Approval Request</h1>
    <p style="font-size:14px;color:#666;margin:0 0 24px;">
      ${artistName} — <strong>${project.name}</strong>
    </p>
    <p style="font-size:14px;color:#1a1a1a;margin:0 0 16px;">
      Hi ${contributor.name},
    </p>
    <p style="font-size:14px;color:#1a1a1a;margin:0 0 16px;">
      You've been added to the following tracks:
    </p>
    <div style="background:#f5f3ef;border-radius:8px;padding:16px;margin:0 0 24px;font-size:13px;color:#1a1a1a;white-space:pre-line;line-height:1.6;">
${trackLines}
    </div>
    <div style="text-align:center;margin:32px 0;">
      <a href="${approvalUrl}" style="display:inline-block;background:#1a1a1a;color:#f5f3ef;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">
        Review & Approve
      </a>
    </div>
    <p style="font-size:12px;color:#999;text-align:center;margin-top:40px;">
      ROLLOUT
    </p>
  </div>
</body>
</html>`;

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Rollout <accounts@rollout.cc>",
              to: contributor.email,
              subject: `Split Approval — ${project.name} (${artistName})`,
              html: emailHtml,
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            console.error("Resend error:", errText);
            results.push({ contributor: contributor.name, email: contributor.email, sent: false, error: "Email send failed" });
          } else {
            results.push({ contributor: contributor.name, email: contributor.email, sent: true });
          }
        } catch (emailErr) {
          console.error("Email error:", emailErr);
          results.push({ contributor: contributor.name, email: contributor.email, sent: false, error: (emailErr as Error).message });
        }
      } else {
        // No Resend key — return URLs for manual sharing
        results.push({
          contributor: contributor.name,
          email: contributor.email,
          sent: false,
          error: "Email provider not configured",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        project: project.name,
        artist: (project as any)?.artist?.name,
        results,
        approval_links: entries.map((e: any) => ({
          contributor: e.contributor?.name,
          url: `${baseUrl}/splits/approve/${e.approval_token}`,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
