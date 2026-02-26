import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTeams } from "@/hooks/useTeams";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Copy, Check } from "lucide-react";
import { toast } from "sonner";

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
  const { user } = useAuth();
  const { data: teams = [] } = useTeams();
  const teamId = teams[0]?.id ?? null;
  const myRole = teams[0]?.role ?? null;
  const canInvite = myRole === "team_owner" || myRole === "manager";
  const queryClient = useQueryClient();

  const [showInvite, setShowInvite] = useState(false);
  const [inviteRole, setInviteRole] = useState<string>("manager");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select("user_id, role")
        .eq("team_id", teamId!);
      if (error) throw error;

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

  const createInvite = useMutation({
    mutationFn: async (role: string) => {
      const { data, error } = await supabase
        .from("invite_links")
        .insert({
          team_id: teamId!,
          invited_by: user!.id,
          role: role as any,
        })
        .select("token")
        .single();
      if (error) throw error;
      return data.token;
    },
    onSuccess: (token) => {
      const link = `${window.location.origin}/join/${token}`;
      setGeneratedLink(link);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create invite");
    },
  });

  const handleCreateInvite = () => {
    setCopied(false);
    setGeneratedLink(null);
    createInvite.mutate(inviteRole);
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setShowInvite(false);
    setGeneratedLink(null);
    setCopied(false);
    setInviteRole("manager");
  };

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
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </span>
          {canInvite && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInvite(true)}
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              Invite
            </Button>
          )}
        </div>
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

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription>
              Generate a shareable invite link. It expires in 7 days.
            </DialogDescription>
          </DialogHeader>

          {!generatedLink ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="artist">Artist</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {inviteRole === "manager"
                    ? "Managers can view and edit all artists on the team."
                    : "Artists have limited access to assigned artists only."}
                </p>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateInvite}
                  disabled={createInvite.isPending}
                >
                  {createInvite.isPending ? "Generating..." : "Generate Link"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Invite Link</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={generatedLink}
                    className="text-xs"
                    onFocus={(e) => e.target.select()}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this link with the person you'd like to invite. They'll be added as a{" "}
                  <span className="font-medium">{roleLabelMap[inviteRole] ?? inviteRole}</span>.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
