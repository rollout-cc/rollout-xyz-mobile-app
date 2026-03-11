import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are ROLLY's planning brain. Your job is to analyze a user's initial brief about what they want to plan (a release, campaign, budget, etc.) and ask smart, contextual follow-up questions ONE AT A TIME to gather the information needed to build a comprehensive plan.

You will receive:
- The user's initial brief (what they want to plan)
- A list of artists on their roster
- All previous questions you've asked and the user's answers

Your task: Return the NEXT question to ask, OR signal that you have enough information to generate the plan.

RULES:
- Ask ONE question at a time. Each question should have 2-4 suggested answer options.
- Be contextual — adapt your questions based on what the user said and previous answers. Don't ask generic template questions.
- Skip questions you can infer from context. If they said "we're dropping a single next month", don't ask "what type of release?" or "what's the timeline?"
- Ask about things that matter for EXECUTION: Who's doing what? What's the budget? What channels? What's the creative direction?
- Identify team gaps and operational needs proactively.
- Keep questions conversational and concise (like a sharp advisor, not a form).
- After 5-12 questions (depending on complexity), you should have enough info. Don't over-ask.
- When you have enough info, signal completion.

QUESTION CATEGORIES TO DRAW FROM (adapt based on context):
- Artist & project identification
- Release/project details (type, name, status)
- Goals & success metrics
- Business verticals in play (streaming, merch, live, sync, content)
- Creative direction & narrative
- Distribution & platform strategy
- Content & marketing plan
- Team composition & gaps
- Budget & resources
- Timeline & phasing
- Anticipation/seeding strategy

Remember: Be SMART about what to ask. If someone says "we need to figure out how to market this album dropping in June", you already know: it's an album, timeline is June, focus is marketing. Ask about what you DON'T know.`;

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

    // Verify user
    const { data: { user }, error: authError } = await sb.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { brief, previous_qa, team_id } = await req.json();

    // Fetch artists for context
    let artistNames: string[] = [];
    if (team_id) {
      const { data: artists } = await sb
        .from("artists")
        .select("name")
        .eq("team_id", team_id)
        .order("name");
      artistNames = (artists ?? []).map((a: any) => a.name);
    }

    // Build the conversation for the AI
    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `CONTEXT:
- Artists on roster: ${artistNames.length > 0 ? artistNames.join(", ") : "None added yet"}
- Today's date: ${new Date().toISOString().split("T")[0]}

USER'S BRIEF: "${brief}"

${previous_qa && previous_qa.length > 0 ? `PREVIOUS Q&A:\n${previous_qa.map((qa: any, i: number) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join("\n\n")}` : "No questions asked yet."}

Generate the next question, or signal completion if you have enough info.`,
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
              name: "ask_question",
              description: "Ask the user a contextual planning question with suggested options.",
              parameters: {
                type: "object",
                properties: {
                  question: {
                    type: "string",
                    description: "The question to ask the user. Keep it conversational and concise.",
                  },
                  header: {
                    type: "string",
                    description: "Short label for this question category (2-4 words), e.g. 'Release Details', 'Budget', 'Creative Direction'",
                  },
                  options: {
                    type: "array",
                    description: "2-4 suggested answer options for the user to pick from.",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string", description: "Short option label" },
                        description: { type: "string", description: "Brief explanation of this option" },
                      },
                      required: ["label"],
                      additionalProperties: false,
                    },
                  },
                  multi_select: {
                    type: "boolean",
                    description: "Whether the user can select multiple options. Default false.",
                  },
                  allow_custom: {
                    type: "boolean",
                    description: "Whether the user can type a custom answer instead. Default true.",
                  },
                },
                required: ["question", "header", "options"],
                additionalProperties: false,
              },
            },
          },
          {
            type: "function",
            function: {
              name: "plan_ready",
              description: "Signal that enough information has been gathered. Return a summary prompt for Rolly to execute the plan.",
              parameters: {
                type: "object",
                properties: {
                  summary_prompt: {
                    type: "string",
                    description: "A detailed prompt summarizing all gathered information for Rolly to execute. Include all answers, inferred details, and specific instructions for what to create (tasks, milestones, budgets, etc.).",
                  },
                },
                required: ["summary_prompt"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: "required",
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await aiResp.text();
      console.error("AI error:", aiResp.status, text);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No response from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fnName = toolCall.function.name;
    const fnArgs = JSON.parse(toolCall.function.arguments);

    if (fnName === "ask_question") {
      return new Response(JSON.stringify({
        type: "question",
        question: fnArgs.question,
        header: fnArgs.header,
        options: fnArgs.options || [],
        multi_select: fnArgs.multi_select || false,
        allow_custom: fnArgs.allow_custom !== false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (fnName === "plan_ready") {
      return new Response(JSON.stringify({
        type: "complete",
        summary_prompt: fnArgs.summary_prompt,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unexpected AI response" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Plan question error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
