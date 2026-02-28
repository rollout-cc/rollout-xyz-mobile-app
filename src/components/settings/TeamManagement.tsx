import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedTeam } from "@/contexts/TeamContext";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Copy, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TeamMember {
  user_id: string;
  role: string;
  created_at: string;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    job_role: string | null;
  } | null;
}

interface ArtistPermission {
  id: string;
  artist_id: string;
  user_id: string;
  permission: string;
}

interface Artist {
  id: string;
  name: string;
  avatar_url: string | null;
}

const roleLabelMap: Record<string, string> = {
  team_owner: "Team Owner",
  manager: "Manager",
  artist: "Artist",
};

const roleDescriptionMap: Record<string, string> = {
  team_owner: "Full access to all functions including budgets, users, plans, account deletion.",
  manager: "Broad permissions for budgets, plans, and tasks.",
  artist: "Restricted role with access limited to viewing certain information only.",
};

const permissionLabelMap: Record<string, string> = {
  no_access: "No Access",
  view_access: "View Access",
  full_access: "Full Access",
};

export function TeamManagement() {
  const { user } = useAuth();
  const { selectedTeamId: teamId } = useSelectedTeam();
  const { data: teams = [] } = useTeams();
  const myRole = teams.find((t) => t.id === teamId)?.role ?? null;
  const canManage = myRole === "team_owner" || myRole === "manager";
  const queryClient = useQueryClient();

  const [showInvite, setShowInvite] = useState(false);
  const [inviteRole, setInviteRole] = useState<string>("manager");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  

  // Fetch team members
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select("user_id, role, created_at")
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
        created_at: m.created_at,
        profile: profileMap.get(m.user_id) ?? null,
      })) as TeamMember[];
    },
    enabled: !!teamId,
  });

  // Fetch all artists for this team
  const { data: artists = [] } = useQuery({
    queryKey: ["team-artists-simple", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("id, name, avatar_url")
        .eq("team_id", teamId!)
        .order("name");
      if (error) throw error;
      return data as Artist[];
    },
    enabled: !!teamId,
  });

  // Fetch all artist permissions for this team's members
  const { data: allPermissions = [] } = useQuery({
    queryKey: ["artist-permissions", teamId],
    queryFn: async () => {
      const artistIds = artists.map((a) => a.id);
      if (artistIds.length === 0) return [];
      const { data, error } = await supabase
        .from("artist_permissions")
        .select("id, artist_id, user_id, permission")
        .in("artist_id", artistIds);
      if (error) throw error;
      return data as ArtistPermission[];
    },
    enabled: !!teamId && artists.length > 0,
  });

  // Upsert permission mutation
  const upsertPermission = useMutation({
    mutationFn: async ({
      userId,
      artistId,
      permission,
    }: {
      userId: string;
      artistId: string;
      permission: string;
    }) => {
      // Check if permission already exists
      const existing = allPermissions.find(
        (p) => p.user_id === userId && p.artist_id === artistId
      );

      if (existing) {
        const { error } = await supabase
          .from("artist_permissions")
          .update({ permission: permission as any })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("artist_permissions")
          .insert({
            user_id: userId,
            artist_id: artistId,
            permission: permission as any,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist-permissions", teamId] });
      toast.success("Permission updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update permission");
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from("team_memberships")
        .update({ role: role as any })
        .eq("team_id", teamId!)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", teamId] });
      toast.success("Role updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update role");
    },
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("team_memberships")
        .delete()
        .eq("team_id", teamId!)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", teamId] });
      toast.success("Member removed");
      setDeleteUserId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to remove member");
      setDeleteUserId(null);
    },
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
          <p className="text-sm text-muted-foreground">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowInvite(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Members list */}
      <div className="space-y-3">
        {members.map((member) => {
          const name = member.profile?.full_name || "Unnamed";
          const initials = name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          const isMe = member.user_id === user?.id;

          return (
            <div
              key={member.user_id}
              className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card"
            >
              {/* Avatar & info */}
              <Avatar className="h-10 w-10 mt-0.5">
                <AvatarImage src={member.profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {name}
                    {isMe && (
                      <span className="text-muted-foreground font-normal ml-1">(you)</span>
                    )}
                  </p>
                  {member.profile?.job_role && (
                    <p className="text-xs text-muted-foreground">
                      {member.profile.job_role}
                    </p>
                  )}
                </div>

                {/* Role selector */}
                {canManage && !isMe ? (
                  <Select
                    value={member.role}
                    onValueChange={(val) =>
                      updateRole.mutate({ userId: member.user_id, role: val })
                    }
                  >
                    <SelectTrigger className="w-48 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team_owner">
                        <div>
                          <div className="font-medium">Team Owner</div>
                          <div className="text-xs text-muted-foreground">
                            {roleDescriptionMap.team_owner}
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="manager">
                        <div>
                          <div className="font-medium">Manager</div>
                          <div className="text-xs text-muted-foreground">
                            {roleDescriptionMap.manager}
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="artist">
                        <div>
                          <div className="font-medium">Artist</div>
                          <div className="text-xs text-muted-foreground">
                            {roleDescriptionMap.artist}
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="inline-block text-sm text-muted-foreground">
                    {roleLabelMap[member.role] ?? member.role}
                  </span>
                )}

                {/* Inline artist permissions */}
                {member.role !== "team_owner" && artists.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs font-medium text-muted-foreground">Artist Access</p>
                    <div className="space-y-1">
                      {artists.map((artist) => {
                        const existingPerm = allPermissions.find(
                          (p) => p.user_id === member.user_id && p.artist_id === artist.id
                        );
                        const currentLevel = existingPerm?.permission ?? "no_access";

                        return (
                          <div key={artist.id} className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={artist.avatar_url ?? undefined} />
                              <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                                {artist.name[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-foreground min-w-[80px] truncate">{artist.name}</span>
                            {canManage ? (
                              <Select
                                value={currentLevel}
                                onValueChange={(val) =>
                                  upsertPermission.mutate({
                                    userId: member.user_id,
                                    artistId: artist.id,
                                    permission: val,
                                  })
                                }
                              >
                                <SelectTrigger className="h-7 w-28 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="no_access">No Access</SelectItem>
                                  <SelectItem value="view_access">View Access</SelectItem>
                                  <SelectItem value="full_access">Full Access</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="outline" className="text-xs py-0 h-5">
                                {permissionLabelMap[currentLevel] ?? currentLevel}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              {canManage && !isMe && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteUserId(member.user_id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Remove
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {members.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground border border-border rounded-lg">
            No team members yet. Invite someone to get started.
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

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteUserId}
        onOpenChange={(open) => !open && setDeleteUserId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove their access to the team. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteUserId && removeMember.mutate(deleteUserId)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
