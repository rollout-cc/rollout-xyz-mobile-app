import { useAuth } from "@/contexts/AuthContext";
import { useTeams } from "@/hooks/useTeams";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const NOTIFICATION_CARDS = [
  {
    title: "Tasks",
    description: "Receive notifications when a task is assigned to you",
    emailCol: "task_assigned_email" as const,
    smsCol: "task_assigned_sms" as const,
  },
  {
    title: "Task Due Soon",
    description: "Receive notifications 24 hours before a task is due",
    emailCol: "task_due_soon_email" as const,
    smsCol: "task_due_soon_sms" as const,
  },
  {
    title: "Task Overdue",
    description: "Receive notifications when a task passes its due date",
    emailCol: "task_overdue_email" as const,
    smsCol: "task_overdue_sms" as const,
  },
  {
    title: "Milestone Reached",
    description: "Receive notifications when a major milestone is completed",
    emailCol: "milestone_email" as const,
    smsCol: "milestone_sms" as const,
  },
];

type PrefKey =
  | "task_assigned_email" | "task_assigned_sms"
  | "task_due_soon_email" | "task_due_soon_sms"
  | "task_overdue_email" | "task_overdue_sms"
  | "milestone_email" | "milestone_sms";

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
    mutationFn: async ({ key, value }: { key: PrefKey; value: boolean }) => {
      const { error } = await supabase
        .from("notification_preferences")
        .update({ [key]: value })
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

      {/* Column headers */}
      <div className="flex items-center justify-end gap-8 pr-2 text-xs font-medium text-muted-foreground">
        <span>Email</span>
        <span>SMS</span>
      </div>

      {/* Notification cards */}
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
              checked={prefs?.[card.emailCol] ?? false}
              onCheckedChange={(v) => updatePref.mutate({ key: card.emailCol, value: v })}
            />
            <Switch
              checked={prefs?.[card.smsCol] ?? false}
              onCheckedChange={(v) => updatePref.mutate({ key: card.smsCol, value: v })}
            />
          </div>
        </div>
      ))}

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
