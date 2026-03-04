const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const flagUrl = 'https://app.rollout.cc/rollout-flag.png';
const wordmarkUrl = 'https://ctnsworqzzguykzzvdme.supabase.co/storage/v1/object/public/email-assets/rollout-logo.png';

type NotificationType =
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'task_completed'
  | 'milestone_approaching'
  | 'budget_threshold'
  | 'new_artist';

interface NotificationPayload {
  type: NotificationType;
  to_email: string;
  to_name?: string;
  // Task fields
  task_title?: string;
  artist_name?: string;
  initiative_name?: string;
  due_date?: string;
  assigner_name?: string;
  task_id?: string;
  // Milestone fields
  milestone_title?: string;
  milestone_date?: string;
  timeline_name?: string;
  artist_id?: string;
  // Budget fields
  budget_label?: string;
  threshold_pct?: number;
  spent_amount?: number;
  total_budget?: number;
  // New artist fields
  new_artist_name?: string;
  team_name?: string;
  artist_avatar_url?: string;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatDayOfWeek(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[d.getDay()];
}

function buildTaskCard(p: NotificationPayload, rightLabel: string, rightValue: string, badgeHtml = ''): string {
  const contextLine = [p.artist_name, p.initiative_name].filter(Boolean).join(' / ');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#d5d0c8;border-radius:8px;margin:0 0 24px;">
      <tr><td style="padding:16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;color:#737373;line-height:1.3;">${contextLine}</td>
            <td style="font-size:13px;color:#737373;line-height:1.3;text-align:right;">${rightLabel} ${badgeHtml}</td>
          </tr>
          <tr>
            <td style="font-size:16px;font-weight:bold;color:#0d0d0d;line-height:1.3;padding-top:4px;">${p.task_title || ''}</td>
            <td style="font-size:16px;font-weight:bold;color:#0d0d0d;line-height:1.3;text-align:right;padding-top:4px;">${rightValue}</td>
          </tr>
        </table>
      </td></tr>
    </table>`;
}

function buildMilestoneCard(p: NotificationPayload): string {
  const contextLine = [p.artist_name, p.timeline_name].filter(Boolean).join(' / ');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#d5d0c8;border-radius:8px;margin:0 0 24px;">
      <tr><td style="padding:16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;color:#737373;line-height:1.3;">${contextLine}</td>
            <td style="font-size:13px;color:#737373;line-height:1.3;text-align:right;">${formatDayOfWeek(p.milestone_date)}</td>
          </tr>
          <tr>
            <td style="font-size:16px;font-weight:bold;color:#0d0d0d;line-height:1.3;padding-top:4px;">${p.milestone_title || ''}</td>
            <td style="font-size:16px;font-weight:bold;color:#0d0d0d;line-height:1.3;text-align:right;padding-top:4px;">${formatDate(p.milestone_date)}</td>
          </tr>
        </table>
      </td></tr>
    </table>`;
}

function getSubjectAndContent(p: NotificationPayload): { subject: string; heading: string; body: string; card: string; ctaLabel: string; ctaUrl: string; manageNotifs: boolean } {
  const baseUrl = 'https://app.rollout.cc';

  switch (p.type) {
    case 'task_assigned':
      return {
        subject: 'You have a new task',
        heading: 'You have a new task.',
        body: p.assigner_name ? `<strong>${p.assigner_name}</strong> has assigned you a new task.` : 'You have been assigned a new task.',
        card: buildTaskCard(p, 'Deadline', formatDate(p.due_date)),
        ctaLabel: 'View Task',
        ctaUrl: `${baseUrl}/tasks`,
        manageNotifs: true,
      };

    case 'task_due_soon':
      return {
        subject: 'Your task is due in 24 hours',
        heading: 'Your task is due in 24 hours.',
        body: '',
        card: buildTaskCard(p, 'Deadline', formatDate(p.due_date)),
        ctaLabel: 'View Task',
        ctaUrl: `${baseUrl}/tasks`,
        manageNotifs: true,
      };

    case 'task_overdue':
      return {
        subject: 'One of your tasks is overdue',
        heading: 'One of your tasks is overdue.',
        body: '',
        card: buildTaskCard(p, '', formatDate(p.due_date), '<span style="background-color:#c0392b;color:#ffffff;font-size:12px;font-weight:bold;border-radius:4px;padding:2px 8px;">Overdue</span>'),
        ctaLabel: 'View Task',
        ctaUrl: `${baseUrl}/tasks`,
        manageNotifs: true,
      };

    case 'task_completed':
      return {
        subject: 'A task has been completed',
        heading: 'A task has been completed.',
        body: p.assigner_name ? `<strong>${p.assigner_name}</strong> completed a task you assigned.` : 'A task you assigned has been completed.',
        card: buildTaskCard(p, '✓ Completed', ''),
        ctaLabel: 'View Task',
        ctaUrl: `${baseUrl}/tasks`,
        manageNotifs: true,
      };

    case 'milestone_approaching':
      return {
        subject: 'Your project has reached a milestone',
        heading: 'Your project has reached a milestone.',
        body: '',
        card: buildMilestoneCard(p),
        ctaLabel: 'View Timeline',
        ctaUrl: p.artist_id ? `${baseUrl}/artist/${p.artist_id}` : baseUrl,
        manageNotifs: true,
      };

    case 'budget_threshold':
      return {
        subject: `Budget alert: ${p.budget_label} at ${p.threshold_pct}%`,
        heading: `Budget alert: ${p.threshold_pct}% spent.`,
        body: `Your <strong>${p.budget_label}</strong> budget for <strong>${p.artist_name}</strong> has reached ${p.threshold_pct}% utilization.`,
        card: '',
        ctaLabel: 'View Budget',
        ctaUrl: p.artist_id ? `${baseUrl}/artist/${p.artist_id}` : baseUrl,
        manageNotifs: true,
      };

    case 'new_artist': {
      const avatarHtml = p.artist_avatar_url ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#d5d0c8;border-radius:8px;margin:0 0 24px;">
          <tr><td style="padding:16px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="vertical-align:middle;padding-right:16px;">
                <img src="${p.artist_avatar_url}" alt="${p.new_artist_name || ''}" width="64" height="64" style="width:64px;height:64px;border-radius:50%;object-fit:cover;display:block;" />
              </td>
              <td style="vertical-align:middle;">
                <p style="font-size:16px;font-weight:bold;color:#0d0d0d;margin:0;line-height:1.3;">${p.new_artist_name || ''}</p>
                <p style="font-size:13px;color:#737373;margin:4px 0 0;line-height:1.3;">Added to your roster</p>
              </td>
            </tr></table>
          </td></tr>
        </table>` : '';
      return {
        subject: `New artist added: ${p.new_artist_name}`,
        heading: 'A new artist has been added.',
        body: p.artist_avatar_url ? '' : `<strong>${p.new_artist_name}</strong> has been added to your roster${p.team_name ? ` in ${p.team_name}` : ''}.`,
        card: avatarHtml,
        ctaLabel: 'View Roster',
        ctaUrl: `${baseUrl}/roster`,
        manageNotifs: true,
      };
    }

    default:
      return {
        subject: 'Notification from Rollout',
        heading: 'You have a notification.',
        body: '',
        card: '',
        ctaLabel: 'Visit Rollout',
        ctaUrl: baseUrl,
        manageNotifs: false,
      };
  }
}

function buildHtml(p: NotificationPayload): string {
  const { heading, body, card, ctaLabel, ctaUrl, manageNotifs } = getSubjectAndContent(p);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:Switzer,Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#e8e4dc;">
        <tr><td style="padding:48px 40px;">
          <img src="${flagUrl}" alt="Rollout" height="40" style="height:40px;margin-bottom:24px;display:block;" />
          <h1 style="font-size:28px;font-weight:bold;color:#0d0d0d;margin:0 0 16px;line-height:1.2;">${heading}</h1>
          ${body ? `<p style="font-size:16px;color:#0d0d0d;line-height:1.5;margin:0 0 24px;">${body}</p>` : ''}
          ${card}
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="background-color:#0d0d0d;border-radius:9999px;padding:14px 32px;">
              <a href="${ctaUrl}" target="_blank" style="color:#f2ead9;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">
                ${ctaLabel}
              </a>
            </td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #c4c0b8;margin:32px 0;" />
          <p style="font-size:14px;color:#666666;line-height:1.5;margin:0 0 8px;">
            For any questions or issues please email <a href="mailto:support@rollout.cc" style="color:#0d0d0d;font-weight:bold;text-decoration:none;">support@rollout.cc</a>
          </p>
          ${manageNotifs ? `<p style="font-size:14px;color:#666666;line-height:1.5;margin:0 0 8px;">Don't want to receive these notifications from Rollout? <a href="https://app.rollout.cc/settings" style="color:#0d0d0d;font-weight:bold;text-decoration:none;">Manage notifications</a></p>` : ''}
          <img src="${wordmarkUrl}" alt="ROLLOUT" height="32" style="height:32px;margin-top:24px;" />
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload & { user_id?: string } = await req.json();

    // If user_id provided but no email, resolve it via service role
    if (payload.user_id && !payload.to_email) {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: userData } = await adminClient.auth.admin.getUserById(payload.user_id);
      if (!userData?.user?.email) {
        return new Response(JSON.stringify({ skipped: true, reason: "no email found" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      payload.to_email = userData.user.email;
      delete payload.user_id;
    }

    if (!payload.type || !payload.to_email) {
      return new Response(JSON.stringify({ error: "type and to_email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { subject } = getSubjectAndContent(payload);
    const html = buildHtml(payload);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Rollout <accounts@rollout.cc>",
        to: [payload.to_email],
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend API error:", resendData);
      throw new Error(resendData.message || "Failed to send notification email");
    }

    console.log("Notification email sent:", resendData.id, payload.type);

    return new Response(
      JSON.stringify({ success: true, email_id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-notification error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
