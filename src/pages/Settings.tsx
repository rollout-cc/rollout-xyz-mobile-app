import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Upload, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { TeamManagement } from "@/components/settings/TeamManagement";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { PlanTab } from "@/components/settings/PlanTab";
import { BillingTab } from "@/components/settings/BillingTab";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTeams } from "@/hooks/useTeams";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useTeamPlan } from "@/hooks/useTeamPlan";
import { useTour } from "@/contexts/TourContext";

type SettingsSection = "profile" | "notifications" | "team" | "plan" | "billing";
type TeamSubSection = "members" | "profile";

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: teams = [] } = useTeams();
  const { selectedTeamId } = useSelectedTeam();
  const { isPaid, isTrialing, refetch: refetchPlan } = useTeamPlan();
  const hasPaidAccess = isPaid || isTrialing;
  const { resetAllTours, startTour } = useTour();

  const myRole = teams.find((t) => t.id === selectedTeamId)?.role;
  const isOwnerOrManager = myRole === "team_owner" || myRole === "manager";

  const initialTab = (searchParams.get("tab") as SettingsSection) || "profile";
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialTab);
  const [teamSubSection, setTeamSubSection] = useState<TeamSubSection>("members");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Handle checkout success
  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      toast.success("Subscription activated! Welcome to Icon.");
      refetchPlan();
    }
  }, [searchParams, refetchPlan]);

  // Reset to profile if non-owner lands on team/plan/billing tab
  useEffect(() => {
    if ((activeSection === "team" || activeSection === "billing") && !isOwnerOrManager) {
      setActiveSection("profile");
    }
  }, [isOwnerOrManager, activeSection]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, phone_number")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhoneNumber(profile.phone_number ?? "");
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("profile-photos").getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (updateError) throw updateError;
      setAvatarUrl(url);
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Image uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePhotoDelete = async () => {
    if (!user || !avatarUrl) return;
    setUploading(true);
    try {
      const { data: files } = await supabase.storage.from("profile-photos").list(user.id);
      if (files && files.length > 0) {
        const paths = files.map((f) => `${user.id}/${f.name}`);
        await supabase.storage.from("profile-photos").remove(paths);
      }
      await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
      setAvatarUrl(null);
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Photo removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete photo");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() || null, phone_number: phoneNumber.trim() || null })
        .eq("id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Settings">
        <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  const tabs: { key: SettingsSection; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "notifications", label: "Notifications" },
    ...(isOwnerOrManager && hasPaidAccess ? [{ key: "team" as const, label: "Team" }] : []),
    { key: "plan", label: "Plan" },
    ...(isOwnerOrManager && hasPaidAccess ? [{ key: "billing" as const, label: "Billing" }] : []),
  ];

  const titleMap: Record<SettingsSection, string> = {
    profile: "Profile Settings",
    notifications: "Notifications",
    team: "Team Settings",
    plan: "Plan",
    billing: "Billing",
  };

  return (
    <AppLayout title={titleMap[activeSection]}>
      <div className="max-w-3xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Top-level tabs */}
        <div className="flex gap-1 mb-6">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeSection === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="border-t border-border" />

        {activeSection === "profile" && (
          <div className="mt-6 space-y-8">
            <h2 className="text-foreground">Profile</h2>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" className="max-w-lg" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Profile Photo</Label>
              <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card max-w-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={avatarUrl ?? undefined} />
                  <AvatarFallback className="text-sm bg-muted text-muted-foreground">
                    {fullName?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex gap-2 ml-auto">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="h-4 w-4 mr-1.5" />
                    {uploading ? "Uploading..." : "Upload"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePhotoDelete} disabled={uploading || !avatarUrl}>
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Email</Label>
              <p className="text-xs text-muted-foreground">You are logged in as</p>
              <Input value={user?.email ?? ""} disabled className="max-w-lg bg-muted/50" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Phone Number</Label>
              <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="(555) 123-4567" type="tel" className="max-w-xs" />
            </div>

            <Button onClick={handleSave} disabled={saving} className="rounded-md">
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        )}

        {activeSection === "notifications" && (
          <div className="mt-6">
            <h2 className="text-foreground mb-6">Notifications</h2>
            <NotificationSettings />
          </div>
        )}

        {activeSection === "team" && isOwnerOrManager && hasPaidAccess && (
          <div className="mt-6">
            <div className="flex gap-1 mb-6">
              {([
                { key: "members" as const, label: "Members" },
                { key: "profile" as const, label: "Team Profile" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTeamSubSection(key)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    teamSubSection === key
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <TeamManagement showSection={teamSubSection === "members" ? "members" : "profile"} />
          </div>
        )}

        {activeSection === "plan" && (
          <div className="mt-6">
            <PlanTab />
          </div>
        )}

        {activeSection === "billing" && isOwnerOrManager && hasPaidAccess && (
          <div className="mt-6">
            <BillingTab />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
