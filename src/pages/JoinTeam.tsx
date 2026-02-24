import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, Loader2, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import rolloutLogo from "@/assets/rollout-logo.png";

interface JoinResult {
  team_name: string;
  role: string;
  artists: { id: string; name: string; avatar_url: string | null }[];
}

export default function JoinTeam() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<"auth" | "profile" | "preview" | "done">("auth");
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [joinResult, setJoinResult] = useState<JoinResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // When user becomes authenticated, move to profile step
  useEffect(() => {
    if (authLoading) return;
    if (user && step === "auth") {
      // Check if profile has a name already
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.full_name) {
            // Already has a name, go straight to accepting
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
          navigate("/roster", { replace: true });
          return;
        }
        throw new Error(data.error);
      }
      setJoinResult(data);
      setStep("preview");
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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/join/${token}`,
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email to confirm your account!");
      setAuthMode("login");
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    // Store token in localStorage so we can pick it up after redirect
    localStorage.setItem("pending_invite_token", token || "");
    const { error } = await lovable.auth.signInWithOAuth("google", {
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
      await acceptInvite();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    toast.success(`Welcome to ${joinResult?.team_name}!`);
    navigate("/roster", { replace: true });
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
        <img src={rolloutLogo} alt="Rollout" className="h-7 mb-1" />

        <AnimatePresence mode="wait">
          {step === "auth" && !user && (
            <motion.div
              key="auth"
              className="mt-8 flex flex-col gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div>
                <p className="text-lg font-semibold text-[hsl(40,30%,95%)]">You've been invited!</p>
                <p className="text-sm text-[hsl(0,0%,55%)] mt-1">
                  Sign in or create an account to join the team.
                </p>
              </div>

              {authMode === "login" ? (
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <Label className="text-[hsl(40,30%,85%)]">Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 rounded-lg border-[hsl(0,0%,25%)] bg-[hsl(0,0%,12%)] text-[hsl(40,30%,95%)] placeholder:text-[hsl(0,0%,40%)]"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[hsl(40,30%,85%)]">Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 rounded-lg border-[hsl(0,0%,25%)] bg-[hsl(0,0%,12%)] text-[hsl(40,30%,95%)] placeholder:text-[hsl(0,0%,40%)]"
                      placeholder="••••••••"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 rounded-full bg-[hsl(40,30%,95%)] text-[hsl(0,0%,5%)] hover:bg-[hsl(40,30%,90%)] font-medium"
                  >
                    {loading ? "Signing in..." : "Sign in & Join"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setAuthMode("signup")}
                    className="text-sm text-[hsl(0,0%,55%)] hover:text-[hsl(40,30%,90%)]"
                  >
                    Don't have an account? Sign up
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignup} className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <Label className="text-[hsl(40,30%,85%)]">Full Name</Label>
                    <Input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="h-12 rounded-lg border-[hsl(0,0%,25%)] bg-[hsl(0,0%,12%)] text-[hsl(40,30%,95%)] placeholder:text-[hsl(0,0%,40%)]"
                      placeholder="Your name"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[hsl(40,30%,85%)]">Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 rounded-lg border-[hsl(0,0%,25%)] bg-[hsl(0,0%,12%)] text-[hsl(40,30%,95%)] placeholder:text-[hsl(0,0%,40%)]"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[hsl(40,30%,85%)]">Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-12 rounded-lg border-[hsl(0,0%,25%)] bg-[hsl(0,0%,12%)] text-[hsl(40,30%,95%)] placeholder:text-[hsl(0,0%,40%)]"
                      placeholder="Min. 6 characters"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 rounded-full bg-[hsl(40,30%,95%)] text-[hsl(0,0%,5%)] hover:bg-[hsl(40,30%,90%)] font-medium"
                  >
                    {loading ? "Creating account..." : "Create account"}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleGoogleLogin}
                    variant="outline"
                    className="h-12 rounded-full border-[hsl(0,0%,25%)] bg-transparent text-[hsl(40,30%,95%)] hover:bg-[hsl(0,0%,15%)] font-medium"
                  >
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </Button>
                  <button
                    type="button"
                    onClick={() => setAuthMode("login")}
                    className="text-sm text-[hsl(0,0%,55%)] hover:text-[hsl(40,30%,90%)]"
                  >
                    Already have an account? Sign in
                  </button>
                </form>
              )}
            </motion.div>
          )}

          {step === "profile" && (
            <motion.form
              key="profile"
              onSubmit={handleProfileSubmit}
              className="mt-8 flex flex-col gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div>
                <p className="text-lg font-semibold text-foreground">What's your name?</p>
                <p className="text-sm text-muted-foreground mt-1">We'll use this across the app.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" disabled={loading || !fullName.trim()}>
                {loading ? "Saving..." : "Continue"}
              </Button>
            </motion.form>
          )}

          {step === "preview" && joinResult && (
            <motion.div
              key="preview"
              className="mt-8 flex flex-col gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div>
                <p className="text-lg font-semibold text-[hsl(40,30%,95%)]">
                  Welcome to {joinResult.team_name}!
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Shield className="h-4 w-4 text-[hsl(0,0%,55%)]" />
                  <p className="text-sm text-[hsl(0,0%,55%)]">
                    You've joined as <span className="font-medium text-[hsl(40,30%,85%)]">{roleLabel(joinResult.role)}</span>
                  </p>
                </div>
              </div>

              {joinResult.artists.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-[hsl(40,30%,85%)] mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Artists you have access to
                  </p>
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
                </div>
              )}

              <Button
                onClick={handleFinish}
                className="h-12 rounded-full bg-[hsl(40,30%,95%)] text-[hsl(0,0%,5%)] hover:bg-[hsl(40,30%,90%)] font-medium"
              >
                Get Started
              </Button>
            </motion.div>
          )}

          {error && !accepting && (
            <motion.div
              key="error"
              className="mt-8 flex flex-col gap-4 items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-sm text-destructive text-center">{error}</p>
              <Button variant="outline" onClick={() => navigate("/roster", { replace: true })}>
                Go to Dashboard
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="flex-1" />
      <div className="relative z-10 pb-12">
        <img src={rolloutLogo} alt="Rollout" className="h-8 brightness-0 invert opacity-90" />
      </div>
    </div>
  );
}
