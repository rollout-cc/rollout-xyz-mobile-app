import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import rolloutLogo from "@/assets/rollout-logo.png";

export default function Login() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );
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
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) {
      toast.error(error.message);
    } else if (signUpData.user) {
      toast.success("Account created!");
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const isCustomDomain =
      !window.location.hostname.includes("lovable.app") &&
      !window.location.hostname.includes("lovableproject.com");

    if (isCustomDomain) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true,
        },
      });
      if (error) { toast.error(error.message); return; }
      if (data?.url) window.location.href = data.url;
    } else {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) toast.error(error.message);
    }
  };

  const handleAppleLogin = async () => {
    const isCustomDomain =
      !window.location.hostname.includes("lovable.app") &&
      !window.location.hostname.includes("lovableproject.com");

    if (isCustomDomain) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true,
        },
      });
      if (error) { toast.error(error.message); return; }
      if (data?.url) window.location.href = data.url;
    } else {
      const { error } = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });
      if (error) toast.error(error.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent!");
  };

  return (
    // h-dvh = dynamic viewport height: adjusts when the iOS keyboard appears,
    // unlike min-h-screen / 100vh which are fixed to the layout viewport.
    <div className="flex h-dvh">

      {/* Left panel – form */}
      <div className="flex flex-1 flex-col justify-between bg-[hsl(35,25%,91%)] px-8 sm:px-16 lg:px-24 overflow-y-auto">
        {/*
          Safe-area spacer: absorbs the Dynamic Island / notch height on iOS
          (same pattern used by AppLayout's header). Zero height on desktop.
        */}
        <div className="safe-area-top" aria-hidden="true" />

        <div className="py-10 sm:py-12">
          <img src={rolloutLogo} alt="Rollout" className="h-16 sm:h-20 mb-12 sm:mb-20" />

          {mode === "login" ? (
            <div className="max-w-md">
              <h2 className="text-2xl font-semibold text-foreground mb-8">Sign In</h2>

              <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCorrect="off"
                  autoCapitalize="none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Email"
                  className="h-12 rounded-lg border-[hsl(0,0%,75%)] bg-transparent text-foreground placeholder:text-muted-foreground touch-manipulation"
                />
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Password"
                  className="h-12 rounded-lg border-[hsl(0,0%,75%)] bg-transparent text-foreground placeholder:text-muted-foreground touch-manipulation"
                />

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-muted-foreground hover:text-foreground self-start -mt-1 transition-colors touch-manipulation"
                >
                  Forgot Password
                </button>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium mt-2 touch-manipulation"
                >
                  {loading ? "Signing in..." : "Sign In with Email"}
                </Button>

                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or continue with</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <Button
                  type="button"
                  onClick={handleGoogleLogin}
                  variant="outline"
                  className="h-12 rounded-full border-[hsl(0,0%,75%)] bg-transparent text-foreground hover:bg-[hsl(35,20%,86%)] font-medium touch-manipulation"
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Login with Google
                </Button>

                <Button
                  type="button"
                  onClick={handleAppleLogin}
                  variant="outline"
                  className="h-12 rounded-full border-[hsl(0,0%,75%)] bg-transparent text-foreground hover:bg-[hsl(35,20%,86%)] font-medium touch-manipulation"
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Sign in with Apple
                </Button>
              </form>
            </div>

              <form onSubmit={handleEmailSignup} className="flex flex-col gap-4">
                <Input
                  type="text"
                  inputMode="text"
                  autoComplete="name"
                  autoCorrect="off"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Full Name"
                  className="h-12 rounded-lg border-[hsl(0,0%,75%)] bg-transparent text-foreground placeholder:text-muted-foreground touch-manipulation"
                />
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCorrect="off"
                  autoCapitalize="none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Email"
                  className="h-12 rounded-lg border-[hsl(0,0%,75%)] bg-transparent text-foreground placeholder:text-muted-foreground touch-manipulation"
                />
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Password"
                  className="h-12 rounded-lg border-[hsl(0,0%,75%)] bg-transparent text-foreground placeholder:text-muted-foreground touch-manipulation"
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium mt-2 touch-manipulation"
                >
                  {loading ? "Creating account..." : "Start Free Trial"}
                </Button>

                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-sm text-muted-foreground hover:text-foreground self-start transition-colors touch-manipulation"
                >
                  ← Back to Sign In
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="pb-10 sm:pb-12" style={{ paddingBottom: "max(2.5rem, calc(var(--safe-area-inset-bottom) + 1.5rem))" }} />
      </div>

      {/* Right panel – waving flag video (desktop only) */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-[hsl(35,25%,91%)] pr-0 pl-8 py-8">
        <div className="w-[90%] h-[80vh] rounded-2xl overflow-hidden mr-auto">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="/flag-waving.mp4" type="video/mp4" />
            <source src="/flag-waving.mov" type="video/quicktime" />
          </video>
        </div>
      </div>
    </div>
  );
}
