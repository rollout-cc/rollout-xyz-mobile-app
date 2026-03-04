const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const flagUrl = 'https://ctnsworqzzguykzzvdme.supabase.co/storage/v1/object/public/email-assets/rollout-flag.svg';
const wordmarkUrl = 'https://ctnsworqzzguykzzvdme.supabase.co/storage/v1/object/public/email-assets/rollout-logo.png';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface DigestPayload {
  type: 'daily' | 'weekly';
  user_id?: string; // if provided, only send to this user; otherwise send to all eligible
}

function formatDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatDayOfWeek(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[d.getDay()];
}

function statCard(label: string, value: number, color = '#0d0d0d'): string {
  return `<td style="background-color:#d5d0c8;border-radius:8px;padding:16px;text-align:center;width:33%;">
    <p style="font-size:13px;color:#737373;margin:0 0 8px;">${label}</p>
    <p style="font-size:32px;font-weight:bold;color:${color};margin:0;">${value}</p>
  </td>`;
}

function milestoneRow(artistName: string, timelineName: string, title: string, date: string): string {
  return `<tr>
    <td style="padding:12px 20px;border-bottom:1px solid #c4c0b8;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;color:#737373;">${artistName} / ${timelineName}</td>
          <td style="font-size:13px;color:#737373;text-align:right;">${formatDayOfWeek(date)}</td>
        </tr>
        <tr>
          <td style="font-size:16px;font-weight:bold;color:#0d0d0d;padding-top:4px;">${title}</td>
          <td style="font-size:16px;font-weight:bold;color:#0d0d0d;text-align:right;padding-top:4px;">${formatShortDate(date)}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function linkRow(artistName: string, folderName: string, title: string, url: string): string {
  return `<tr>
    <td style="padding:12px 20px;border-bottom:1px solid #c4c0b8;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="font-size:13px;color:#737373;margin:0;">${artistName}${folderName ? ` / ${folderName}` : ''}</p>
            <p style="font-size:16px;font-weight:bold;color:#0d0d0d;margin:4px 0 0;">${title}</p>
          </td>
          <td style="text-align:right;vertical-align:middle;">
            <a href="${url}" style="font-size:13px;color:#737373;text-decoration:none;">Visit Link →</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: DigestPayload = await req.json();
    const isWeekly = payload.type === 'weekly';

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get eligible users (those with the preference enabled)
    const prefCol = isWeekly ? 'weekly_summary_email' : 'daily_checkin_email';
    let prefsQuery = supabase
      .from('notification_preferences')
      .select('user_id')
      .eq(prefCol, true);

    if (payload.user_id) {
      prefsQuery = prefsQuery.eq('user_id', payload.user_id);
    }

    const { data: eligibleUsers, error: prefsError } = await prefsQuery;
    if (prefsError) throw prefsError;
    if (!eligibleUsers?.length) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = eligibleUsers.map(u => u.user_id);
    let sentCount = 0;

    for (const userId of userIds) {
      try {
        // Get user email & profile
        const { data: authUser } = await supabase.auth.admin.getUserById(userId);
        if (!authUser?.user?.email) continue;

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .single();

        // Get team memberships
        const { data: memberships } = await supabase
          .from('team_memberships')
          .select('team_id, role')
          .eq('user_id', userId);

        if (!memberships?.length) continue;

        const teamIds = memberships.map(m => m.team_id);
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // User's tasks
        const { data: userTasks } = await supabase
          .from('tasks')
          .select('id, title, is_completed, completed_at, due_date, artist_id')
          .eq('assigned_to', userId)
          .in('team_id', teamIds);

        const myCompleted = (userTasks || []).filter(t => t.is_completed && t.completed_at && new Date(t.completed_at) >= weekAgo).length;
        const myOverdue = (userTasks || []).filter(t => !t.is_completed && t.due_date && new Date(t.due_date) < now).length;
        const myDueSoon = (userTasks || []).filter(t => !t.is_completed && t.due_date && new Date(t.due_date) >= now && new Date(t.due_date) <= weekAhead).length;
        const pendingCount = (userTasks || []).filter(t => !t.is_completed).length;

        // Team tasks (for weekly)
        let teamCompleted = 0, teamOverdue = 0, teamDueSoon = 0;
        if (isWeekly) {
          const { data: allTasks } = await supabase
            .from('tasks')
            .select('id, is_completed, completed_at, due_date')
            .in('team_id', teamIds);

          teamCompleted = (allTasks || []).filter(t => t.is_completed && t.completed_at && new Date(t.completed_at) >= weekAgo).length;
          teamOverdue = (allTasks || []).filter(t => !t.is_completed && t.due_date && new Date(t.due_date) < now).length;
          teamDueSoon = (allTasks || []).filter(t => !t.is_completed && t.due_date && new Date(t.due_date) >= now && new Date(t.due_date) <= weekAhead).length;
        }

        // Milestones (for weekly)
        let milestonesHtml = '';
        if (isWeekly) {
          const { data: milestones } = await supabase
            .from('artist_milestones')
            .select('title, date, artist_id, timeline_id')
            .gte('date', now.toISOString().split('T')[0])
            .lte('date', weekAhead.toISOString().split('T')[0])
            .order('date');

          if (milestones?.length) {
            // Get artist names and timeline names
            const artistIds = [...new Set(milestones.map(m => m.artist_id))];
            const timelineIds = [...new Set(milestones.filter(m => m.timeline_id).map(m => m.timeline_id!))];

            const { data: artists } = await supabase.from('artists').select('id, name').in('id', artistIds);
            const { data: timelines } = timelineIds.length
              ? await supabase.from('artist_timelines').select('id, name').in('id', timelineIds)
              : { data: [] };

            const artistMap = Object.fromEntries((artists || []).map(a => [a.id, a.name]));
            const timelineMap = Object.fromEntries((timelines || []).map(t => [t.id, t.name]));

            const rows = milestones.map(m =>
              milestoneRow(artistMap[m.artist_id] || '', timelineMap[m.timeline_id || ''] || '', m.title, m.date)
            ).join('');

            milestonesHtml = `
              <h2 style="font-size:20px;font-weight:bold;color:#0d0d0d;margin:32px 0 16px;">Milestones for the next week</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#d5d0c8;border-radius:8px;overflow:hidden;">
                ${rows}
              </table>`;
          }
        }

        // Recent links (for weekly)
        let linksHtml = '';
        if (isWeekly) {
          const { data: recentLinks } = await supabase
            .from('artist_links')
            .select('title, url, artist_id, folder_id, created_at')
            .gte('created_at', weekAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(5);

          if (recentLinks?.length) {
            const artistIds = [...new Set(recentLinks.filter(l => l.artist_id).map(l => l.artist_id!))];
            const folderIds = [...new Set(recentLinks.filter(l => l.folder_id).map(l => l.folder_id!))];

            const { data: artists } = artistIds.length
              ? await supabase.from('artists').select('id, name').in('id', artistIds)
              : { data: [] };
            const { data: folders } = folderIds.length
              ? await supabase.from('artist_link_folders').select('id, name').in('id', folderIds)
              : { data: [] };

            const artistMap = Object.fromEntries((artists || []).map(a => [a.id, a.name]));
            const folderMap = Object.fromEntries((folders || []).map(f => [f.id, f.name]));

            const rows = recentLinks.map(l =>
              linkRow(artistMap[l.artist_id || ''] || '', folderMap[l.folder_id || ''] || '', l.title, l.url)
            ).join('');

            linksHtml = `
              <h2 style="font-size:20px;font-weight:bold;color:#0d0d0d;margin:32px 0 16px;">Your team added ${recentLinks.length} link${recentLinks.length === 1 ? '' : 's'} this week</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#d5d0c8;border-radius:8px;overflow:hidden;">
                ${rows}
              </table>`;
          }
        }

        // Build email
        const today = formatDate(now);
        const weekStart = isWeekly ? formatDate(weekAgo) : '';

        const dateRange = isWeekly
          ? `${formatDate(weekAgo)} – ${formatDate(now)}`
          : today;

        const heading = isWeekly ? 'Weekly Summary' : 'Daily Check-in';
        const intro = isWeekly
          ? 'Hope you had a successful week! Here is a summary of what happened to you and your team this week.'
          : "You're killing it! Here is your daily summary to help you stay on track.";

        const overdueColor = myOverdue > 0 ? '#c0392b' : '#0d0d0d';
        const dueSoonColor = myDueSoon > 0 ? '#e67e22' : '#0d0d0d';

        let statsHtml = `
          <h2 style="font-size:20px;font-weight:bold;color:#0d0d0d;margin:32px 0 16px;">Your week at a glance</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              ${statCard('Completed', myCompleted)}
              <td style="width:8px;"></td>
              ${statCard('Overdue', myOverdue, overdueColor)}
              <td style="width:8px;"></td>
              ${statCard('Due Soon', myDueSoon, dueSoonColor)}
            </tr>
          </table>`;

        if (isWeekly) {
          const tOverdueColor = teamOverdue > 0 ? '#c0392b' : '#0d0d0d';
          const tDueSoonColor = teamDueSoon > 0 ? '#e67e22' : '#0d0d0d';
          statsHtml += `
            <h2 style="font-size:20px;font-weight:bold;color:#0d0d0d;margin:32px 0 16px;">Team Overview</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${statCard('Completed', teamCompleted)}
                <td style="width:8px;"></td>
                ${statCard('Overdue', teamOverdue, tOverdueColor)}
                <td style="width:8px;"></td>
                ${statCard('Due Soon', teamDueSoon, tDueSoonColor)}
              </tr>
            </table>`;
        }

        const pendingLine = pendingCount > 0
          ? `<p style="font-size:14px;color:#0d0d0d;margin:16px 0 24px;">View all ${pendingCount} pending tasks in <strong>Rollout</strong>.</p>`
          : '';

        const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:Switzer,Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#e8e4dc;">
        <tr><td style="padding:48px 40px;">
          <img src="${flagUrl}" alt="Rollout" height="40" style="height:40px;margin-bottom:24px;display:block;" />
          <p style="font-size:14px;color:#737373;margin:0 0 8px;">${dateRange}</p>
          <h1 style="font-size:28px;font-weight:bold;color:#0d0d0d;margin:0 0 16px;line-height:1.2;">${heading}</h1>
          <p style="font-size:16px;color:#0d0d0d;line-height:1.5;margin:0 0 24px;">${intro}</p>
          ${statsHtml}
          ${pendingLine}
          ${milestonesHtml}
          ${linksHtml}
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="background-color:#0d0d0d;border-radius:9999px;padding:14px 32px;">
              <a href="https://app.rollout.cc" target="_blank" style="color:#f2ead9;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">
                ${isWeekly ? 'Visit Rollout' : 'See All Tasks'}
              </a>
            </td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #c4c0b8;margin:32px 0;" />
          <p style="font-size:14px;color:#666666;line-height:1.5;margin:0 0 8px;">
            For any questions or issues please email <a href="mailto:support@rollout.cc" style="color:#0d0d0d;font-weight:bold;text-decoration:none;">support@rollout.cc</a>
          </p>
          <p style="font-size:14px;color:#666666;line-height:1.5;margin:0 0 8px;">
            Don't want to receive these notifications from Rollout? <a href="https://app.rollout.cc/settings" style="color:#0d0d0d;font-weight:bold;text-decoration:none;">Manage notifications</a>
          </p>
          <img src="${wordmarkUrl}" alt="ROLLOUT" height="32" style="height:32px;margin-top:24px;" />
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        const subject = isWeekly ? 'Your Weekly Summary from Rollout' : 'Your Daily Check-in from Rollout';

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Rollout <accounts@rollout.cc>",
            to: [authUser.user.email],
            subject,
            html,
          }),
        });

        sentCount++;
        console.log(`Digest sent to ${authUser.user.email} (${payload.type})`);
      } catch (userErr) {
        console.error(`Failed to send digest to user ${userId}:`, userErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-digest error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
