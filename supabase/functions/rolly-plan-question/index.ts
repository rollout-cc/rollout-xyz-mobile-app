import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are ROLLY's planning brain. You have deep music industry knowledge. Ask smart follow-up questions ONE AT A TIME to build a plan from the user's brief.

CRITICAL — READ THE BRIEF CAREFULLY:
- The user's initial brief already contains information. NEVER re-ask what they already told you.
- If the brief says "release an EP and merch drop for Pote Baby" — you already know: artist = Pote Baby, release type = EP + merch drop.
- Start from what you DON'T know yet.

LANGUAGE RULES (VERY IMPORTANT):
- Use plain music-manager language only.
- Avoid jargon like KPI, verticals, funnel, CAC, LTV, and overly corporate phrasing.
- Prefer simple words: goals, channels, budget, team, launch dates, promo plan.
- Keep every question easy to answer in under 10 seconds.

RULES:
- Ask ONE question at a time.
- QUESTIONS MUST BE SHORT. Max 15 words.
- For NAME, TITLE, DATE, or simple NUMBER questions, return options: [] and allow_custom: true.
- For all other questions, provide 2-4 answer options.
- Use multi_select: true when multiple answers make sense.
- NEVER ask what was already answered in the brief or previous answers.
- Focus on execution details Rolly needs to create tasks, milestones, and budgets.
- Ask 8-14 questions max. After question 10, wrap up unless a critical gap remains.
- If a user says "I don't know" on a topic, do NOT drill deeper there. Move on.

PRIORITIZE (skip answered topics):
1) Key dates
2) Budget
3) Content plan
4) Platforms/channels
5) Team responsibilities
6) Revenue goals in simple terms
7) Creative direction (only if needed)

USE KNOWLEDGE BASE CONTEXT to make questions specific, but keep wording simple.`;

const unsureSignals = ["i don't know", "dont know", "not sure", "unsure", "idk", "no idea"];

const simplifyQuestionText = (question: string): string => {
  let q = (question || "").trim();
  q = q.replace(/key performance indicators\s*\(?kpis?\)?/gi, "success goals");
  q = q.replace(/\bKPIs?\b/gi, "goals");
  q = q.replace(/\bverticals\b/gi, "focus areas");
  q = q.replace(/revenue generation/gi, "making money");
  return q;
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

    // Search knowledge base for relevant context — use multiple search passes
    let knowledgeContext = "";
    if (brief) {
      // Extract meaningful search terms from brief + any answers so far
      const allText = [brief, ...(previous_qa || []).map((qa: any) => `${qa.question} ${qa.answer}`)].join(" ");
      
      // Build multiple search queries for broader coverage
      const searchQueries: string[] = [];
      
      // Direct terms from the brief
      const directTerms = brief.split(/\s+/).filter((w: string) => w.length > 3).slice(0, 6).join(" | ");
      if (directTerms) searchQueries.push(directTerms);
      
      // Topic-based searches based on what the brief mentions
      const topicMap: Record<string, string> = {
        "ep|album|single|release|drop": "release strategy rollout",
        "merch|merchandise|clothing|apparel": "merch production clothing brand",
        "tour|show|concert|live": "touring live performance",
        "video|visual|content": "music video content strategy",
        "budget|cost|spend": "budget allocation spending",
        "marketing|promo|campaign": "marketing campaign promotion",
        "streaming|spotify|playlist": "streaming strategy playlist",
        "social|tiktok|instagram": "social media platform strategy",
        "brand|partnership|sync": "brand partnership sync licensing",
        "distribution|distributor": "distribution deal strategy",
      };
      
      const lowerBrief = allText.toLowerCase();
      for (const [pattern, query] of Object.entries(topicMap)) {
        if (new RegExp(pattern).test(lowerBrief)) {
          searchQueries.push(query);
        }
      }
      
      // Deduplicate and run searches
      const knowledgeResults: any[] = [];
      const seenIds = new Set<string>();
      
      for (const query of searchQueries.slice(0, 4)) {
        try {
          const { data: knowledge } = await sb.rpc("search_rolly_knowledge", {
            search_query: query,
            match_limit: 5,
          });
          if (knowledge) {
            for (const k of knowledge) {
              if (!seenIds.has(k.id)) {
                seenIds.add(k.id);
                knowledgeResults.push(k);
              }
            }
          }
        } catch { /* skip failed searches */ }
      }
      
      if (knowledgeResults.length > 0) {
        // Sort by relevance rank and take top entries
        const top = knowledgeResults.slice(0, 10);
        knowledgeContext = `\nINDUSTRY KNOWLEDGE (use this to ask smarter, more specific questions):\n${top.map((k: any) => `- [${k.chapter}]: ${k.content.slice(0, 400)}`).join("\n\n")}`;
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
