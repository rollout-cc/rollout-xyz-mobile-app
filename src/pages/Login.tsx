import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import rolloutLogo from "@/assets/rollout-logo.png";

const testimonials = [
  {
    quote: "I feel like every small label needs to be using this.",
    name: "Kei Henderson",
    role: "Third & Hayden",
  },
  {
    quote: "Thank you for taking the initiative to create this. It is truly something that is really needed.",
    name: "Mace",
    role: "Artist Manager",
  },
  {
    quote: "Having the Rollout app and using it makes me think about the projects I'm working on differently.",
    name: "Raney Antoine Jr.",
    role: "Musician, Producer\n& Professor of Hip-Hop and R&B",
  },
];

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
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
      setMode("login");
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error(error.message);
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
    <div className="flex min-h-screen">
      {/* Left panel – form */}
      <div className="flex flex-1 flex-col justify-between bg-[hsl(35,25%,91%)] px-8 sm:px-16 lg:px-24 py-12">
        <div>
          <img src={rolloutLogo} alt="Rollout" className="h-16 sm:h-20 mb-16 sm:mb-24" />

          {mode === "login" ? (
            <div className="max-w-md">
              <h2 className="text-3xl font-bold text-foreground mb-8">Sign In</h2>

              <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Email"
                  className="h-12 rounded-lg border-[hsl(0,0%,75%)] bg-transparent text-foreground placeholder:text-muted-foreground"
                />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Password"
                  className="h-12 rounded-lg border-[hsl(0,0%,75%)] bg-transparent text-foreground placeholder:text-muted-foreground"
                />

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-muted-foreground hover:text-foreground self-start -mt-1 transition-colors"
                >
                  Forgot Password
                </button>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium mt-2"
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
                  className="h-12 rounded-full border-[hsl(0,0%,75%)] bg-transparent text-foreground hover:bg-[hsl(35,20%,86%)] font-medium"
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Login with Google
                </Button>
              </form>
            </div>
          ) : (
            <div className="max-w-md">
              <h2 className="text-3xl font-bold text-foreground mb-8">Apply</h2>

              <form onSubmit={handleEmailSignup} className="flex flex-col gap-4">
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Full Name"
                  className="h-12 rounded-lg border-[hsl(0,0%,75%)] bg-transparent text-foreground placeholder:text-muted-foreground"
                />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Email"
                  className="h-12 rounded-lg border-[hsl(0,0%,75%)] bg-transparent text-foreground placeholder:text-muted-foreground"
                />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Password"
                  className="h-12 rounded-lg border-[hsl(0,0%,75%)] bg-transparent text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium mt-2"
                >
                  {loading ? "Creating account..." : "Create Account"}
                </Button>

                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-sm text-muted-foreground hover:text-foreground self-start transition-colors"
                >
                  ← Back to Sign In
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        {mode === "login" && (
          <button
            onClick={() => setMode("signup")}
            className="flex items-center justify-between max-w-md mt-12 px-5 py-4 rounded-lg border border-[hsl(0,0%,75%)] hover:bg-[hsl(35,20%,86%)] transition-colors"
          >
            <span className="text-sm font-medium text-foreground">Don't have an account?</span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              Apply Here <ChevronRight className="h-4 w-4" />
            </span>
          </button>
        )}
      </div>

      {/* Right panel – testimonials */}
      <div className="hidden lg:flex flex-1 flex-col justify-center gap-5 bg-[hsl(0,0%,22%)] px-12 xl:px-20 py-12 relative overflow-hidden">
        {/* Subtle light sweep */}
        <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-gradient-to-bl from-white/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        {testimonials.map((t, i) => (
          <div
            key={i}
            className="relative flex items-center gap-5 rounded-2xl bg-[hsl(0,0%,18%)] border border-[hsl(0,0%,28%)] p-6"
          >
            {/* Avatar placeholder */}
            <div className="h-20 w-20 shrink-0 rounded-full bg-[hsl(0,0%,30%)]" />

            <div className="flex-1 min-w-0">
              <p className="text-[hsl(40,30%,90%)] text-base leading-relaxed mb-3">
                {t.quote}
              </p>
              <p className="text-sm font-semibold text-[hsl(40,30%,92%)]">{t.name}</p>
              <p className="text-xs text-[hsl(0,0%,55%)] whitespace-pre-line">{t.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
