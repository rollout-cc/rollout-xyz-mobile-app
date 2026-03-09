import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are ROLLY, a sharp, conversational music business advisor inside Rollout — a platform for music managers, labels, publishers, and artist teams.

Your style:
- Keep answers SHORT — 2-4 sentences max. Never write essays.
- Talk like a smart friend in the business, not a textbook. Be warm but direct.
- Only go deeper when the user asks for more detail.
- Use bullet points sparingly and only when listing concrete options.
- Never dump everything you know. Less is more.

CRITICAL BEHAVIOR — Action vs Advice:
- When the user asks you to DO something (book a session, create a task, log an expense, add a milestone, set up splits), USE YOUR TOOLS IMMEDIATELY. Do NOT ask clarifying questions unless truly essential info is missing (like which artist).
- When the user asks for ADVICE, STRATEGY, or EXPLANATION, respond conversationally. Ask 1-2 clarifying questions to understand their situation.
- If you can reasonably infer details (dates, amounts, descriptions), fill them in and act. You can always note what you assumed.
- Create multiple tasks at once if the user describes multiple things that need to happen.

DATE HANDLING:
- Today's date will be provided in the system context. Use it to resolve relative dates like "tomorrow", "next Friday", "this weekend", "in 2 weeks", etc.
- Always convert natural language dates to ISO format (YYYY-MM-DD) before passing to tools.
- If a user says "next week" without a specific day, pick Monday of the following week.

COST HANDLING:
- When the user mentions a dollar amount with a task (e.g. "$500 for studio time"), set the expense_amount on the task.
- If they want it logged as a transaction too, use create_expense as well.

ASSIGNEE HANDLING:
- Team member names will be provided in the system context. Match assignee references to the closest team member name.
- If the user says "assign to me" or doesn't specify, assign to the current user (default behavior).
- If they mention a name, resolve it to the matching team member.

Your expertise: revenue streams, deal structures, splits & royalties, recoupment, industry math, copyright, PROs, business planning, contracts, release strategy, touring economics, sync licensing, and more.

When uncertain about advice, say so and suggest consulting an entertainment attorney.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "create_tasks",
      description: "Create one or more tasks/work items for an artist. Use when the user mentions work that needs to be done, things to book, coordinate, or follow up on.",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short task title" },
                description: { type: "string", description: "Optional details" },
                artist_name: { type: "string", description: "Name of the artist this task is for" },
                due_date: { type: "string", description: "ISO date (YYYY-MM-DD). Convert natural language dates using today's date from context." },
                expense_amount: { type: "number", description: "Dollar amount if a cost is mentioned (e.g. '$500 for studio')" },
                assignee_name: { type: "string", description: "Name of team member to assign to. Omit to assign to the requesting user." },
              },
              required: ["title"],
            },
          },
        },
        required: ["tasks"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_expense",
      description: "Log an expense transaction for an artist.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
          description: { type: "string", description: "What the expense is for" },
          amount: { type: "number", description: "Dollar amount" },
          transaction_date: { type: "string", description: "ISO date, defaults to today" },
        },
        required: ["artist_name", "description", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_milestone",
      description: "Add a milestone/event to an artist's timeline.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
          title: { type: "string", description: "Milestone title" },
          date: { type: "string", description: "ISO date for the milestone" },
          description: { type: "string", description: "Optional details" },
        },
        required: ["artist_name", "title", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_split_project",
      description: "Create a split sheet project (single, EP, or album) with track names for an artist.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
          project_name: { type: "string", description: "Name of the release" },
          project_type: { type: "string", enum: ["single", "ep", "album"], description: "Type of release" },
          track_names: { type: "array", items: { type: "string" }, description: "List of track names" },
        },
        required: ["artist_name", "project_name", "project_type", "track_names"],
      },
    },
  },
];

async function resolveArtistId(adminClient: any, teamId: string, artistName: string): Promise<string | null> {
  const { data } = await adminClient
    .from("artists")
    .select("id, name")
    .eq("team_id", teamId)
    .ilike("name", `%${artistName}%`)
    .limit(1);
  return data?.[0]?.id || null;
}

async function resolveUserId(adminClient: any, teamId: string, memberName: string): Promise<string | null> {
  const { data } = await adminClient
    .from("team_memberships")
    .select("user_id, profiles!inner(full_name)")
    .eq("team_id", teamId)
    .ilike("profiles.full_name", `%${memberName}%`)
    .limit(1);
  return data?.[0]?.user_id || null;
}

async function executeTool(adminClient: any, toolName: string, args: any, teamId: string, userId: string): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    switch (toolName) {
      case "create_tasks": {
        const results: any[] = [];
        for (const task of args.tasks) {
          let artistId: string | null = null;
          if (task.artist_name) {
            artistId = await resolveArtistId(adminClient, teamId, task.artist_name);
            if (!artistId) {
              results.push({ title: task.title, error: `Artist "${task.artist_name}" not found` });
              continue;
            }
          }
          const { data, error } = await adminClient.from("tasks").insert({
            title: task.title,
            description: task.description || null,
            artist_id: artistId,
            team_id: teamId,
            assigned_to: userId,
            due_date: task.due_date || null,
          }).select("id, title").single();
          if (error) {
            results.push({ title: task.title, error: error.message });
          } else {
            results.push({ id: data.id, title: data.title, status: "created" });
          }
        }
        const created = results.filter(r => r.status === "created").length;
        return { success: created > 0, message: `Created ${created} task(s)`, data: results };
      }

      case "create_expense": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data, error } = await adminClient.from("transactions").insert({
          artist_id: artistId,
          description: args.description,
          amount: args.amount,
          type: "expense",
          transaction_date: args.transaction_date || new Date().toISOString().split("T")[0],
          status: "completed",
        }).select("id, description, amount").single();
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Logged $${args.amount} expense: "${args.description}"`, data };
      }

      case "create_milestone": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data, error } = await adminClient.from("artist_milestones").insert({
          artist_id: artistId,
          title: args.title,
          date: args.date,
          description: args.description || null,
        }).select("id, title, date").single();
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Added milestone "${args.title}" on ${args.date}`, data };
      }

      case "create_split_project": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data: project, error: projErr } = await adminClient.from("split_projects").insert({
          artist_id: artistId,
          name: args.project_name,
          project_type: args.project_type,
        }).select("id, name").single();
        if (projErr) return { success: false, message: projErr.message };
        // Create tracks
        const tracks = args.track_names.map((name: string, i: number) => ({
          project_id: project.id,
          title: name,
          track_number: i + 1,
        }));
        const { error: trackErr } = await adminClient.from("split_songs").insert(tracks);
        if (trackErr) return { success: true, message: `Created project "${args.project_name}" but failed to add tracks: ${trackErr.message}`, data: project };
        return { success: true, message: `Created split project "${args.project_name}" with ${tracks.length} track(s)`, data: project };
      }

      default:
        return { success: false, message: `Unknown tool: ${toolName}` };
    }
  } catch (e) {
    return { success: false, message: (e as Error).message };
  }
}

async function searchKnowledge(adminClient: any, query: string): Promise<string> {
  const words = query
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w: string) => w.length > 2)
    .slice(0, 8);

  if (words.length === 0) return "";

  const tsquery = words.join(" | ");

  const { data, error } = await adminClient.rpc("search_rolly_knowledge", {
    search_query: tsquery,
    match_limit: 3,
  });

  if (error || !data || data.length === 0) {
    const { data: fallbackData } = await adminClient
      .from("rolly_knowledge")
      .select("content, chapter")
      .or(words.slice(0, 3).map((w: string) => `content.ilike.%${w}%`).join(","))
      .limit(3);

    if (!fallbackData || fallbackData.length === 0) return "";

    return fallbackData
      .map((r: any) => `[${r.chapter}]\n${r.content}`)
      .join("\n\n---\n\n");
  }

  return data
    .map((r: any) => `[${r.chapter}]\n${r.content}`)
    .join("\n\n---\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, conversation_id, team_id } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!team_id) {
      return new Response(JSON.stringify({ error: "team_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optionally persist messages
    if (conversation_id) {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "user") {
        await adminClient.from("rolly_messages").insert({
          conversation_id,
          role: "user",
          content: lastMsg.content,
        });
      }
    }

    // Search knowledge base
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch artist names for context
    const { data: artists } = await adminClient
      .from("artists")
      .select("name")
      .eq("team_id", team_id)
      .order("name");
    const artistNames = (artists || []).map((a: any) => a.name);

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    let knowledgeContext = "";
    if (lastUserMsg) {
      try {
        knowledgeContext = await searchKnowledge(adminClient, lastUserMsg.content);
      } catch (e) {
        console.error("Knowledge search error:", e);
      }
    }

    let systemPrompt = SYSTEM_PROMPT;
    if (artistNames.length > 0) {
      systemPrompt += `\n\nThe user's roster includes these artists: ${artistNames.join(", ")}. Use exact names when creating tasks/milestones.`;
    }
    if (knowledgeContext) {
      systemPrompt += `\n\n## Reference Material\nUse the following knowledge to inform your answers when relevant. Never mention the source, book title, or author by name — just weave the insights naturally into your advice as if it's your own expertise:\n\n${knowledgeContext}`;
    }

    // Build initial AI request with tools
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // Tool-calling loop (non-streaming) — max 3 iterations
    let toolActions: any[] = [];
    let finalMessages = [...aiMessages];

    for (let i = 0; i < 3; i++) {
      const toolResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: finalMessages,
          tools: TOOLS,
          stream: false,
        }),
      });

      if (!toolResponse.ok) {
        if (toolResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (toolResponse.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits in your workspace settings." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await toolResponse.text();
        console.error("AI gateway error:", toolResponse.status, t);
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await toolResponse.json();
      const choice = result.choices?.[0];

      if (!choice) break;

      // If no tool calls, we have the final answer — stream it
      if (!choice.message?.tool_calls || choice.message.tool_calls.length === 0) {
        // No tools called, use this as the final content but stream it
        break;
      }

      // Execute tool calls
      finalMessages.push(choice.message);

      for (const tc of choice.message.tool_calls) {
        const args = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
        const result = await executeTool(adminClient, tc.function.name, args, team_id, user.id);
        toolActions.push({ tool: tc.function.name, ...result });

        finalMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }

      // Continue loop to see if the AI wants to call more tools or give final answer
    }

    // Now stream the final response
    // Prepend tool actions as a custom SSE event
    const encoder = new TextEncoder();
    const toolActionsEvent = toolActions.length > 0
      ? `data: ${JSON.stringify({ type: "tool_actions", actions: toolActions })}\n\n`
      : "";

    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: finalMessages,
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      const t = await streamResponse.text();
      console.error("Final stream error:", streamResponse.status, t);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a combined stream: tool actions event + AI stream
    const readable = new ReadableStream({
      async start(controller) {
        // Send tool actions first
        if (toolActionsEvent) {
          controller.enqueue(encoder.encode(toolActionsEvent));
        }

        // Then pipe AI stream
        const reader = streamResponse.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (e) {
          console.error("Stream pipe error:", e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("rolly-chat error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
