import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useTeamPlan } from "@/hooks/useTeamPlan";
import { UpgradeDialog } from "@/components/billing/UpgradeDialog";
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
import { JobTitleSelect } from "@/components/ui/JobTitleSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

const roleLabelMap: Record<string, string> = {
  team_owner: "Team Owner",
  manager: "Manager",
  artist: "Artist",
  guest: "Guest",
};

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const { user } = useAuth();
  const { selectedTeamId: teamId } = useSelectedTeam();
  const { limits, seatLimit } = useTeamPlan();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Count current team members
  const { data: memberCount = 0 } = useQuery({
    queryKey: ["team-member-count", teamId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("team_memberships")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId!);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!teamId,
  });

  const [inviteRole, setInviteRole] = useState<string>("manager");
  const [addToStaff, setAddToStaff] = useState(false);
  const [staffEmploymentType, setStaffEmploymentType] = useState("w2");
  const [jobTitle, setJobTitle] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createInvite = useMutation({
    mutationFn: async (role: string) => {
      const { data, error } = await (supabase as any)
        .from("invite_links")
        .insert({
          team_id: teamId!,
          invited_by: user!.id,
          role: role as any,
          add_to_staff: addToStaff,
          staff_employment_type: addToStaff ? staffEmploymentType : null,
          invitee_job_title: jobTitle || null,
        })
        .select("token")
        .single();
      if (error) throw error;
      return data.token;
    },
    onSuccess: (token) => {
      const baseUrl = "https://rollout.cc";
      const link = `${baseUrl}/join/${token}`;
      setGeneratedLink(link);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create invite");
    },
  });

  const handleCreateInvite = () => {
    if (!limits.canInviteMembers) {
      setUpgradeOpen(true);
      return;
    }
    if (memberCount >= seatLimit) {
      toast.error(`You've reached your seat limit (${seatLimit}). Upgrade your plan for more seats.`);
      setUpgradeOpen(true);
      return;
    }
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
    onOpenChange(false);
    setGeneratedLink(null);
    setCopied(false);
    setInviteRole("manager");
    setAddToStaff(false);
    setStaffEmploymentType("w2");
    setJobTitle("");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
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
                    <SelectItem value="guest">Guest</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {inviteRole === "manager"
                    ? "Managers can view and edit all artists on the team."
                    : inviteRole === "artist"
                    ? "Artists have limited access to assigned artists only."
                    : "Guests have view-only access. Ideal for PR, videographers, etc."}
                </p>
              </div>

              {/* Job Title */}
              <div className="space-y-2">
                <Label>Job Title</Label>
                <JobTitleSelect value={jobTitle} onChange={setJobTitle} />
              </div>

              {/* Add to Staff toggle */}
              <div className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Add to Staff</Label>
                    <p className="text-xs text-muted-foreground">Track employment &amp; payroll info</p>
                  </div>
                  <Switch checked={addToStaff} onCheckedChange={setAddToStaff} />
                </div>

                {addToStaff && (
                  <div className="space-y-2 pt-1">
                    <Label className="text-xs">Employment Type</Label>
                    <Select value={staffEmploymentType} onValueChange={setStaffEmploymentType}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="w2">W-2 Employee</SelectItem>
                        <SelectItem value="1099">1099 Contractor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} feature="Team invites" />
    </>
  );
}
