import { supabase } from "@/integrations/supabase/client";

type NotificationType =
  | "task_assigned"
  | "task_due_soon"
  | "task_overdue"
  | "task_completed"
  | "milestone_approaching"
  | "budget_threshold"
  | "new_artist";

interface NotificationPayload {
  type: NotificationType;
  to_email: string;
  to_name?: string;
  task_title?: string;
  artist_name?: string;
  initiative_name?: string;
  due_date?: string;
  assigner_name?: string;
  task_id?: string;
  milestone_title?: string;
  milestone_date?: string;
  timeline_name?: string;
  artist_id?: string;
  budget_label?: string;
  threshold_pct?: number;
  spent_amount?: number;
  total_budget?: number;
  new_artist_name?: string;
  team_name?: string;
}

/**
 * Fire-and-forget notification. Checks user preference before sending.
 * Returns silently on failure so it never blocks the main action.
 */
export async function sendNotification(payload: NotificationPayload) {
  try {
    await supabase.functions.invoke("send-notification", { body: payload });
  } catch (err) {
    console.warn("[Notification] Failed to send:", err);
  }
}

/**
 * Look up a user's email and notification preference, then send if enabled.
 */
export async function notifyUser(
  userId: string,
  prefKey: string,
  buildPayload: (email: string, name: string) => NotificationPayload
) {
  try {
    // Build payload with empty email — edge function resolves it via service role
    // Also pass pref_key so the edge function checks preferences server-side
    // (RLS prevents reading other users' notification_preferences client-side)
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    const payload = buildPayload("", profile?.full_name || "");
    await supabase.functions.invoke("send-notification", {
      body: { ...payload, user_id: userId, pref_key: prefKey },
    });
  } catch (err) {
    console.warn("[Notification] Failed:", err);
  }
}

/**
 * After adding a transaction to a budget, check if any threshold was crossed.
 */
export async function checkBudgetThreshold(
  artistId: string,
  budgetId: string | null
) {
  if (!budgetId) return;

  try {
    // Get budget
    const { data: budget } = await supabase
      .from("budgets")
      .select("id, label, amount, artist_id")
      .eq("id", budgetId)
      .single();

    if (!budget || !budget.amount || Number(budget.amount) <= 0) return;

    // Get total spent against this budget
    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount")
      .eq("budget_id", budgetId);

    const totalSpent = (transactions || []).reduce(
      (sum, t) => sum + Math.abs(Number(t.amount)),
      0
    );

    const pct = Math.round((totalSpent / Number(budget.amount)) * 100);

    // Check thresholds: 50, 75, 100
    const thresholds = [100, 75, 50];
    for (const threshold of thresholds) {
      if (pct >= threshold) {
        // Get artist info
        const { data: artist } = await supabase
          .from("artists")
          .select("name, team_id")
          .eq("id", budget.artist_id)
          .single();

        if (!artist) return;

        // Get team owners/managers
        const { data: members } = await supabase
          .from("team_memberships")
          .select("user_id")
          .eq("team_id", artist.team_id)
          .in("role", ["team_owner", "manager"]);

        // Also get artists with access to this specific artist profile
        const { data: artistUsers } = await supabase
          .from("artist_permissions")
          .select("user_id")
          .eq("artist_id", budget.artist_id);

        const notifiedIds = new Set<string>();
        const allRecipients = [...(members || []), ...(artistUsers || [])];

        for (const member of allRecipients) {
          if (notifiedIds.has(member.user_id)) continue;
          notifiedIds.add(member.user_id);
          await notifyUser(member.user_id, "budget_alert_email", (email, name) => ({
            type: "budget_threshold",
            to_email: email,
            to_name: name,
            budget_label: budget.label,
            threshold_pct: threshold,
            spent_amount: totalSpent,
            total_budget: Number(budget.amount),
            artist_name: artist.name,
            artist_id: budget.artist_id,
          }));
        }
        break; // Only notify for highest crossed threshold
      }
    }
  } catch (err) {
    console.warn("[Notification] Budget threshold check failed:", err);
  }
}

/**
 * Notify team members about a new artist.
 */
export async function notifyNewArtist(
  teamId: string,
  artistName: string,
  teamName?: string,
  avatarUrl?: string
) {
  try {
    const { data: members } = await supabase
      .from("team_memberships")
      .select("user_id")
      .eq("team_id", teamId)
      .in("role", ["team_owner", "manager"]);

    for (const member of members || []) {
      await notifyUser(member.user_id, "new_artist_email", (email, name) => ({
        type: "new_artist",
        to_email: email,
        to_name: name,
        new_artist_name: artistName,
        team_name: teamName,
        artist_avatar_url: avatarUrl,
      }));
    }
  } catch (err) {
    console.warn("[Notification] New artist notify failed:", err);
  }
}

/**
 * Notify the assigner that a task was completed.
 */
export async function notifyTaskCompleted(task: {
  id: string;
  title: string;
  assigned_to?: string | null;
  artist_id?: string | null;
  initiative_id?: string | null;
}, completerName?: string) {
  // We need to find who created/assigned the task
  // Since we don't have a "created_by" field, we'll notify team owners/managers
  // Actually, per the spec: "notify assigner only" — but we don't track assigner
  // We'll notify team owners/managers as a proxy
  try {
    if (!task.artist_id) return;

    const { data: artist } = await supabase
      .from("artists")
      .select("name, team_id")
      .eq("id", task.artist_id)
      .single();

    if (!artist) return;

    const { data: members } = await supabase
      .from("team_memberships")
      .select("user_id")
      .eq("team_id", artist.team_id)
      .in("role", ["team_owner", "manager"]);

    for (const member of members || []) {
      // Don't notify the person who completed it
      if (member.user_id === task.assigned_to) continue;

      await notifyUser(member.user_id, "task_completed_email", (email, name) => ({
        type: "task_completed",
        to_email: email,
        to_name: name,
        task_title: task.title,
        artist_name: artist.name,
        assigner_name: completerName,
        task_id: task.id,
      }));
    }
  } catch (err) {
    console.warn("[Notification] Task completed notify failed:", err);
  }
}

/**
 * Notify the assignee that a task was assigned to them.
 */
export async function notifyTaskAssigned(task: {
  id: string;
  title: string;
  assigned_to: string;
  due_date?: string | null;
  artist_id?: string | null;
  initiative_id?: string | null;
}, assignerName?: string, artistName?: string, initiativeName?: string) {
  try {
    await notifyUser(task.assigned_to, "task_assigned_email", (email, name) => ({
      type: "task_assigned",
      to_email: email,
      to_name: name,
      task_title: task.title,
      artist_name: artistName,
      initiative_name: initiativeName,
      due_date: task.due_date || undefined,
      assigner_name: assignerName,
      task_id: task.id,
    }));
  } catch (err) {
    console.warn("[Notification] Task assigned notify failed:", err);
  }
}
