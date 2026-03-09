import { useState, useRef } from "react";
import { InviteMemberDialog } from "./InviteMemberDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { REGION_LIST, CURRENCY_LIST } from "@/lib/regionConfig";
import { useTeamRegion } from "@/hooks/useTeamRegion";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useTeams } from "@/hooks/useTeams";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { UserPlus, Trash2, Upload, Camera } from "lucide-react";
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
  guest: "Guest",
};

const roleDescriptionMap: Record<string, string> = {
  team_owner: "Full access to all functions including budgets, users, plans, account deletion.",
  manager: "Broad permissions for budgets, plans, and tasks.",
  artist: "Restricted role with access limited to viewing certain information only.",
  guest: "View-only access. Ideal for PR, videographers, and external collaborators.",
};

const permissionLabelMap: Record<string, string> = {
  no_access: "No Access",
  view_access: "View Access",
  full_access: "Full Access",
};

export function TeamManagement({ showSection = "members" }: { showSection?: "members" | "profile" }) {
  const { user } = useAuth();
  const { selectedTeamId: teamId, canManage } = useSelectedTeam();
  const { data: teams = [] } = useTeams();
  const queryClient = useQueryClient();

  const [showInvite, setShowInvite] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [uploadingTeamPhoto, setUploadingTeamPhoto] = useState(false);
  const teamPhotoInputRef = useRef<HTMLInputElement>(null);

  const currentTeam = teams.find((t) => t.id === teamId);

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

  // Fetch staff employment records for display_name fallback
  const { data: staffRecords = [] } = useQuery({
    queryKey: ["staff-display-names", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_employment")
        .select("user_id, display_name")
        .eq("team_id", teamId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!teamId,
  });

  const staffNameMap = new Map(staffRecords.map((s) => [s.user_id, s.display_name]));

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

  const handleTeamPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !teamId) return;
    setUploadingTeamPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${teamId}/team-avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from("teams")
        .update({ avatar_url: url })
        .eq("id", teamId);
      if (updateError) throw updateError;
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Team photo updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload team photo");
    } finally {
      setUploadingTeamPhoto(false);
      if (teamPhotoInputRef.current) teamPhotoInputRef.current.value = "";
    }
  };

  const handleTeamPhotoDelete = async () => {
    if (!teamId) return;
    setUploadingTeamPhoto(true);
    try {
      const { data: files } = await supabase.storage
        .from("profile-photos")
        .list(teamId);
      if (files && files.length > 0) {
        const paths = files.filter(f => f.name.startsWith("team-avatar")).map(f => `${teamId}/${f.name}`);
        if (paths.length > 0) await supabase.storage.from("profile-photos").remove(paths);
      }
      await supabase.from("teams").update({ avatar_url: null }).eq("id", teamId);
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Team photo removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete team photo");
    } finally {
      setUploadingTeamPhoto(false);
    }
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

  if (showSection === "profile") {
    return <TeamProfileSection teamId={teamId} currentTeam={currentTeam} members={members} canManage={canManage} queryClient={queryClient} />;
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
                      <SelectItem value="guest">
                        <div>
                          <div className="font-medium">Guest</div>
                          <div className="text-xs text-muted-foreground">
                            {roleDescriptionMap.guest}
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
      <InviteMemberDialog open={showInvite} onOpenChange={setShowInvite} />

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

// ─── Team Profile Sub-section with Region/Currency ───

function TeamProfileSection({
  teamId,
  currentTeam,
  members,
  canManage,
  queryClient,
}: {
  teamId: string;
  currentTeam: any;
  members: any[];
  canManage: boolean;
  queryClient: any;
}) {
  const teamPhotoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingTeamPhoto, setUploadingTeamPhoto] = useState(false);
  const { regionCode, currencyCode } = useTeamRegion();

  const handleTeamPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !teamId) return;
    setUploadingTeamPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${teamId}/team-avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from("teams")
        .update({ avatar_url: url })
        .eq("id", teamId);
      if (updateError) throw updateError;
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Team photo updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload team photo");
    } finally {
      setUploadingTeamPhoto(false);
      if (teamPhotoInputRef.current) teamPhotoInputRef.current.value = "";
    }
  };

  const handleTeamPhotoDelete = async () => {
    if (!teamId) return;
    setUploadingTeamPhoto(true);
    try {
      const { data: files } = await supabase.storage
        .from("profile-photos")
        .list(teamId);
      if (files && files.length > 0) {
        const paths = files.filter(f => f.name.startsWith("team-avatar")).map(f => `${teamId}/${f.name}`);
        if (paths.length > 0) await supabase.storage.from("profile-photos").remove(paths);
      }
      await supabase.from("teams").update({ avatar_url: null }).eq("id", teamId);
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Team photo removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete team photo");
    } finally {
      setUploadingTeamPhoto(false);
    }
  };

  const updateRegion = useMutation({
    mutationFn: async (val: string) => {
      const region = REGION_LIST.find(r => r.code === val);
      const updates: any = { region: val };
      // Auto-set currency when region changes
      if (region) updates.base_currency = region.currency;
      const { error } = await (supabase as any).from("teams").update(updates).eq("id", teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-region"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Region updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateCurrency = useMutation({
    mutationFn: async (val: string) => {
      const { error } = await (supabase as any).from("teams").update({ base_currency: val }).eq("id", teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-region"] });
      toast.success("Currency updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      {/* Team Photo */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Team Photo</Label>
        <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card max-w-lg">
          <div className="relative group/avatar">
            <Avatar className="h-14 w-14">
              <AvatarImage src={currentTeam?.avatar_url ?? undefined} />
              <AvatarFallback className="text-lg bg-muted text-muted-foreground">
                {currentTeam?.name?.[0]?.toUpperCase() ?? "T"}
              </AvatarFallback>
            </Avatar>
            {canManage && (
              <button
                onClick={() => teamPhotoInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity"
              >
                <Camera className="h-4 w-4 text-white" />
              </button>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{currentTeam?.name ?? "Team"}</p>
            <p className="text-xs text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""}</p>
          </div>
          {canManage && (
            <div className="flex gap-2 shrink-0">
              <input
                ref={teamPhotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleTeamPhotoUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => teamPhotoInputRef.current?.click()}
                disabled={uploadingTeamPhoto}
              >
                <Upload className="h-4 w-4 mr-1.5" />
                {uploadingTeamPhoto ? "Uploading..." : "Upload"}
              </Button>
              {currentTeam?.avatar_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTeamPhotoDelete}
                  disabled={uploadingTeamPhoto}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Remove
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Region */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Region</Label>
        <p className="text-xs text-muted-foreground">This determines employer cost calculations, worker labels, and default PROs.</p>
        <Select value={regionCode} onValueChange={(v) => updateRegion.mutate(v)} disabled={!canManage}>
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REGION_LIST.map((r) => (
              <SelectItem key={r.code} value={r.code}>
                {r.flag} {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Base Currency */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Base Currency</Label>
        <p className="text-xs text-muted-foreground">All financials will display in this currency by default.</p>
        <Select value={currencyCode} onValueChange={(v) => updateCurrency.mutate(v)} disabled={!canManage}>
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCY_LIST.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.symbol} {c.label} ({c.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
