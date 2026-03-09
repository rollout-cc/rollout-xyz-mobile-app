import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function escapeIcal(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function formatIcalDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response("Missing token parameter", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find artist by timeline_public_token
    const { data: artist, error: artistErr } = await supabase
      .from("artists")
      .select("id, name, timeline_is_public, timeline_public_token")
      .eq("timeline_public_token", token)
      .single();

    if (artistErr || !artist || !artist.timeline_is_public) {
      return new Response("Calendar not found or not shared", { status: 404, headers: corsHeaders });
    }

    // Fetch milestones
    const { data: milestones } = await supabase
      .from("artist_milestones")
      .select("id, title, description, date")
      .eq("artist_id", artist.id)
      .order("date", { ascending: true });

    // Build iCal
    const events = (milestones || []).map((m: any) => {
      const dtStart = formatIcalDate(m.date);
      const dtEnd = formatIcalDate(m.date); // all-day event
      const lines = [
        "BEGIN:VEVENT",
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        `SUMMARY:${escapeIcal(m.title)}`,
        `DESCRIPTION:${escapeIcal(m.description || `Milestone for ${artist.name}`)}`,
        `UID:milestone-${m.id}@rollout.cc`,
        "END:VEVENT",
      ];
      return lines.join("\r\n");
    });

    const ical = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `PRODID:-//ROLLOUT//Milestones for ${escapeIcal(artist.name)}//EN`,
      `X-WR-CALNAME:${escapeIcal(artist.name)} — Rollout`,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      ...events,
      "END:VCALENDAR",
    ].join("\r\n");

    return new Response(ical, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${artist.name}-milestones.ics"`,
      },
    });
  } catch (e) {
    console.error("milestone-ical error:", e);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
