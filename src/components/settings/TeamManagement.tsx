import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeams } from "@/hooks/useTeams";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface TeamMember {
  user_id: string;
  role: string;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    job_role: string | null;
  } | null;
}

const roleLabelMap: Record<string, string> = {
  team_owner: "Owner",
  manager: "Manager",
  artist: "Artist",
};

const roleVariantMap: Record<string, "default" | "secondary" | "outline"> = {
  team_owner: "default",
  manager: "secondary",
  artist: "outline",
};

export function TeamManagement() {
  const { data: teams = [] } = useTeams();
  const teamId = teams[0]?.id ?? null;

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select("user_id, role")
        .eq("team_id", teamId!);
      if (error) throw error;

      // Fetch profiles for all members
      const userIds = data.map((m) => m.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, job_role")
        .in("id", userIds);
      if (profileError) throw profileError;

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

      return data.map((m) => ({
        user_id: m.user_id,
        role: m.role,
        profile: profileMap.get(m.user_id) ?? null,
      })) as TeamMember[];
    },
    enabled: !!teamId,
  });

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        Loading team members...
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        No team found. Create a team first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
        <span className="text-sm text-muted-foreground">
          {members.length} member{members.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="divide-y divide-border rounded-lg border border-border bg-card max-w-lg">
        {members.map((member) => {
          const name = member.profile?.full_name || "Unnamed";
          const initials = name[0]?.toUpperCase() ?? "?";

          return (
            <div
              key={member.user_id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={member.profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {name}
                </p>
                {member.profile?.job_role && (
                  <p className="text-xs text-muted-foreground truncate">
                    {member.profile.job_role}
                  </p>
                )}
              </div>

              <Badge variant={roleVariantMap[member.role] ?? "outline"}>
                {roleLabelMap[member.role] ?? member.role}
              </Badge>
            </div>
          );
        })}

        {members.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No team members yet.
          </div>
        )}
      </div>
    </div>
  );
}
