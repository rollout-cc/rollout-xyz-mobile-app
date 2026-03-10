import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import rolloutLogo from "@/assets/rollout-logo.png";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    } else {
      // Also listen for auth state change in case token is processed async
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setReady(true);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      navigate("/roster", { replace: true });
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[hsl(35,25%,91%)] px-6">
      <div className="w-full max-w-sm">
        <img src={rolloutLogo} alt="Rollout" className="h-16 mb-10" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Reset Password</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {ready ? "Enter your new password below." : "Processing your reset link..."}
        </p>

        {ready ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="New password"
              className="h-12 rounded-lg border-[hsl(0,0%,75%)] bg-transparent text-foreground placeholder:text-muted-foreground"
            />
            <Input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Confirm new password"
              className="h-12 rounded-lg border-[hsl(0,0%,75%)] bg-transparent text-foreground placeholder:text-muted-foreground"
            />
            <Button
              type="submit"
              disabled={loading}
              className="h-12 rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium mt-2"
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        )}
      </div>
    </div>
  );
}
