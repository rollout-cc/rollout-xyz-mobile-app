import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function Login() {
  const [mode, setMode] = useState<"landing" | "email-login" | "email-signup">("landing");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast.error(error.message);
    setLoading(false);
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email to confirm your account!");
      setMode("email-login");
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error(error.message);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between bg-[hsl(0,0%,8%)] overflow-hidden">
      {/* Spotlight effect */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-gradient-radial from-white/8 to-transparent blur-3xl" />

      <div className="flex-1" />

      <motion.div
        className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6 px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold tracking-tight text-[hsl(40,30%,95%)]">
          Get Organized
        </h1>

        <AnimatePresence mode="wait">
          {mode === "landing" && (
            <motion.div
              key="landing"
              className="flex w-full flex-col gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Button
                onClick={() => setMode("email-login")}
                className="h-12 rounded-full bg-[hsl(40,30%,95%)] text-[hsl(0,0%,5%)] hover:bg-[hsl(40,30%,90%)] font-medium"
              >
                Continue with email
              </Button>
              <Button
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
                onClick={() => setMode("email-signup")}
                className="mt-2 text-sm text-[hsl(0,0%,55%)] hover:text-[hsl(40,30%,90%)] transition-colors"
              >
                Apply for Membership
              </button>
            </motion.div>
          )}

          {mode === "email-login" && (
            <motion.form
              key="login"
              onSubmit={handleEmailLogin}
              className="flex w-full flex-col gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
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
                {loading ? "Signing in..." : "Sign in"}
              </Button>
              <div className="flex justify-between">
                <button type="button" onClick={() => setMode("landing")} className="text-sm text-[hsl(0,0%,55%)] hover:text-[hsl(40,30%,90%)]">
                  ← Back
                </button>
                <button type="button" onClick={() => setMode("email-signup")} className="text-sm text-[hsl(0,0%,55%)] hover:text-[hsl(40,30%,90%)]">
                  Create account
                </button>
              </div>
            </motion.form>
          )}

          {mode === "email-signup" && (
            <motion.form
              key="signup"
              onSubmit={handleEmailSignup}
              className="flex w-full flex-col gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="space-y-2">
                <Label className="text-[hsl(40,30%,85%)]">Full Name</Label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-12 rounded-lg border-[hsl(0,0%,25%)] bg-[hsl(0,0%,12%)] text-[hsl(40,30%,95%)] placeholder:text-[hsl(0,0%,40%)]"
                  placeholder="Your full name"
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
              <div className="flex justify-between">
                <button type="button" onClick={() => setMode("landing")} className="text-sm text-[hsl(0,0%,55%)] hover:text-[hsl(40,30%,90%)]">
                  ← Back
                </button>
                <button type="button" onClick={() => setMode("email-login")} className="text-sm text-[hsl(0,0%,55%)] hover:text-[hsl(40,30%,90%)]">
                  Already have an account?
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="flex-1" />

      {/* ROLLOUT Logo */}
      <div className="relative z-10 pb-12">
        <h2 className="text-3xl font-black tracking-tighter text-[hsl(40,30%,95%)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          ROLLOUT<span className="text-[hsl(40,30%,95%)]">.</span>
          <span className="inline-block -ml-1 text-lg">📢</span>
        </h2>
      </div>
    </div>
  );
}
