// Edge function to accept a team invite link
// Validates token, creates team membership + artist permissions, marks invite as used
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Get the user's JWT from authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "Token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get the authenticated user
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up invite
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("invite_links")
      .select("*")
      .eq("token", token)
      .single();

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: "Invalid invite link" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "This invite has expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already used
    if (invite.used_at) {
      return new Response(JSON.stringify({ error: "This invite has already been used" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is already a member of this team
    const { data: existing } = await supabaseAdmin
      .from("team_memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("team_id", invite.team_id)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ error: "You're already a member of this team", already_member: true }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create team membership
    const { error: memberError } = await supabaseAdmin
      .from("team_memberships")
      .insert({ user_id: user.id, team_id: invite.team_id, role: invite.role });

    if (memberError) throw memberError;

    // Set artist permissions if configured
    const artistPerms = invite.artist_permissions as any[] | null;
    if (artistPerms && artistPerms.length > 0) {
      const permRows = artistPerms.map((p: any) => ({
        user_id: user.id,
        artist_id: p.artist_id,
        permission: p.permission || "view_access",
      }));
      const { error: permError } = await supabaseAdmin
        .from("artist_permissions")
        .insert(permRows);
      if (permError) console.error("Permission insert error:", permError);
    }

    // Mark invite as used
    await supabaseAdmin
      .from("invite_links")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);

    // Get team info for the response
    const { data: team } = await supabaseAdmin
      .from("teams")
      .select("name")
      .eq("id", invite.team_id)
      .single();

    // Get artists this user now has access to
    const { data: artists } = await supabaseAdmin
      .from("artists")
      .select("id, name, avatar_url")
      .eq("team_id", invite.team_id);

    return new Response(JSON.stringify({
      success: true,
      team_name: team?.name,
      role: invite.role,
      artists: artists || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Accept invite error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
