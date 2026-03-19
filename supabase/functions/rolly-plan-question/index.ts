import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are ROLLY, an expert music manager AI. You ask smart questions to build a rollout plan.

CRITICAL RULES:
- NEVER repeat a question that was already answered in the brief or previous Q&A.
- NEVER ask the user things YOU should know from your music industry knowledge.
- Only ask questions where the user's specific input is needed (artist name, release date, budget amount, which platforms they care about).
- Keep questions under 15 words.
- Use plain language, no jargon.
- If the user says "I don't know" or "you tell me", IMMEDIATELY call plan_ready and fill in the gaps yourself.

KNOWLEDGE-FIRST RULES — NEVER ask about these, just use your expertise:
- Standard costs: Music video $1-3K indie / $5-15K mid-level, Lyric video $300-800, Social content $500-1500/mo, PR campaign $1-3K/mo, Playlist pitching $200-500
- Promo windows: 6-8 weeks pre-save campaign, 2-3 weeks press lead time, 4-6 weeks radio promotion, Release week is always the heaviest push
- Budget splits: 40% content creation, 25% paid promotion, 20% PR/press, 15% contingency (adjust based on goals)
- Timeline math: Single cycle = 8-12 weeks, EP cycle = 12-16 weeks, Album cycle = 16-24 weeks
- Standard channels: Spotify, Apple Music, TikTok, Instagram, YouTube are assumed unless told otherwise

YOUR PERSONALITY:
- You're a knowledgeable music manager who speaks naturally
- Be conversational but efficient — respect the user's time
- Ask ONE question at a time
- Build on what the user said. Reference artists and team members by name when known
- Include an optional "acknowledgment" field — a brief 5-10 word reaction to their last answer (e.g., "Smart move.", "That timeline works."). Only after Q1.

DEPTH CALIBRATION:
- Q2 MUST always ask about pace: "Need this quick or want to really think it through?"
- If depth is "quick": Ask 3-5 focused questions total, then call plan_ready. Fill in reasonable defaults.
- If depth is "deep": Ask 8-12 questions, go deeper on specifics. When done, call plan_ready with preview: true.
- If depth is not set: Default to quick after Q2.

WHAT YOU NEED (skip topics already covered):
- What's the project? (release, tour, campaign, etc.)
- Who's the artist?
- Key dates and timeline
- Budget range
- What platforms/channels matter
- Who on the team handles what

Your job is to get enough info to create tasks, milestones, campaigns, and budgets. Be efficient — get the essentials and fill in the rest with your expertise.`;

const unsureSignals = ["i don't know", "dont know", "not sure", "unsure", "idk", "no idea", "you tell me", "you decide", "figure it out", "whatever you think"];

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

    const { brief, previous_qa, team_id, depth, question_number, is_post_preview, preview_plan, refinement_feedback } = await req.json();

    // Determine hard caps based on depth
    const isDeep = depth === "deep" || depth === "detailed";
    const hardCap = isDeep ? 20 : 8;

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

    // Fetch team members for context
    let teamMembers: { name: string; role: string; job_title: string }[] = [];
    if (team_id) {
      const { data: memberships } = await sb
        .from("team_memberships")
        .select("role, user_id, job_title, profiles(full_name)")
        .eq("team_id", team_id);
      teamMembers = (memberships ?? []).map((m: any) => ({
        name: m.profiles?.full_name || "Unknown",
        role: m.role || "team_member",
        job_title: m.job_title || "",
      }));
    }

    // Search knowledge base for relevant context — use multiple search passes
    let knowledgeContext = "";
    if (brief) {
      const allText = [brief, ...(previous_qa || []).map((qa: any) => `${qa.question} ${qa.answer}`)].join(" ");
      
      const searchQueries: string[] = [];
      const directTerms = brief.split(/\s+/).filter((w: string) => w.length > 3).slice(0, 6).join(" | ");
      if (directTerms) searchQueries.push(directTerms);
      
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
        const top = knowledgeResults.slice(0, 10);
        knowledgeContext = `\nINDUSTRY KNOWLEDGE (use this to ask smarter, more specific questions):\n${top.map((k: any) => `- [${k.chapter}]: ${k.content.slice(0, 400)}`).join("\n\n")}`;
      }
    }

    const questionCount = previous_qa?.length || 0;

    // Detect if the last answer indicates uncertainty — force plan_ready
    const lastAnswer = previous_qa?.length > 0 ? String(previous_qa[previous_qa.length - 1]?.answer || "").toLowerCase() : "";
    const lastAnswerIsUnsure = unsureSignals.some((signal) => lastAnswer.includes(signal));

    if (lastAnswerIsUnsure && questionCount >= 2) {
      const summaryFromQA = (previous_qa || []).map((qa: any, i: number) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join("\n");
      return new Response(JSON.stringify({
        type: "complete",
        summary_prompt: `Generate a plan based on these answers. Fill in ALL gaps with reasonable defaults based on your music industry knowledge.\n\nBrief: ${brief}\n\n${summaryFromQA}`,
        preview: isDeep,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hard cap
    if (questionCount >= hardCap) {
      const summaryFromQA = (previous_qa || []).map((qa: any, i: number) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join("\n");
      return new Response(JSON.stringify({
        type: "complete",
        summary_prompt: `Generate a comprehensive plan based on these answers. Fill in any gaps with reasonable defaults.\n\nBrief: ${brief}\n\n${summaryFromQA}`,
        preview: isDeep,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const unsureTopics = (previous_qa || [])
      .filter((qa: any) => {
        const answer = String(qa?.answer || "").toLowerCase();
        return unsureSignals.some((signal) => answer.includes(signal));
      })
      .map((qa: any) => qa.question)
      .slice(0, 4);

    // Build refinement context if this is a post-preview refinement round
    let refinementContext = "";
    if (is_post_preview && preview_plan && refinement_feedback) {
      const planSummary = (preview_plan || []).map((item: any) => `- [${item.type}] ${item.title}${item.date ? ` (${item.date})` : ""}${item.amount ? ` $${item.amount}` : ""}`).join("\n");
      refinementContext = `\n\nPREVIOUS DRAFT PLAN (user wants refinements):\n${planSummary}\n\nUSER'S FEEDBACK: "${refinement_feedback}"\n\nAsk 3-4 targeted questions to address their feedback, then call plan_ready with preview: true.`;
    }

    const quickThreshold = isDeep ? 10 : 5;
    const wrapUpThreshold = isDeep ? 10 : 6;

    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `CONTEXT:
- Artists on roster: ${artistNames.length > 0 ? artistNames.join(", ") : "None added yet"}
- Team members: ${teamMembers.length > 0 ? teamMembers.map(m => `${m.name} (${m.role}${m.job_title ? `, ${m.job_title}` : ""})`).join(", ") : "No team members yet"}
- Today's date: ${new Date().toISOString().split("T")[0]}
- Depth preference: ${depth || "not set yet"}
- Questions asked so far: ${questionCount}
- Mode: ${isDeep ? "DEEP" : "QUICK"}
${questionCount >= wrapUpThreshold ? `You MUST call plan_ready NOW unless there is ONE critical missing piece (like artist name or release date). Do NOT ask another question about timelines, content strategy, promotion, PR, or budgets — use your knowledge to fill those in.` : ""}
${questionCount >= hardCap ? "MANDATORY: Call plan_ready immediately. No more questions." : ""}
${knowledgeContext}

USER'S BRIEF: "${brief}"

${previous_qa && previous_qa.length > 0 ? `PREVIOUS Q&A:\n${previous_qa.map((qa: any, i: number) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join("\n\n")}` : "No questions asked yet."}

${unsureTopics.length > 0 ? `USER SAID "I DON'T KNOW" ON: ${unsureTopics.join(" | ")}\nDo NOT ask deeper follow-ups on those topics. Move to another missing area or call plan_ready.` : ""}
${refinementContext}

Generate the next question based on the depth preference, or signal completion with plan_ready if you have enough info.${isDeep ? " When calling plan_ready, set preview to true so the user can review before final execution." : ""}`,
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
                  acknowledgment: {
                    type: "string",
                    description: "A brief 5-10 word conversational reaction to their last answer. Only include after Q1. Examples: 'Smart move.', 'That timeline works.', 'Got it.'",
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
                  preview: {
                    type: "boolean",
                    description: "If true, the plan will be shown as a preview for the user to review and refine before final execution. Set to true for deep/detailed mode.",
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
      const cleanedQuestion = simplifyQuestionText(fnArgs.question);
      return new Response(JSON.stringify({
        type: "question",
        question: cleanedQuestion,
        header: fnArgs.header,
        options: fnArgs.options || [],
        multi_select: fnArgs.multi_select || false,
        allow_custom: fnArgs.allow_custom !== false,
        acknowledgment: fnArgs.acknowledgment || null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (fnName === "plan_ready") {
      return new Response(JSON.stringify({
        type: "complete",
        summary_prompt: fnArgs.summary_prompt,
        preview: fnArgs.preview || false,
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
