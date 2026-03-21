import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { transcript, source, artist_id, team_id } = await req.json();
    if (!transcript || !team_id) {
      return new Response(JSON.stringify({ error: "Missing transcript or team_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch context: artist name + team members
    let artistName = "";
    if (artist_id) {
      const { data: artist } = await anonClient
        .from("artists")
        .select("name")
        .eq("id", artist_id)
        .single();
      if (artist) artistName = artist.name;
    }

    const { data: members } = await anonClient
      .from("profiles")
      .select("id, full_name")
      .in(
        "id",
        (await anonClient.from("team_memberships").select("user_id").eq("team_id", team_id)).data?.map(
          (m: any) => m.user_id
        ) ?? []
      );

    const memberNames = (members ?? []).map((m: any) => m.full_name).filter(Boolean);

    // Fetch artist's initiatives/campaigns for context
    let campaignNames: string[] = [];
    if (artist_id) {
      const { data: initiatives } = await anonClient
        .from("initiatives")
        .select("name")
        .eq("artist_id", artist_id)
        .eq("is_archived", false);
      campaignNames = (initiatives ?? []).map((i: any) => i.name);
    }

    const systemPrompt = `You are an expert at extracting actionable tasks from meeting transcripts in the music industry.

Context:
- Artist: ${artistName || "Unknown"}
- Team members: ${memberNames.join(", ") || "Unknown"}
- Active campaigns: ${campaignNames.join(", ") || "None"}
- Transcript source: ${source || "manual"}

Extract concrete, actionable tasks from the transcript. Each task should be something a team member needs to do. Ignore small talk, greetings, and non-actionable discussion.

For each task, try to identify:
- A clear, concise title (action-oriented, starting with a verb)
- Who should be assigned (match to team member names if possible)
- A due date if mentioned (ISO format YYYY-MM-DD)
- Which campaign it relates to (match to active campaigns if possible)`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extract tasks from this meeting transcript:\n\n${transcript.slice(0, 15000)}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_tasks",
              description: "Extract actionable tasks from a meeting transcript",
              parameters: {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Action-oriented task title" },
                        assignee_hint: { type: "string", description: "Name of person who should do this, or empty" },
                        due_date: { type: "string", description: "ISO date YYYY-MM-DD if mentioned, or empty" },
                        campaign_hint: { type: "string", description: "Related campaign name, or empty" },
                      },
                      required: ["title"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["tasks"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_tasks" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — please try again in a moment" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted — please add funds" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let tasks: any[] = [];

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        tasks = parsed.tasks || [];
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    // Save transcript to DB
    await anonClient.from("meeting_transcripts").insert({
      team_id,
      artist_id: artist_id || null,
      source: source || "manual",
      raw_text: transcript,
      extracted_tasks: tasks,
      status: "processed",
      created_by: user.id,
    });

    return new Response(JSON.stringify({ tasks, member_context: members ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-meeting-tasks error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
