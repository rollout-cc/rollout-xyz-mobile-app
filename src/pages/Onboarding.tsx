import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateTeam } from "@/hooks/useTeams";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createTeam = useCreateTeam();
  const [step, setStep] = useState<"name" | "team">("name");
  const [fullName, setFullName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", user!.id);
      if (error) throw error;
      setStep("team");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setLoading(true);
    try {
      await createTeam.mutateAsync(teamName.trim());
      toast.success("You're all set!");
      navigate("/roster", { replace: true });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <motion.div
        className="w-full max-w-sm px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        key={step}
      >
        <h1
          className="mb-1 text-2xl font-black tracking-tighter text-foreground"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          ROLLOUT<span>.</span>📢
        </h1>

        {step === "name" ? (
          <form onSubmit={handleNameSubmit} className="mt-8 flex flex-col gap-4">
            <div>
              <p className="text-lg font-semibold text-foreground">What's your name?</p>
              <p className="text-sm text-muted-foreground mt-1">We'll use this across the app.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                required
                autoFocus
              />
            </div>
            <Button type="submit" disabled={loading || !fullName.trim()}>
              {loading ? "Saving..." : "Continue"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleTeamSubmit} className="mt-8 flex flex-col gap-4">
            <div>
              <p className="text-lg font-semibold text-foreground">Name your team</p>
              <p className="text-sm text-muted-foreground mt-1">
                This is where you'll manage your artists.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. My Label"
                required
                autoFocus
              />
            </div>
            <Button type="submit" disabled={loading || !teamName.trim()}>
              {loading ? "Creating..." : "Get Started"}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
