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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate caller is platform admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for privileged ops
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check platform admin
    const { data: isAdmin } = await anonClient.rpc("is_platform_admin", { p_user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: not a platform admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "create_user": {
        const { email, full_name, password } = body;
        if (!email || !full_name || !password) {
          return respond(400, { error: "email, full_name, and password required" });
        }
        const { data: newUser, error } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name },
        });
        if (error) return respond(400, { error: error.message });
        return respond(200, { user_id: newUser.user.id, email });
      }

      case "create_team": {
        const { name, owner_user_id, region = "us", company_type = null } = body;
        if (!name || !owner_user_id) {
          return respond(400, { error: "name and owner_user_id required" });
        }
        const { data: team, error: teamError } = await adminClient
          .from("teams")
          .insert({ name, created_by: owner_user_id, region, company_type, onboarding_completed: true })
          .select("id")
          .single();
        if (teamError) return respond(400, { error: teamError.message });

        const { error: memError } = await adminClient
          .from("team_memberships")
          .insert({
            team_id: team.id,
            user_id: owner_user_id,
            role: "team_owner",
            perm_view_finance: true,
            perm_manage_finance: true,
            perm_view_staff_salaries: true,
            perm_view_ar: true,
            perm_view_roster: true,
            perm_edit_artists: true,
            perm_view_billing: true,
            perm_distribution: true,
          });
        if (memError) return respond(400, { error: memError.message });
        return respond(200, { team_id: team.id });
      }

      case "grant_trial": {
        const { team_id, trial_days = 14 } = body;
        if (!team_id) return respond(400, { error: "team_id required" });

        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + Number(trial_days));

        const { error } = await adminClient
          .from("team_subscriptions")
          .update({
            status: "trialing",
            trial_ends_at: trialEnd.toISOString(),
          })
          .eq("team_id", team_id);
        if (error) return respond(400, { error: error.message });
        return respond(200, { team_id, trial_ends_at: trialEnd.toISOString() });
      }

      case "initiate_transfer": {
        const { team_id, to_user_id } = body;
        if (!team_id || !to_user_id) {
          return respond(400, { error: "team_id and to_user_id required" });
        }
        const { data: transfer, error } = await adminClient
          .from("team_ownership_transfers")
          .insert({
            team_id,
            from_user_id: user.id,
            to_user_id,
            admin_acknowledged_at: new Date().toISOString(),
            status: "pending",
          })
          .select("id, token")
          .single();
        if (error) return respond(400, { error: error.message });
        return respond(200, { transfer_id: transfer.id, token: transfer.token });
      }

      case "accept_transfer": {
        // Called by new owner (not necessarily admin) — but we validate via token
        const { token } = body;
        if (!token) return respond(400, { error: "token required" });

        const { data: transfer, error: fetchErr } = await adminClient
          .from("team_ownership_transfers")
          .select("*")
          .eq("token", token)
          .eq("status", "pending")
          .single();
        if (fetchErr || !transfer) return respond(404, { error: "Transfer not found or already completed" });

        // Verify the caller is the intended recipient
        if (transfer.to_user_id !== user.id) {
          return respond(403, { error: "This transfer is not for you" });
        }

        // Update old owner to manager
        await adminClient
          .from("team_memberships")
          .update({ role: "manager" })
          .eq("team_id", transfer.team_id)
          .eq("user_id", transfer.from_user_id);

        // Update new owner to team_owner (or insert if not yet member)
        const { data: existingMember } = await adminClient
          .from("team_memberships")
          .select("id")
          .eq("team_id", transfer.team_id)
          .eq("user_id", transfer.to_user_id)
          .maybeSingle();

        if (existingMember) {
          await adminClient
            .from("team_memberships")
            .update({ role: "team_owner" })
            .eq("id", existingMember.id);
        } else {
          await adminClient
            .from("team_memberships")
            .insert({
              team_id: transfer.team_id,
              user_id: transfer.to_user_id,
              role: "team_owner",
              perm_view_finance: true,
              perm_manage_finance: true,
              perm_view_staff_salaries: true,
              perm_view_ar: true,
              perm_view_roster: true,
              perm_edit_artists: true,
              perm_view_billing: true,
              perm_distribution: true,
            });
        }

        // Mark transfer accepted
        await adminClient
          .from("team_ownership_transfers")
          .update({
            status: "accepted",
            owner_accepted_at: new Date().toISOString(),
          })
          .eq("id", transfer.id);

        return respond(200, { success: true });
      }

      case "request_support_access": {
        const { team_id, reason } = body;
        if (!team_id) return respond(400, { error: "team_id required" });

        // Expire any stale sessions first
        await adminClient.rpc("expire_support_sessions");

        const { data: request, error } = await adminClient
          .from("support_access_requests")
          .insert({
            team_id,
            admin_user_id: user.id,
            reason: reason || null,
            status: "pending",
          })
          .select("id")
          .single();
        if (error) return respond(400, { error: error.message });
        return respond(200, { request_id: request.id });
      }

      case "approve_support_access": {
        // Called by team owner — validate they own the team
        const { request_id } = body;
        if (!request_id) return respond(400, { error: "request_id required" });

        const { data: request, error: fetchErr } = await adminClient
          .from("support_access_requests")
          .select("*")
          .eq("id", request_id)
          .eq("status", "pending")
          .single();
        if (fetchErr || !request) return respond(404, { error: "Request not found or expired" });

        // Check if expired
        if (new Date(request.expires_at) < new Date()) {
          await adminClient
            .from("support_access_requests")
            .update({ status: "expired" })
            .eq("id", request_id);
          return respond(400, { error: "Request has expired" });
        }

        // Verify caller is team owner/manager
        const { data: membership } = await anonClient
          .from("team_memberships")
          .select("role")
          .eq("team_id", request.team_id)
          .eq("user_id", user.id)
          .in("role", ["team_owner", "manager"])
          .maybeSingle();
        if (!membership) return respond(403, { error: "Only team owners/managers can approve" });

        // Insert admin as support session member
        await adminClient
          .from("team_memberships")
          .insert({
            team_id: request.team_id,
            user_id: request.admin_user_id,
            role: "manager",
            is_support_session: true,
            perm_view_finance: true,
            perm_manage_finance: false,
            perm_view_staff_salaries: false,
            perm_view_ar: true,
            perm_view_roster: true,
            perm_edit_artists: false,
            perm_view_billing: false,
            perm_distribution: false,
          });

        await adminClient
          .from("support_access_requests")
          .update({
            status: "active",
            approved_by: user.id,
            approved_at: new Date().toISOString(),
            started_at: new Date().toISOString(),
          })
          .eq("id", request_id);

        return respond(200, { success: true });
      }

      case "deny_support_access": {
        const { request_id } = body;
        if (!request_id) return respond(400, { error: "request_id required" });

        await adminClient
          .from("support_access_requests")
          .update({ status: "denied" })
          .eq("id", request_id);
        return respond(200, { success: true });
      }

      case "end_support_session": {
        const { request_id } = body;
        if (!request_id) return respond(400, { error: "request_id required" });

        const { data: request } = await adminClient
          .from("support_access_requests")
          .select("*")
          .eq("id", request_id)
          .eq("status", "active")
          .single();
        if (!request) return respond(404, { error: "Active session not found" });

        // Remove support membership
        await adminClient
          .from("team_memberships")
          .delete()
          .eq("team_id", request.team_id)
          .eq("user_id", request.admin_user_id)
          .eq("is_support_session", true);

        await adminClient
          .from("support_access_requests")
          .update({
            status: "completed",
            ended_at: new Date().toISOString(),
          })
          .eq("id", request_id);

        return respond(200, { success: true });
      }

      case "revoke_support_access": {
        // Called by team owner to revoke an active session
        const { request_id } = body;
        if (!request_id) return respond(400, { error: "request_id required" });

        const { data: request } = await adminClient
          .from("support_access_requests")
          .select("*")
          .eq("id", request_id)
          .eq("status", "active")
          .single();
        if (!request) return respond(404, { error: "Active session not found" });

        // Remove support membership
        await adminClient
          .from("team_memberships")
          .delete()
          .eq("team_id", request.team_id)
          .eq("user_id", request.admin_user_id)
          .eq("is_support_session", true);

        await adminClient
          .from("support_access_requests")
          .update({
            status: "completed",
            ended_at: new Date().toISOString(),
          })
          .eq("id", request_id);

        return respond(200, { success: true });
      }

      default:
        return respond(400, { error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error("admin-actions error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  function respond(status: number, data: Record<string, unknown>) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
