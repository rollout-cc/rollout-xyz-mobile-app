import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Upload, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { TeamManagement } from "@/components/settings/TeamManagement";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type SettingsSection = "profile" | "notifications" | "team";

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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

      const { data: { publicUrl } } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(path);

      const url = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user.id);

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
      const { data: files } = await supabase.storage
        .from("profile-photos")
        .list(user.id);

      if (files && files.length > 0) {
        const paths = files.map((f) => `${user.id}/${f.name}`);
        await supabase.storage.from("profile-photos").remove(paths);
      }

      await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

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
        .update({
          full_name: fullName.trim() || null,
          phone_number: phoneNumber.trim() || null,
        })
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
        <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
          Loading...
        </div>
      </AppLayout>
    );
  }

  const title = activeSection === "profile" ? "Profile Settings" : "Team Settings";

  return (
    <AppLayout title={title}>
      <div className="max-w-3xl">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Top-level section tabs */}
        <div className="flex gap-1 mb-6">
          {(["profile", "notifications", "team"] as const).map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeSection === section
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {section === "profile" ? "Profile" : section === "notifications" ? "Notifications" : "Team"}
            </button>
          ))}
        </div>

        <div className="border-t border-border" />

        {activeSection === "profile" ? (
          <div className="mt-6 space-y-8">
            <h2 className="text-foreground">Profile</h2>

            {/* Full Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="max-w-lg"
              />
            </div>

            {/* Profile Photo */}
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
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-1.5" />
                    {uploading ? "Uploading..." : "Upload"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePhotoDelete}
                    disabled={uploading || !avatarUrl}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Email</Label>
              <p className="text-xs text-muted-foreground">You are logged in as</p>
              <Input
                value={user?.email ?? ""}
                disabled
                className="max-w-lg bg-muted/50"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Phone Number</Label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="(555) 123-4567"
                type="tel"
                className="max-w-xs"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md"
            >
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        ) : activeSection === "notifications" ? (
          <div className="mt-6 space-y-6">
            <h2 className="text-foreground">Notifications</h2>
            <p className="text-sm text-muted-foreground">
              Notification preferences coming soon.
            </p>
          </div>
        ) : (
          <div className="mt-6">
            <TeamManagement />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
