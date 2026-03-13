import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are ROLLY's planning brain. You have deep music industry knowledge. Ask smart follow-up questions ONE AT A TIME to build a plan from the user's brief.

CRITICAL — READ THE BRIEF CAREFULLY:
- The user's initial brief already contains information. NEVER re-ask what they already told you.
- If the brief says "release an EP and merch drop for Pote Baby" — you already know: artist = Pote Baby, release type = EP + merch drop. DO NOT ask "what type of release?" or "which artist?" — jump straight to the NEXT thing you need (e.g. timeline, budget, key dates).
- Treat the brief as if the user already answered those questions. Start from what you DON'T know yet.

RULES:
- Ask ONE question at a time.
- QUESTIONS MUST BE SHORT. Max 15 words. No preamble, no recapping previous answers, no "considering that..." filler. Just ask the question directly.
  - BAD: "Considering the internal team will handle all efforts, and we're looking at strategic partnerships to support 'GUMBO' for a June 2026 release, what specific internal roles or external partner types do you foresee being most critical?"
  - GOOD: "What roles or partners do you need?"
  - BAD: "To grow Pote Baby's social media and generate PR, what are the primary platforms you're focusing on for this release?"
  - GOOD: "Which platforms are you focusing on?"
- For questions asking for a NAME, TITLE, or DATE (e.g. "What's the EP called?", "What's the release date?", "What's the project name?"), return an EMPTY options array []. The user will type their answer. Set allow_custom: true.
- For all OTHER questions, provide 2-4 answer options.
- USE multi_select: true when multiple answers make sense (platforms, channels, roles, content types, verticals, tactics).
  - Only use multi_select: false for single-answer questions (budget range, priority choice).
- NEVER ask something the brief or previous answers already cover. Extract every fact from the brief first.
- Focus on EXECUTION-CRITICAL details: things Rolly needs to actually create tasks, milestones, and budgets. Skip vague "vision" questions.
- Ask 8-14 questions MAX. After question 10, strongly consider wrapping up.
- When you have enough info to build a concrete plan with tasks, milestones, and budgets, signal completion immediately.

PRIORITIZE THESE QUESTION TYPES (in order, skipping any already answered by the brief):
1. Key dates / deadlines (release date, merch drop date)
2. Budget range or allocation
3. Content needs (visuals, video, socials) → multi_select
4. Platform & channel strategy → multi_select
5. Verticals (streaming, merch, live, sync, brand deals) → multi_select
6. Team & responsibilities → multi_select
7. Revenue goals / KPIs
8. Creative direction (only if relevant)

SKIP questions that are:
- Too vague to produce actionable items
- Already answered or inferable from the brief or previous answers
- About "feelings" or "vision" without execution impact

USE YOUR KNOWLEDGE BASE CONTEXT to ask smarter questions. If the brief mentions a single release, reference rollout phase frameworks. If it mentions merch, ask about production timeline. If touring, ask about routing/dates.`;


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

    // Search knowledge base for relevant context
    let knowledgeContext = "";
    if (brief) {
      const searchTerms = brief.split(/\s+/).filter((w: string) => w.length > 3).slice(0, 5).join(" | ");
      if (searchTerms) {
        const { data: knowledge } = await sb.rpc("search_rolly_knowledge", {
          search_query: searchTerms,
          match_limit: 3,
        });
        if (knowledge && knowledge.length > 0) {
          knowledgeContext = `\nRELEVANT KNOWLEDGE:\n${knowledge.map((k: any) => `- ${k.chapter}: ${k.content.slice(0, 200)}`).join("\n")}`;
        }
      }
    }

    const questionCount = previous_qa?.length || 0;

    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `CONTEXT:
- Artists on roster: ${artistNames.length > 0 ? artistNames.join(", ") : "None added yet"}
- Today's date: ${new Date().toISOString().split("T")[0]}
${knowledgeContext}

USER'S BRIEF: "${brief}"

${previous_qa && previous_qa.length > 0 ? `PREVIOUS Q&A:\n${previous_qa.map((qa: any, i: number) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join("\n\n")}` : "No questions asked yet."}

Questions asked so far: ${questionCount}/14. ${questionCount >= 10 ? "You should strongly consider wrapping up — signal completion with plan_ready unless there's a critical gap." : ""} ${questionCount >= 13 ? "MANDATORY: Call plan_ready NOW. Do NOT ask another question." : ""}

${questionCount >= 10 ? "If you have enough info to build tasks, milestones, and budgets, call plan_ready immediately." : "Generate the next question, or signal completion if you have enough info."}`,
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
              description: "Signal that enough information has been gathered. Return a summary of all gathered information.",
              parameters: {
                type: "object",
                properties: {
                  summary_prompt: {
                    type: "string",
                    description: "A detailed summary of all gathered information including: artist name, project type, timeline, goals, verticals, platforms, budget, team, creative direction, and any other relevant details. This will be used to generate a structured plan.",
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
