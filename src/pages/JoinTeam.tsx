import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { InviteeOnboarding } from "@/components/onboarding/InviteeOnboarding";
import { jobTitlePermissions, type PermissionFlags } from "@/components/settings/PermissionToggles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Loader2, Users, Shield, Camera } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import rolloutLogoWhite from "@/assets/rollout-logo-white.png";

interface JoinResult {
  team_name: string;
  role: string;
  job_title?: string;
  artists: { id: string; name: string; avatar_url: string | null }[];
}

interface InvitePreview {
  team_name: string | null;
  team_avatar: string | null;
  inviter_name: string | null;
  invitee_name: string | null;
  role: string;
  job_title?: string;
}

function getDepartmentRoute(jobTitle: string | undefined): string {
  if (!jobTitle) return "/roster";
  const title = jobTitle.toLowerCase();
  if (title.includes("finance") || title.includes("operations")) return "/overview?tab=finance";
  return "/roster";
}

export default function JoinTeam() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"auth" | "profile" | "personal" | "artists" | "welcome">("auth");
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [joinResult, setJoinResult] = useState<JoinResult | null>(null);
  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Personal details
  const [preferredAirline, setPreferredAirline] = useState("");
  const [ktnNumber, setKtnNumber] = useState("");
  const [preferredSeat, setPreferredSeat] = useState("");
  const [shirtSize, setShirtSize] = useState("");
  const [pantSize, setPantSize] = useState("");
  const [shoeSize, setShoeSize] = useState("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Fetch invite preview
  useEffect(() => {
    if (!token) return;
    supabase.functions.invoke("invite-preview", { body: { token } }).then(({ data }) => {
      if (data && !data.error) {
        setInvitePreview(data);
        if (data.invitee_name) setFullName(data.invitee_name);
      }
    });
  }, [token]);

  // When user becomes authenticated, move to profile step
  useEffect(() => {
    if (authLoading) return;
    if (user && step === "auth") {
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.full_name && invitePreview?.invitee_name) {
            // Has name from invite, go to accepting
            setFullName(data.full_name);
            acceptInvite();
          } else {
            setStep("profile");
          }
        });
    }
  }, [user, authLoading, step]);

  const acceptInvite = async () => {
    setAccepting(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("accept-invite", {
        body: { token },
      });
      if (fnError) throw fnError;
      if (data?.error) {
        if (data.already_member) {
          toast.info("You're already a member of this team!");
          await queryClient.invalidateQueries({ queryKey: ["teams"] });
          navigate("/roster", { replace: true });
          return;
        }
        throw new Error(data.error);
      }
      setJoinResult(data);
      setStep("profile");
    } catch (err: any) {
      setError(err.message || "Failed to accept invite");
      toast.error(err.message || "Failed to accept invite");
    } finally {
      setAccepting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast.error(error.message);
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      toast.error(error.message);
    } else if (signUpData.user && !signUpData.session) {
      // User created but email not confirmed yet
      toast.success("Check your email to verify your account, then come back to this page.");
    } else if (signUpData.user) {
      toast.success("Account created!");
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/join/${token}`,
    });
    if (error) toast.error(error.message);
  };

  const handleAppleLogin = async () => {
    const { error } = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: `${window.location.origin}/join/${token}`,
    });
    if (error) toast.error(error.message);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", user!.id);
      if (error) throw error;

      if (!joinResult) {
        await acceptInvite();
      }
      setStep("personal");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("profile-photos")
      .upload(path, file, { upsert: true });
    if (uploadError) { toast.error(uploadError.message); return; }
    const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(path);
    const url = `${urlData.publicUrl}?t=${Date.now()}`;
    setAvatarUrl(url);
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  };

  const handlePersonalSave = async () => {
    setLoading(true);
    try {
      await supabase.from("profiles").update({
        preferred_airline: preferredAirline || null,
        ktn_number: ktnNumber || null,
        preferred_seat: preferredSeat || null,
        shirt_size: shirtSize || null,
        pant_size: pantSize || null,
        shoe_size: shoeSize || null,
        dietary_restrictions: dietaryRestrictions || null,
      } as any).eq("id", user!.id);
      setStep("artists");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    await queryClient.invalidateQueries({ queryKey: ["teams"] });
    const teamName = joinResult?.team_name || invitePreview?.team_name;
    toast.success(`Welcome to ${teamName}!`);
    const route = getDepartmentRoute(joinResult?.job_title || invitePreview?.role);
    navigate(route, { replace: true });
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case "team_owner": return "Team Owner";
      case "manager": return "Manager";
      case "artist": return "Artist";
      default: return role;
    }
  };

  if (accepting || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Joining team...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between bg-[hsl(0,0%,8%)] overflow-hidden">
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-gradient-radial from-white/8 to-transparent blur-3xl" />
      <div className="flex-1" />

      <motion.div
        className="relative z-10 flex w-full max-w-sm flex-col px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        key={step}
      >
        <img src={rolloutLogoWhite} alt="Rollout" className="h-12 w-auto object-contain opacity-90" />

        <AnimatePresence mode="wait">
          {/* Auth step */}
          {step === "auth" && !user && (
            <motion.div key="auth" className="mt-8 flex flex-col gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div>
                <p className="text-lg font-semibold text-[hsl(40,30%,95%)]">
                  {invitePreview?.inviter_name
                    ? `${invitePreview.inviter_name} invited you to join ${invitePreview.team_name ?? "their team"}`
                    : invitePreview?.team_name
                      ? `You've been invited to ${invitePreview.team_name}`
                      : "You've been invited!"}
                </p>
                <p className="text-sm text-[hsl(0,0%,55%)] mt-1">
                  Sign in or create an account to join{invitePreview?.team_name ? ` ${invitePreview.team_name}` : " the team"}.
                </p>
              </div>

              {authMode === "login" ? (
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <Label className="text-[hsl(40,30%,85%)]">Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                      className="h-12 rounded-lg border-[hsl(0,0%,25%)] bg-[hsl(0,0%,12%)] text-[hsl(40,30%,95%)] placeholder:text-[hsl(0,0%,40%)]"
                      placeholder="you@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[hsl(40,30%,85%)]">Password</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                      className="h-12 rounded-lg border-[hsl(0,0%,25%)] bg-[hsl(0,0%,12%)] text-[hsl(40,30%,95%)] placeholder:text-[hsl(0,0%,40%)]"
                      placeholder="••••••••" />
                  </div>
                  <Button type="submit" disabled={loading}
                    className="h-12 rounded-full bg-[hsl(40,30%,95%)] text-[hsl(0,0%,5%)] hover:bg-[hsl(40,30%,90%)] font-medium">
                    {loading ? "Signing in..." : "Sign in & Join"}
                  </Button>
                  <button type="button" onClick={() => setAuthMode("signup")} className="text-sm text-[hsl(0,0%,55%)] hover:text-[hsl(40,30%,90%)]">
                    Don't have an account? Sign up
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignup} className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <Label className="text-[hsl(40,30%,85%)]">Full Name</Label>
                    <Input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                      className="h-12 rounded-lg border-[hsl(0,0%,25%)] bg-[hsl(0,0%,12%)] text-[hsl(40,30%,95%)] placeholder:text-[hsl(0,0%,40%)]"
                      placeholder="Your name" autoFocus />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[hsl(40,30%,85%)]">Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                      className="h-12 rounded-lg border-[hsl(0,0%,25%)] bg-[hsl(0,0%,12%)] text-[hsl(40,30%,95%)] placeholder:text-[hsl(0,0%,40%)]"
                      placeholder="you@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[hsl(40,30%,85%)]">Password</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                      className="h-12 rounded-lg border-[hsl(0,0%,25%)] bg-[hsl(0,0%,12%)] text-[hsl(40,30%,95%)] placeholder:text-[hsl(0,0%,40%)]"
                      placeholder="Min. 6 characters" />
                  </div>
                  <Button type="submit" disabled={loading}
                    className="h-12 rounded-full bg-[hsl(40,30%,95%)] text-[hsl(0,0%,5%)] hover:bg-[hsl(40,30%,90%)] font-medium">
                    {loading ? "Creating account..." : "Create account"}
                  </Button>
                  <Button type="button" onClick={handleGoogleLogin} variant="outline"
                    className="h-12 rounded-full border-[hsl(0,0%,25%)] bg-transparent text-[hsl(40,30%,95%)] hover:bg-[hsl(0,0%,15%)] font-medium">
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </Button>
                  <Button type="button" onClick={handleAppleLogin} variant="outline"
                    className="h-12 rounded-full border-[hsl(0,0%,25%)] bg-transparent text-[hsl(40,30%,95%)] hover:bg-[hsl(0,0%,15%)] font-medium">
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                    Continue with Apple
                  </Button>
                  <button type="button" onClick={() => setAuthMode("login")} className="text-sm text-[hsl(0,0%,55%)] hover:text-[hsl(40,30%,90%)]">
                    Already have an account? Sign in
                  </button>
                </form>
              )}
            </motion.div>
          )}

          {/* Profile step - confirm name + photo */}
          {step === "profile" && (
            <motion.form key="profile" onSubmit={handleProfileSubmit} className="mt-8 flex flex-col gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div>
                <p className="text-lg font-semibold text-[hsl(40,30%,95%)]">Confirm your profile</p>
                <p className="text-sm text-[hsl(0,0%,55%)] mt-1">Confirm your name and optionally add a profile photo.</p>
              </div>

              {/* Photo upload */}
              <div className="flex justify-center">
                <label className="relative cursor-pointer group">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={avatarUrl ?? undefined} />
                    <AvatarFallback className="text-xl">{(fullName || "?")[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(file);
                  }} />
                </label>
              </div>

              <div className="space-y-2">
                <Label className="text-[hsl(40,30%,85%)]">Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" required autoFocus
                  className="h-12 rounded-lg border-[hsl(0,0%,25%)] bg-[hsl(0,0%,12%)] text-[hsl(40,30%,95%)] placeholder:text-[hsl(0,0%,40%)]" />
              </div>
              <Button type="submit" disabled={loading || !fullName.trim()}
                className="h-12 rounded-full bg-[hsl(40,30%,95%)] text-[hsl(0,0%,5%)] hover:bg-[hsl(40,30%,90%)] font-medium">
                {loading ? "Saving..." : "Continue"}
              </Button>
            </motion.form>
          )}

          {/* Personal details step */}
          {step === "personal" && (
            <motion.div key="personal" className="mt-8 flex flex-col gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div>
                <p className="text-lg font-semibold text-[hsl(40,30%,95%)]">Personal details</p>
                <p className="text-sm text-[hsl(0,0%,55%)] mt-1">Optional — you can fill these in later too.</p>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-[hsl(40,30%,85%)]">Preferred Airline</Label>
                    <Input value={preferredAirline} onChange={(e) => setPreferredAirline(e.target.value)} placeholder="e.g. Delta"
                      className="h-10 rounded-lg border-[hsl(0,0%,25%)] bg-[hsl(0,0%,12%)] text-[hsl(40,30%,95%)] placeholder:text-[hsl(0,0%,40%)]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[hsl(40,30%,85%)]">Preferred Seat</Label>
                    <Select value={preferredSeat} onValueChange={setPreferredSeat}>
                      <SelectTrigger className="h-10 rounded-lg border-[hsl(0,0%,25%)] bg-[hsl(0,0%,12%)] text-[hsl(40,30%,95%)]">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="window">Window</SelectItem>
                        <SelectItem value="aisle">Aisle</SelectItem>
                        <SelectItem value="middle">Middle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[hsl(40,30%,85%)]">KTN / TSA PreCheck</Label>
                  <Input value={ktnNumber} onChange={(e) => setKtnNumber(e.target.value)} placeholder="Known Traveler Number"
                    className="h-10 rounded-lg border-[hsl(0,0%,25%)] bg-[hsl(0,0%,12%)] text-[hsl(40,30%,95%)] placeholder:text-[hsl(0,0%,40%)]" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-[hsl(40,30%,85%)]">Shirt</Label>
                    <Input value={shirtSize} onChange={(e) => setShirtSize(e.target.value)} placeholder="M"
                      className="h-10 rounded-lg border-[hsl(0,0%,25%)] bg-[hsl(0,0%,12%)] text-[hsl(40,30%,95%)] placeholder:text-[hsl(0,0%,40%)]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[hsl(40,30%,85%)]">Pants</Label>
                    <Input value={pantSize} onChange={(e) => setPantSize(e.target.value)} placeholder="32"
                      className="h-10 rounded-lg border-[hsl(0,0%,25%)] bg-[hsl(0,0%,12%)] text-[hsl(40,30%,95%)] placeholder:text-[hsl(0,0%,40%)]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[hsl(40,30%,85%)]">Shoes</Label>
                    <Input value={shoeSize} onChange={(e) => setShoeSize(e.target.value)} placeholder="10"
                      className="h-10 rounded-lg border-[hsl(0,0%,25%)] bg-[hsl(0,0%,12%)] text-[hsl(40,30%,95%)] placeholder:text-[hsl(0,0%,40%)]" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[hsl(40,30%,85%)]">Dietary Restrictions</Label>
                  <Input value={dietaryRestrictions} onChange={(e) => setDietaryRestrictions(e.target.value)} placeholder="e.g. Vegetarian, Nut allergy"
                    className="h-10 rounded-lg border-[hsl(0,0%,25%)] bg-[hsl(0,0%,12%)] text-[hsl(40,30%,95%)] placeholder:text-[hsl(0,0%,40%)]" />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep("artists")}
                  className="flex-1 h-12 rounded-full text-[hsl(0,0%,55%)] hover:text-[hsl(40,30%,90%)] hover:bg-[hsl(0,0%,15%)]">
                  Skip
                </Button>
                <Button onClick={handlePersonalSave} disabled={loading}
                  className="flex-1 h-12 rounded-full bg-[hsl(40,30%,95%)] text-[hsl(0,0%,5%)] hover:bg-[hsl(40,30%,90%)] font-medium">
                  {loading ? "Saving..." : "Continue"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Artist confirmation step */}
          {step === "artists" && (
            <motion.div key="artists" className="mt-8 flex flex-col gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div>
                <p className="text-lg font-semibold text-[hsl(40,30%,95%)]">Your artist assignments</p>
                <p className="text-sm text-[hsl(0,0%,55%)] mt-1">You have access to these artists.</p>
              </div>

              {joinResult && joinResult.artists.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto">
                  {joinResult.artists.map((artist) => (
                    <div key={artist.id} className="flex items-center gap-3 p-3 rounded-lg border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,12%)]">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={artist.avatar_url ?? undefined} />
                        <AvatarFallback className="text-sm">{artist.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-[hsl(40,30%,95%)]">{artist.name}</span>
                      <Check className="h-4 w-4 text-emerald-400 ml-auto" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[hsl(0,0%,55%)] text-center py-4">No specific artist assignments yet.</p>
              )}

              <Button onClick={() => setStep("welcome")}
                className="h-12 rounded-full bg-[hsl(40,30%,95%)] text-[hsl(0,0%,5%)] hover:bg-[hsl(40,30%,90%)] font-medium">
                Continue
              </Button>
            </motion.div>
          )}

          {/* Welcome step */}
          {step === "welcome" && (
            <motion.div key="welcome" className="mt-8 flex flex-col gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div>
                <p className="text-lg font-semibold text-[hsl(40,30%,95%)]">
                  Welcome to {joinResult?.team_name || invitePreview?.team_name}!
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Shield className="h-4 w-4 text-[hsl(0,0%,55%)]" />
                  <p className="text-sm text-[hsl(0,0%,55%)]">
                    You've joined as <span className="font-medium text-[hsl(40,30%,85%)]">{roleLabel(joinResult?.role || invitePreview?.role || "")}</span>
                  </p>
                </div>
              </div>
              <Button onClick={handleFinish}
                className="h-12 rounded-full bg-[hsl(40,30%,95%)] text-[hsl(0,0%,5%)] hover:bg-[hsl(40,30%,90%)] font-medium">
                Get Started
              </Button>
            </motion.div>
          )}

          {error && !accepting && (
            <motion.div key="error" className="mt-8 flex flex-col gap-4 items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-sm text-destructive text-center">{error}</p>
              <Button variant="outline" onClick={() => navigate("/roster", { replace: true })}>Go to Dashboard</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="flex-1" />
    </div>
  );
}
