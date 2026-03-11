import { useAuth } from "@/contexts/AuthContext";
import { useTeams } from "@/hooks/useTeams";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const NOTIFICATION_CARDS = [
  {
    title: "Task Assigned",
    description: "Get notified when a task is assigned to you",
    emailCol: "task_assigned_email" as const,
    smsCol: "task_assigned_sms" as const,
  },
  {
    title: "Task Due Soon",
    description: "Get notified 24 hours before a task is due",
    emailCol: "task_due_soon_email" as const,
    smsCol: "task_due_soon_sms" as const,
  },
  {
    title: "Task Overdue",
    description: "Get notified when a task passes its due date",
    emailCol: "task_overdue_email" as const,
    smsCol: "task_overdue_sms" as const,
  },
  {
    title: "Task Completed",
    description: "Get notified when a task you assigned is completed",
    emailCol: "task_completed_email" as const,
    smsCol: null,
  },
  {
    title: "Milestone Reached",
    description: "Get notified when a project reaches a milestone",
    emailCol: "milestone_email" as const,
    smsCol: "milestone_sms" as const,
  },
  {
    title: "Budget Alert",
    description: "Get notified when spending hits 50%, 75%, or 100% of budget",
    emailCol: "budget_alert_email" as const,
    smsCol: null,
  },
  {
    title: "New Artist Added",
    description: "Get notified when a new artist is added to the roster",
    emailCol: "new_artist_email" as const,
    smsCol: null,
  },
];

const DIGEST_CARDS = [
  {
    title: "Daily Check-in",
    description: "Receive a daily summary of your tasks and progress",
    emailCol: "daily_checkin_email" as const,
  },
  {
    title: "Weekly Summary",
    description: "Receive a weekly recap with stats, milestones, and links",
    emailCol: "weekly_summary_email" as const,
  },
];

type PrefKey =
  | "task_assigned_email" | "task_assigned_sms"
  | "task_due_soon_email" | "task_due_soon_sms"
  | "task_overdue_email" | "task_overdue_sms"
  | "task_completed_email"
  | "milestone_email" | "milestone_sms"
  | "budget_alert_email"
  | "new_artist_email"
  | "daily_checkin_email"
  | "weekly_summary_email"
  | "push_enabled";

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i;
  const label = hour === 0 ? '12:00 AM' : hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`;
  const value = `${String(hour).padStart(2, '0')}:00:00`;
  return { label, value };
});

export function NotificationSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: teams = [] } = useTeams();
  const { selectedTeamId } = useSelectedTeam();

  const myTeam = teams.find((t) => t.id === selectedTeamId);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const updatePref = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from("notification_preferences")
        .update({ [key]: value } as any)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences", user?.id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update preference");
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-8">Loading...</p>;
  }

  const roleLabelMap: Record<string, string> = {
    team_owner: "Owner",
    manager: "Manager",
    artist: "Artist",
    guest: "Guest",
  };

  return (
    <div className="space-y-6">
      {/* User info header */}
      <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
        <Avatar className="h-12 w-12">
          <AvatarImage src={profile?.avatar_url ?? undefined} />
          <AvatarFallback className="text-sm bg-muted text-muted-foreground">
            {profile?.full_name?.[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground">{profile?.full_name || "User"}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      {/* Notification section */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Notifications</p>

        {/* Column headers */}
        <div className="flex items-center justify-end gap-8 pr-2 text-xs font-medium text-muted-foreground mb-2">
          <span>Email</span>
          <span className="flex items-center gap-1">SMS <span className="text-[10px] text-muted-foreground/60 font-normal">(coming soon)</span></span>
        </div>

        {/* Notification cards */}
        <div className="space-y-2">
          {NOTIFICATION_CARDS.map((card) => (
            <div
              key={card.title}
              className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border bg-card"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{card.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.description}</p>
              </div>
              <div className="flex items-center gap-8">
                <Switch
                  checked={(prefs as any)?.[card.emailCol] ?? false}
                  onCheckedChange={(v) => updatePref.mutate({ key: card.emailCol, value: v })}
                />
                {card.smsCol ? (
                  <Switch
                    disabled
                    checked={false}
                    className="opacity-40"
                  />
                ) : (
                  <div className="w-[36px]" /> // spacer for alignment
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Digest section */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Digests</p>

        <div className="space-y-2">
          {DIGEST_CARDS.map((card) => (
            <div
              key={card.title}
              className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border bg-card"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{card.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.description}</p>
              </div>
              <Switch
                checked={(prefs as any)?.[card.emailCol] ?? false}
                onCheckedChange={(v) => updatePref.mutate({ key: card.emailCol, value: v })}
              />
            </div>
          ))}

          {/* Preferred send time */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border bg-card">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">Preferred Send Time</p>
              <p className="text-xs text-muted-foreground mt-0.5">Choose when you receive daily check-ins</p>
            </div>
            <Select
              value={(prefs as any)?.preferred_notification_time ?? '08:00:00'}
              onValueChange={(v) => updatePref.mutate({ key: 'preferred_notification_time', value: v })}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Role badge */}
      {myTeam && (
        <div className="pt-2">
          <Badge variant="secondary" className="text-xs">
            {roleLabelMap[myTeam.role] ?? myTeam.role}
          </Badge>
        </div>
      )}
    </div>
  );
}
