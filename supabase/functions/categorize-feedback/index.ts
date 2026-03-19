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
    const { feedback_id, message, type } = await req.json();
    if (!feedback_id || !message) throw new Error("Missing feedback_id or message");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a feedback classifier for Rollout, a music industry management platform. Classify user feedback into structured categories.",
          },
          {
            role: "user",
            content: `Classify this ${type} feedback:\n\n"${message}"`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_feedback",
              description: "Classify feedback into category, priority, and summary",
              parameters: {
                type: "object",
                properties: {
                  category: {
                    type: "string",
                    enum: [
                      "Roster",
                      "Finance",
                      "Distribution",
                      "Splits",
                      "A&R",
                      "Tasks & Work",
                      "Settings",
                      "Rolly AI",
                      "Onboarding",
                      "Staff",
                      "Overview",
                      "UI/UX",
                      "Performance",
                      "Authentication",
                      "Other",
                    ],
                    description: "The product area this feedback relates to",
                  },
                  priority: {
                    type: "string",
                    enum: ["low", "medium", "high", "critical"],
                    description:
                      "Priority based on severity for bugs or demand for features",
                  },
                  summary: {
                    type: "string",
                    description: "One-line summary of the feedback (max 100 chars)",
                  },
                },
                required: ["category", "priority", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_feedback" } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      return new Response(JSON.stringify({ error: "AI classification failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const classification = JSON.parse(toolCall.function.arguments);

    // Update feedback row with AI classification
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabaseAdmin
      .from("feedback")
      .update({
        ai_category: classification.category,
        ai_priority: classification.priority,
        ai_summary: classification.summary,
      })
      .eq("id", feedback_id);

    return new Response(JSON.stringify({ ok: true, ...classification }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("categorize-feedback error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
