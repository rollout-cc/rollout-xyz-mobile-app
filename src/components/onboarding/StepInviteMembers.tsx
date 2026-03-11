import { useState } from "react";
import { Copy, Check, Plus, Trash2, UserPlus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { OnboardingArtist } from "./CompanyOnboardingWizard";
import { PermissionToggles, defaultPermissions, type PermissionFlags } from "@/components/settings/PermissionToggles";

const JOB_TITLES = [
  "A&R",
  "Manager",
  "Finance",
  "Marketing",
  "Operations",
  "Legal",
  "Creative Director",
  "Producer",
  "Other",
];

interface MemberEntry {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  accessLevel: string;
  employmentType: string;
  salary: string;
  allArtists: boolean;
  selectedArtistIds: string[];
  generatedLink: string | null;
  sent: boolean;
  permissions: PermissionFlags;
}

const emptyMember = (): MemberEntry => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobTitle: "",
  accessLevel: "manager",
  employmentType: "w2",
  salary: "",
  allArtists: true,
  selectedArtistIds: [],
  generatedLink: null,
  sent: false,
  permissions: { ...defaultPermissions },
});

interface Props {
  teamId: string;
  userId: string;
  addedArtists: OnboardingArtist[];
}

export function StepInviteMembers({ teamId, userId, addedArtists }: Props) {
  const [members, setMembers] = useState<MemberEntry[]>([emptyMember()]);
  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const updateMember = (idx: number, updates: Partial<MemberEntry>) => {
    setMembers((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, ...updates } : m))
    );
  };

  const toggleArtist = (idx: number, artistId: string) => {
    const member = members[idx];
    const selected = member.selectedArtistIds.includes(artistId)
      ? member.selectedArtistIds.filter((id) => id !== artistId)
      : [...member.selectedArtistIds, artistId];
    updateMember(idx, { selectedArtistIds: selected, allArtists: false });
  };

  const addMember = () => setMembers((prev) => [...prev, emptyMember()]);
  const removeMember = (idx: number) =>
    setMembers((prev) => prev.filter((_, i) => i !== idx));

  const canSendInvite = (m: MemberEntry) => {
    return m.firstName.trim() && (m.email.trim() || m.phone.trim()) && m.jobTitle;
  };

  const generateAndSend = async (idx: number, sendNotification: boolean) => {
    const m = members[idx];
    if (!m.firstName.trim()) {
      toast.error("Please enter a first name");
      return;
    }
    if (!m.email.trim() && !m.phone.trim()) {
      toast.error("Please enter an email or phone number");
      return;
    }
    if (!m.jobTitle) {
      toast.error("Please select a job title");
      return;
    }
    setGeneratingIdx(idx);
    try {
      const artistPermissions = m.allArtists
        ? addedArtists.map((a) => ({ artist_id: a.id, permission: "full_access" }))
        : m.selectedArtistIds.map((id) => ({ artist_id: id, permission: "full_access" }));

      const { data, error } = await (supabase as any)
        .from("invite_links")
        .insert({
          team_id: teamId,
          invited_by: userId,
          role: m.accessLevel,
          add_to_staff: true,
          staff_employment_type: m.employmentType,
          artist_permissions: artistPermissions,
          invitee_name: `${m.firstName} ${m.lastName}`.trim() || null,
          invitee_job_title: m.jobTitle || null,
          staff_salary: m.salary ? parseFloat(m.salary) : null,
          invitee_email: m.email.trim() || null,
          invitee_phone: m.phone.trim() || null,
          ...m.permissions,
        })
        .select("token")
        .single();
      if (error) throw error;
      const baseUrl = "https://app.rollout.cc";
      const link = `${baseUrl}/join/${data.token}`;
      updateMember(idx, { generatedLink: link, sent: sendNotification });

      if (sendNotification && (m.email.trim() || m.phone.trim())) {
        try {
          await supabase.functions.invoke("send-invite-notification", {
            body: {
              token: data.token,
              email: m.email.trim() || null,
              phone: m.phone.trim() || null,
              team_name: null, // Will be fetched by edge function
              invitee_name: `${m.firstName} ${m.lastName}`.trim(),
            },
          });
          toast.success(`Invite sent to ${m.email.trim() || m.phone.trim()}`);
        } catch {
          toast.success("Invite created! Copy the link to share manually.");
        }
      } else {
        toast.success("Invite link generated!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate invite");
    } finally {
      setGeneratingIdx(null);
    }
  };

  const copyLink = async (idx: number) => {
    const link = members[idx].generatedLink;
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopiedIdx(idx);
    toast.success("Link copied!");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-foreground mb-2">Invite your team</h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        Add team members with their roles and send invite links. You can always invite more later.
      </p>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
        {members.map((m, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border bg-card p-4 space-y-3"
          >
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">First Name *</Label>
                <Input
                  value={m.firstName}
                  onChange={(e) => updateMember(idx, { firstName: e.target.value })}
                  placeholder="First"
                  disabled={!!m.generatedLink}
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Last Name</Label>
                <Input
                  value={m.lastName}
                  onChange={(e) => updateMember(idx, { lastName: e.target.value })}
                  placeholder="Last"
                  disabled={!!m.generatedLink}
                />
              </div>
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Email *</Label>
                <Input
                  type="email"
                  value={m.email}
                  onChange={(e) => updateMember(idx, { email: e.target.value })}
                  placeholder="you@example.com"
                  disabled={!!m.generatedLink}
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Phone</Label>
                <Input
                  type="tel"
                  value={m.phone}
                  onChange={(e) => updateMember(idx, { phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  disabled={!!m.generatedLink}
                />
              </div>
            </div>

            {/* Job title + access */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Job Title *</Label>
                <Select
                  value={m.jobTitle}
                  onValueChange={(v) => updateMember(idx, { jobTitle: v })}
                  disabled={!!m.generatedLink}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TITLES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Access Level</Label>
                <Select
                  value={m.accessLevel}
                  onValueChange={(v) => updateMember(idx, { accessLevel: v })}
                  disabled={!!m.generatedLink}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team_owner">Owner</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="artist">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Artist access toggle */}
            {addedArtists.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Artist Access</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">All Artists</span>
                    <Switch
                      checked={m.allArtists}
                      onCheckedChange={(checked) =>
                        updateMember(idx, {
                          allArtists: checked,
                          selectedArtistIds: checked ? [] : m.selectedArtistIds,
                        })
                      }
                      disabled={!!m.generatedLink}
                    />
                  </div>
                </div>
                {!m.allArtists && (
                  <div className="flex flex-wrap gap-2">
                    {addedArtists.map((a) => {
                      const isSelected = m.selectedArtistIds.includes(a.id);
                      return (
                        <button
                          key={a.id}
                          onClick={() => !m.generatedLink && toggleArtist(idx, a.id)}
                          disabled={!!m.generatedLink}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 border text-xs font-medium transition-colors",
                            isSelected
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-card text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={a.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[8px]">{a.name[0]}</AvatarFallback>
                          </Avatar>
                          {a.name}
                          {isSelected && <Check className="h-3 w-3 text-primary ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Employment + salary (optional) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Employment Type</Label>
                <Select
                  value={m.employmentType}
                  onValueChange={(v) => updateMember(idx, { employmentType: v })}
                  disabled={!!m.generatedLink}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="w2">W-2 Employee</SelectItem>
                    <SelectItem value="1099">1099 Contractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">
                  {m.employmentType === "1099" ? "Monthly Retainer" : "Annual Salary"}
                </Label>
                <Input
                  type="number"
                  value={m.salary}
                  onChange={(e) => updateMember(idx, { salary: e.target.value })}
                  placeholder="$0"
                  disabled={!!m.generatedLink}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              {m.generatedLink ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input value={m.generatedLink} readOnly className="text-xs h-8 flex-1" />
                  <Button size="sm" variant="outline" onClick={() => copyLink(idx)}>
                    {copiedIdx === idx ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => generateAndSend(idx, true)}
                    disabled={generatingIdx === idx || !canSendInvite(m)}
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    {generatingIdx === idx ? "Sending..." : "Send Invite"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateAndSend(idx, false)}
                    disabled={generatingIdx === idx || !m.firstName.trim()}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy Link
                  </Button>
                  {members.length > 1 && (
                    <Button size="sm" variant="ghost" onClick={() => removeMember(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={addMember} className="w-full mt-3">
        <Plus className="h-4 w-4 mr-1.5" /> Add another member
      </Button>
    </>
  );
}
