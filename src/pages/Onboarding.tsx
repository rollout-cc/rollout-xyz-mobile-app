import { useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTeams } from "@/hooks/useTeams";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import rolloutLogo from "@/assets/rollout-logo.png";

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: teams, isLoading: teamsLoading } = useTeams();

  // Check if user has a pending application
  const { data: application, isLoading: appLoading } = useQuery({
    queryKey: ["my-application", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("team_applications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // If user already has teams, go to roster
  if (!teamsLoading && teams && teams.length > 0) {
    return <Navigate to="/roster" replace />;
  }

  const isLoading = teamsLoading || appLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  // No teams and no application → send to signup
  if (!application) {
    return <Navigate to="/login?mode=signup" replace />;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  // Show holding page
  return (
    <div className="h-dvh bg-background flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full flex flex-col items-center text-center">
        <img src={rolloutLogo} alt="Rollout" className="h-16 mb-10" />

        <h1 className="text-2xl font-semibold text-foreground mb-3">
          You're all set!
        </h1>
        <p className="text-muted-foreground leading-relaxed mb-2">
          Your team account is being set up and we will reach out to onboard you shortly.
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Keep an eye on your inbox at{" "}
          <span className="font-medium text-foreground">{application.email}</span> — a member of our team will be in touch soon.
        </p>

        <Button
          variant="outline"
          onClick={handleSignOut}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
