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
      return respond(401, { error: "Unauthorized" });
    }

    // Service role client for privileged ops
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check platform admin
    const { data: isAdmin } = await anonClient.rpc("is_platform_admin", { p_user_id: user.id });
    if (!isAdmin) {
      return respond(403, { error: "Forbidden: not a platform admin" });
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      /* ─── List Users (for searchable dropdowns) ─── */
      case "list_users": {
        const { data: users } = await adminClient
          .from("profiles")
          .select("id, full_name, avatar_url")
          .order("full_name");
        // Also get emails from auth
        const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        const emailMap = new Map((authUsers || []).map(u => [u.id, u.email]));
        const result = (users || []).map(u => ({
          id: u.id,
          label: `${u.full_name || "Unknown"} (${emailMap.get(u.id) || "no email"})`,
          name: u.full_name || "Unknown",
          email: emailMap.get(u.id) || "",
        }));
        return respond(200, { items: result });
      }

      /* ─── List Teams (for searchable dropdowns) ─── */
      case "list_teams": {
        const { data: teams } = await adminClient
          .from("teams")
          .select("id, name")
          .order("name");
        const result = (teams || []).map(t => ({
          id: t.id,
          label: t.name,
          name: t.name,
        }));
        return respond(200, { items: result });
      }

      /* ─── Create User (enhanced: optional role + team + trial + admin join) ─── */
      case "create_user": {
        const { email, full_name, password, role, team_name, trial_days } = body;
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

        const result: Record<string, unknown> = {
          user_id: newUser.user.id,
          email,
          full_name,
        };

        if (role === "team_owner" && team_name) {
          const { data: team, error: teamError } = await adminClient
            .from("teams")
            .insert({
              name: team_name,
              created_by: newUser.user.id,
              onboarding_completed: true,
            })
            .select("id")
            .single();
          if (teamError) return respond(400, { error: teamError.message });

          await adminClient.from("team_memberships").insert({
            team_id: team.id,
            user_id: newUser.user.id,
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

          // Auto-add the calling admin as a manager on the new team
          if (user.id !== newUser.user.id) {
            await adminClient.from("team_memberships").insert({
              team_id: team.id,
              user_id: user.id,
              role: "manager",
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

          const days = Number(trial_days) || 30;
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + days);
          await adminClient.from("team_subscriptions").upsert({
            team_id: team.id,
            status: "trialing",
            trial_ends_at: trialEnd.toISOString(),
          }, { onConflict: "team_id" });

          result.team_id = team.id;
          result.team_name = team_name;
          result.trial_ends_at = trialEnd.toISOString();
        }

        // Send welcome email with credentials
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey) {
          const loginUrl = "https://rollout-cc.lovable.app/login";
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Rollout <accounts@rollout.cc>",
              to: [email],
              subject: `Welcome to Rollout, ${full_name.split(" ")[0]}!`,
              html: `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f5f5f0;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 0;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;padding:40px;">
<tr><td style="text-align:center;padding-bottom:24px;">
  <img src="https://ctnsworqzzguykzzvdme.supabase.co/storage/v1/object/public/email-assets/rollout-flag.png" alt="Rollout" width="40" style="display:inline-block;" />
</td></tr>
<tr><td>
  <h1 style="margin:0 0 16px;font-size:22px;color:#121212;">Welcome to Rollout, ${full_name}!</h1>
  <p style="margin:0 0 20px;font-size:15px;color:#55575d;line-height:1.6;">
    Your account has been created${team_name ? ` and your team <strong>${team_name}</strong> is ready to go` : ""}. Here are your login details:
  </p>
  <table width="100%" cellpadding="12" cellspacing="0" style="background:#f5f5f0;border-radius:6px;margin-bottom:24px;">
    <tr><td style="font-size:13px;color:#55575d;">Email</td><td style="font-size:14px;color:#121212;font-weight:600;">${email}</td></tr>
    <tr><td style="font-size:13px;color:#55575d;">Password</td><td style="font-size:14px;color:#121212;font-weight:600;">${password}</td></tr>
  </table>
  <p style="margin:0 0 24px;font-size:13px;color:#999;">Please change your password after your first login.</p>
  <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
    <a href="${loginUrl}" style="display:inline-block;background:#121212;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:15px;font-weight:600;">Log In to Rollout</a>
  </td></tr></table>
</td></tr>
<tr><td style="padding-top:32px;text-align:center;">
  <img src="https://ctnsworqzzguykzzvdme.supabase.co/storage/v1/object/public/email-assets/rollout-logo.png" alt="ROLLOUT" height="24" style="display:inline-block;" />
</td></tr>
</table>
</td></tr></table>
</body></html>`,
            }),
          });
        }

        return respond(200, result);
      }

      case "create_team": {
        const { name, owner_user_id, region = "us", company_type = null } = body;
        if (!name || !owner_user_id) {
          return respond(400, { error: "name and owner_user_id required" });
        }
        const { data: team, error: teamError } = await adminClient
          .from("teams")
          .insert({ name, created_by: owner_user_id, region, company_type, onboarding_completed: true })
          .select("id, name")
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

        // Auto-add the calling admin as a manager on the new team
        if (user.id !== owner_user_id) {
          await adminClient.from("team_memberships").insert({
            team_id: team.id,
            user_id: user.id,
            role: "manager",
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

        return respond(200, { team_id: team.id, team_name: team.name });
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

        // Fetch team name for response
        const { data: team } = await adminClient.from("teams").select("name").eq("id", team_id).single();
        return respond(200, { team_id, team_name: team?.name, trial_ends_at: trialEnd.toISOString() });
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

        // Fetch team name and recipient info for email
        const [{ data: team }, { data: { user: recipient } }] = await Promise.all([
          adminClient.from("teams").select("name").eq("id", team_id).single(),
          adminClient.auth.admin.getUserById(to_user_id),
        ]);

        const teamName = team?.name || "your team";
        const recipientEmail = recipient?.email;
        const recipientName = recipient?.user_metadata?.full_name || "there";

        // Send ownership transfer email via Resend
        if (recipientEmail) {
          const resendKey = Deno.env.get("RESEND_API_KEY");
          if (resendKey) {
            const acceptUrl = `${supabaseUrl.replace('.supabase.co', '').includes('localhost') ? 'http://localhost:5173' : 'https://rollout-cc.lovable.app'}/accept-ownership/${transfer.token}`;
            
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: "Rollout <accounts@rollout.cc>",
                to: [recipientEmail],
                subject: `You've been given ownership of ${teamName} on Rollout`,
                html: buildTransferEmail(recipientName, teamName, acceptUrl),
              }),
            });
          }
        }

        return respond(200, {
          transfer_id: transfer.id,
          token: transfer.token,
          team_name: teamName,
          recipient_name: recipientName,
          recipient_email: recipientEmail,
        });
      }

      case "accept_transfer": {
        const { token } = body;
        if (!token) return respond(400, { error: "token required" });

        const { data: transfer, error: fetchErr } = await adminClient
          .from("team_ownership_transfers")
          .select("*")
          .eq("token", token)
          .eq("status", "pending")
          .single();
        if (fetchErr || !transfer) return respond(404, { error: "Transfer not found or already completed" });

        if (transfer.to_user_id !== user.id) {
          return respond(403, { error: "This transfer is not for you" });
        }

        await adminClient
          .from("team_memberships")
          .update({ role: "manager" })
          .eq("team_id", transfer.team_id)
          .eq("user_id", transfer.from_user_id);

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
        const { request_id } = body;
        if (!request_id) return respond(400, { error: "request_id required" });

        const { data: request, error: fetchErr } = await adminClient
          .from("support_access_requests")
          .select("*")
          .eq("id", request_id)
          .eq("status", "pending")
          .single();
        if (fetchErr || !request) return respond(404, { error: "Request not found or expired" });

        if (new Date(request.expires_at) < new Date()) {
          await adminClient
            .from("support_access_requests")
            .update({ status: "expired" })
            .eq("id", request_id);
          return respond(400, { error: "Request has expired" });
        }

        const { data: membership } = await anonClient
          .from("team_memberships")
          .select("role")
          .eq("team_id", request.team_id)
          .eq("user_id", user.id)
          .in("role", ["team_owner", "manager"])
          .maybeSingle();
        if (!membership) return respond(403, { error: "Only team owners/managers can approve" });

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
        const { request_id } = body;
        if (!request_id) return respond(400, { error: "request_id required" });

        const { data: request } = await adminClient
          .from("support_access_requests")
          .select("*")
          .eq("id", request_id)
          .eq("status", "active")
          .single();
        if (!request) return respond(404, { error: "Active session not found" });

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

      case "delete_user": {
        const { user_id: delUserId } = body;
        if (!delUserId) return respond(400, { error: "user_id required" });
        const { error: delErr } = await adminClient.auth.admin.deleteUser(delUserId);
        if (delErr) return respond(400, { error: delErr.message });
        return respond(200, { success: true, deleted: delUserId });
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

/* ─── Branded transfer email HTML ─── */
function buildTransferEmail(name: string, teamName: string, acceptUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#e8e4dc;border-radius:8px;padding:48px 40px;">
<tr><td>
  <img src="https://app.rollout.cc/rollout-flag.png" alt="Rollout" height="40" style="margin-bottom:24px;" />
  <h1 style="font-size:28px;font-weight:bold;color:#0d0d0d;margin:0 0 16px;line-height:1.2;">
    You've been given ownership of ${teamName}
  </h1>
  <p style="font-size:16px;color:#0d0d0d;line-height:1.5;margin:0 0 24px;">
    Hi ${name},
  </p>
  <p style="font-size:16px;color:#0d0d0d;line-height:1.5;margin:0 0 24px;">
    The Rollout team has set up <strong>${teamName}</strong> for you and is ready to transfer full ownership to you.
  </p>
  <div style="background-color:#d5d0c8;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
    <p style="font-size:13px;color:#737373;margin:0 0 4px;line-height:1.3;">What this means</p>
    <ul style="font-size:15px;color:#0d0d0d;line-height:1.6;margin:8px 0 0;padding-left:20px;">
      <li>You will become the sole owner of <strong>${teamName}</strong> and all its data</li>
      <li>No one at Rollout can access your account or data without your explicit written consent</li>
      <li>This transfer is logged and timestamped for your security</li>
    </ul>
  </div>
  <p style="margin:0 0 32px;">
    <a href="${acceptUrl}" style="background-color:#0d0d0d;color:#f2ead9;font-size:15px;font-weight:600;border-radius:9999px;padding:14px 32px;text-decoration:none;display:inline-block;">
      Accept Ownership
    </a>
  </p>
  <hr style="border:none;border-top:1px solid #c4c0b8;margin:32px 0;" />
  <p style="font-size:14px;color:#666666;line-height:1.5;margin:0 0 8px;">
    If you didn't expect this, you can safely ignore this email. The transfer will not proceed until you accept it.
  </p>
  <p style="font-size:14px;color:#666666;line-height:1.5;margin:0 0 8px;">
    Questions? Reply to this email or reach out at <a href="mailto:support@rollout.cc" style="color:#0d0d0d;font-weight:bold;text-decoration:none;">support@rollout.cc</a>
  </p>
  <img src="https://ctnsworqzzguykzzvdme.supabase.co/storage/v1/object/public/email-assets/rollout-logo.png" alt="ROLLOUT" height="32" style="margin-top:24px;" />
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
