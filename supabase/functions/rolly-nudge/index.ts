import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SCREEN_PROMPTS: Record<string, string> = {
  splits:
    "You're looking at a split sheet editor. The user is managing master/writer/publisher ownership percentages for a song. Common issues: percentages not totaling 100%, missing PRO affiliation, no publisher listed.",
  finance:
    "You're looking at an artist's finance tab with expenses and revenue tracking. The user manages transactions, categories, and P&L.",
  timelines:
    "You're looking at an artist's timeline/milestones. The user plans release dates, events, and deadlines.",
  overview:
    "You're looking at the COMPANY-LEVEL overview dashboard — this is NOT the artist roster or artist page. It shows company-wide stats like team task progress, budget utilization across all artists, and staff productivity. Nudges here should be about company operations, team management, or business strategy — NOT about adding artists or roster-level actions.",
  "artist-info":
    "You're looking at an artist's admin info section — band member details, PRO registration, IPI numbers, publisher info.",
  budget:
    "You're looking at an artist's budget allocation section where spending categories and amounts are managed.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { screen, data_snapshot } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Search knowledge base for relevant context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseKey);

    let knowledgeContext = "";
    const searchTerms: Record<string, string> = {
      splits: "split & sheet | royalty | PRO",
      finance: "revenue | expense | budget",
      timelines: "release & strategy | rollout",
      overview: "management | productivity",
      "artist-info": "PRO & registration | IPI | publisher",
      budget: "budget & allocation | spending",
    };

    const searchQuery = searchTerms[screen] || screen;
    try {
      const { data: knowledge } = await admin.rpc("search_rolly_knowledge", {
        search_query: searchQuery,
        match_limit: 2,
      });
      if (knowledge?.length) {
        knowledgeContext = knowledge.map((k: any) => k.content).join("\n\n");
      }
    } catch {}

    const screenContext = SCREEN_PROMPTS[screen] || `The user is on the "${screen}" screen.`;
    const dataStr = JSON.stringify(data_snapshot || {});

    // P1 nudge logic: if user just completed a non-P1 task but has P1 tasks remaining
    let p1Context = "";
    if (data_snapshot?.completedTaskTitle && data_snapshot?.p1TasksPending?.length > 0) {
      const p1Names = data_snapshot.p1TasksPending.map((t: any) => t.title).join(", ");
      p1Context = `\nIMPORTANT: The user just completed "${data_snapshot.completedTaskTitle}" but has Priority 1 (urgent) tasks still pending: ${p1Names}. Generate a nudge reminding them about their P1 task(s). Example: "Nice work on [completed task], but did you [P1 task]?"`;
    }

    const systemPrompt = `You are ROLLY, a music business advisor. Generate ONE short, actionable nudge (max 90 characters) for the user based on what you see on their screen. Also provide a CTA prompt — a question the user could ask you to dive deeper.

Rules:
- Max 90 characters for the nudge
- Be specific to the data, not generic
- Sound like a helpful text from a friend, not a system notification
- If the data looks good/complete, return empty nudge
- IMPORTANT: If the data_snapshot shows artistCount > 0 or taskCount > 0, the team is NOT new. NEVER suggest "getting started", "build your roster", or "add artists" if they already have artists. Instead, give a contextual nudge about the specific screen data.
- If you cannot find anything specific to nudge about, return an empty nudge.
${p1Context}

${knowledgeContext ? `Industry knowledge:\n${knowledgeContext}\n` : ""}

Screen context: ${screenContext}
Data snapshot: ${dataStr}

Respond with a JSON object: { "nudge": "...", "cta_prompt": "..." }
If no nudge is needed, return: { "nudge": "", "cta_prompt": "" }`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate a nudge for this screen." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_nudge",
              description: "Return a contextual nudge and CTA prompt",
              parameters: {
                type: "object",
                properties: {
                  nudge: { type: "string", description: "Short nudge text, max 90 chars. Empty if not needed." },
                  cta_prompt: { type: "string", description: "A question the user could ask ROLLY to dive deeper." },
                },
                required: ["nudge", "cta_prompt"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_nudge" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ nudge: "", cta_prompt: "" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ nudge: "", cta_prompt: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ nudge: "", cta_prompt: "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rolly-nudge error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
