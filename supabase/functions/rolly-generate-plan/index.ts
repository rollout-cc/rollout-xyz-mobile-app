import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are ROLLY, a music industry operations AI. Given a planning brief and Q&A answers, generate a STRUCTURED PLAN with concrete, actionable items.

You MUST call the "generate_plan" tool with ALL items to create. Be specific — use real dates, real amounts, real task descriptions.

GUIDELINES:
- Create 2-4 campaigns/initiatives that represent rollout phases (e.g. "Pre-Release", "Launch Week", "Post-Release Sustain")
- Create 8-20 tasks with specific, actionable titles (NOT vague like "plan marketing" — instead "Create TikTok teaser clips for single announcement")
- Create 3-8 milestones for key dates (release day, video drop, playlist push deadline, etc.)
- Create 2-6 budget line items with realistic amounts based on the budget discussed
- All dates should be realistic based on the timeline discussed. Use ISO format (YYYY-MM-DD).
- Link tasks to campaigns by referencing the campaign name
- If budget was discussed, distribute it across categories sensibly

TASK TITLE RULES:
- Action-oriented: start with a verb ("Book", "Create", "Submit", "Design", "Schedule")
- Specific: include the deliverable ("Create 3 TikTok teaser clips", not "Make content")
- Keep under 60 chars

CAMPAIGN RULES:
- Name should be the phase or initiative name ("GUMBO Pre-Release Campaign", "Single Drop Week")
- Include start and end dates that define the phase

MILESTONE RULES:
- Title should be the event ("Single Release Day", "Music Video Premiere", "Playlist Pitch Deadline")
- One specific date each

BUDGET RULES:
- Label should be the category ("Music Video Production", "Social Media Ads", "PR & Press")
- Amount in dollars, realistic for independent/mid-level artists unless told otherwise`;

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

    const { brief, qa_history, summary_prompt, team_id } = await req.json();

    // Fetch artists
    let artistNames: string[] = [];
    if (team_id) {
      const { data: artists } = await sb
        .from("artists")
        .select("name")
        .eq("team_id", team_id)
        .order("name");
      artistNames = (artists ?? []).map((a: any) => a.name);
    }

    // Search knowledge base
    let knowledgeContext = "";
    const searchTerms = (brief || summary_prompt || "").split(/\s+/).filter((w: string) => w.length > 3).slice(0, 5).join(" | ");
    if (searchTerms) {
      const { data: knowledge } = await sb.rpc("search_rolly_knowledge", {
        search_query: searchTerms,
        match_limit: 5,
      });
      if (knowledge && knowledge.length > 0) {
        knowledgeContext = `\nINDUSTRY KNOWLEDGE:\n${knowledge.map((k: any) => `- ${k.chapter}: ${k.content.slice(0, 300)}`).join("\n")}`;
      }
    }

    const qaText = qa_history && qa_history.length > 0
      ? qa_history.map((qa: any, i: number) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join("\n\n")
      : "";

    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `CONTEXT:
- Artists on roster: ${artistNames.length > 0 ? artistNames.join(", ") : "None added yet"}
- Today's date: ${new Date().toISOString().split("T")[0]}
${knowledgeContext}

USER'S ORIGINAL BRIEF: "${brief}"

PLANNING Q&A:
${qaText}

SUMMARY: ${summary_prompt}

Now generate the full structured plan. Be specific and actionable. Use the artist names from the roster when applicable.`,
      },
    ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "generate_plan",
              description: "Generate a structured rollout plan with campaigns, tasks, milestones, and budgets.",
              parameters: {
                type: "object",
                properties: {
                  campaigns: {
                    type: "array",
                    description: "Campaign phases / initiatives to create",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        start_date: { type: "string", description: "ISO date YYYY-MM-DD" },
                        end_date: { type: "string", description: "ISO date YYYY-MM-DD" },
                        artist_name: { type: "string" },
                      },
                      required: ["name", "artist_name"],
                    },
                  },
                  tasks: {
                    type: "array",
                    description: "Specific actionable tasks to create",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        due_date: { type: "string", description: "ISO date YYYY-MM-DD" },
                        campaign_name: { type: "string", description: "Name of the campaign this task belongs to" },
                        artist_name: { type: "string" },
                      },
                      required: ["title", "artist_name"],
                    },
                  },
                  milestones: {
                    type: "array",
                    description: "Key date milestones",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        date: { type: "string", description: "ISO date YYYY-MM-DD" },
                        description: { type: "string" },
                        artist_name: { type: "string" },
                      },
                      required: ["title", "date", "artist_name"],
                    },
                  },
                  budgets: {
                    type: "array",
                    description: "Budget line items",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        amount: { type: "number" },
                        artist_name: { type: "string" },
                      },
                      required: ["label", "amount", "artist_name"],
                    },
                  },
                },
                required: ["campaigns", "tasks", "milestones", "budgets"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_plan" } },
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error("AI error:", aiResp.status, text);
      return new Response(JSON.stringify({ error: "Failed to generate plan" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "generate_plan") {
      return new Response(JSON.stringify({ error: "AI did not generate a plan" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plan = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({
      campaigns: plan.campaigns || [],
      tasks: plan.tasks || [],
      milestones: plan.milestones || [],
      budgets: plan.budgets || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Generate plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
