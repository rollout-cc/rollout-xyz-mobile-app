import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, email, phone, team_name, invitee_name } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inviteUrl = `https://rollout.cc/join/${token}`;

    // If we have an email, we could send via a transactional email service
    // For now, log the invite and return success so the frontend can show the link
    console.log(`Invite notification:`, {
      to: email || phone,
      invitee_name,
      team_name,
      url: inviteUrl,
    });

    // TODO: Integrate with Resend or another email service when RESEND_API_KEY is configured
    // For now, return success - the frontend will show a "link copied" fallback

    return new Response(
      JSON.stringify({
        success: true,
        message: email
          ? `Invite link generated for ${email}`
          : `Invite link generated for ${phone}`,
        url: inviteUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
