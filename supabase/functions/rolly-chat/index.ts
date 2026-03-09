import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are ROLLY, a sharp, conversational music business advisor inside Rollout — a platform for music managers, labels, publishers, and artist teams.

Your style:
- Keep answers SHORT — 2-4 sentences max. Never write essays.
- Ask 1-2 clarifying questions before giving detailed advice. Understand the user's specific situation first.
- Talk like a smart friend in the business, not a textbook. Be warm but direct.
- Only go deeper when the user asks for more detail.
- Use bullet points sparingly and only when listing concrete options.
- Never dump everything you know. Less is more.

Your expertise: revenue streams, deal structures, splits & royalties, recoupment, industry math, copyright, PROs, business planning, contracts, release strategy, touring economics, sync licensing, and more.

When uncertain, say so and suggest consulting an entertainment attorney. When you have reference material from your knowledge base, weave it in naturally.`;

async function searchKnowledge(adminClient: any, query: string): Promise<string> {
  // Convert the user query into a tsquery-compatible string
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
    // Fallback: try simple ILIKE search
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

    // Validate auth
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

    // Optionally persist messages
    if (conversation_id && team_id) {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Save user message (last one)
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "user") {
        await adminClient.from("rolly_messages").insert({
          conversation_id,
          role: "user",
          content: lastMsg.content,
        });
      }
    }

    // Search knowledge base for relevant context
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    let knowledgeContext = "";
    if (lastUserMsg) {
      try {
        knowledgeContext = await searchKnowledge(adminClient, lastUserMsg.content);
      } catch (e) {
        console.error("Knowledge search error:", e);
      }
    }

    // Build system prompt with knowledge context
    let systemPrompt = SYSTEM_PROMPT;
    if (knowledgeContext) {
      systemPrompt += `\n\n## Reference Material (from "All You Need to Know About the Music Business" by Donald S. Passman)\nUse the following excerpts to inform your answers when relevant. Cite naturally but don't quote verbatim:\n\n${knowledgeContext}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits in your workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
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
