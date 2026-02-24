import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateTeam } from "@/hooks/useTeams";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bell, Star, User, Hash, DollarSign, Link2, Bookmark, CalendarDays, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import rolloutLogo from "@/assets/rollout-logo.png";

const TOTAL_STEPS = 5;

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createTeam = useCreateTeam();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Data collected across steps
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("Owner");
  const [experience, setExperience] = useState("2-3 years");
  const [teamName, setTeamName] = useState("");
  const [teamSize, setTeamSize] = useState("1-5");
  const [revenue, setRevenue] = useState("less than $10,000");
  const [artistCount, setArtistCount] = useState("2-5");

  const canGoNext = () => {
    if (step === 1) return true;
    if (step === 2) return !!role && !!experience;
    if (step === 3) return !!teamName.trim();
    return true;
  };

  const handleNext = async () => {
    if (step === 2) {
      // Save profile name + role
      setLoading(true);
      try {
        const name = fullName.trim() || user?.user_metadata?.full_name || "User";
        await supabase.from("profiles").update({
          full_name: name,
          job_role: role,
        }).eq("id", user!.id);
      } catch (err: any) {
        toast.error(err.message);
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    if (step === 3) {
      // Create team
      setLoading(true);
      try {
        await createTeam.mutateAsync(teamName.trim());
      } catch (err: any) {
        toast.error(err.message);
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const handleFinish = () => {
    toast.success("You're all set!");
    navigate("/roster", { replace: true });
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className="flex items-center gap-2 text-sm font-medium text-foreground disabled:opacity-30 hover:opacity-70 transition-opacity"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="h-5 w-5 text-foreground" />
            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500" />
          </div>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[480px]"
          >
            {step === 1 && <StepWelcome />}
            {step === 2 && (
              <StepTailored
                fullName={fullName}
                setFullName={setFullName}
                role={role}
                setRole={setRole}
                experience={experience}
                setExperience={setExperience}
              />
            )}
            {step === 3 && (
              <StepTeam
                teamName={teamName}
                setTeamName={setTeamName}
                teamSize={teamSize}
                setTeamSize={setTeamSize}
                revenue={revenue}
                setRevenue={setRevenue}
                artistCount={artistCount}
                setArtistCount={setArtistCount}
              />
            )}
            {step === 4 && <StepOrganized />}
            {step === 5 && <StepTask />}

            {/* Footer */}
            <div className="flex items-center justify-between mt-8">
              <span className="text-sm text-muted-foreground">{step} of {TOTAL_STEPS}</span>
              {step < TOTAL_STEPS ? (
                <Button
                  onClick={handleNext}
                  disabled={loading || !canGoNext()}
                  className="bg-foreground text-background hover:bg-foreground/90 rounded-lg px-6"
                >
                  {loading ? "Saving..." : "Next"}
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  className="bg-foreground text-background hover:bg-foreground/90 rounded-lg px-6"
                >
                  Let's go
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Step 1: Welcome ── */
function StepWelcome() {
  return (
    <>
      <h1 className="text-3xl font-bold mb-3">Welcome on board</h1>
      <p className="text-muted-foreground leading-relaxed">
        Rollout makes it easier to manage your roster, track budgets, and organize key artist
        information—all to help you work more efficiently. Let us show you how it works.
      </p>
      <div className="mt-6 rounded-xl overflow-hidden bg-foreground aspect-[16/10] flex items-center justify-center">
        <img src={rolloutLogo} alt="Rollout" className="h-12 invert" />
      </div>
    </>
  );
}

/* ── Step 2: Tailored experience ── */
function StepTailored({
  fullName, setFullName, role, setRole, experience, setExperience,
}: {
  fullName: string; setFullName: (v: string) => void;
  role: string; setRole: (v: string) => void;
  experience: string; setExperience: (v: string) => void;
}) {
  return (
    <>
      <h1 className="text-3xl font-bold mb-3">Get a tailored experience</h1>
      <p className="text-muted-foreground leading-relaxed mb-6">
        First, tell us more about you, so we can adjust your experience to match your needs.
      </p>

      <div className="space-y-5">
        <div>
          <Label className="font-semibold text-sm mb-2 block">What's your name?</Label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            autoFocus
          />
        </div>

        <div>
          <Label className="font-semibold text-sm mb-2 block">What role do you play on your team?</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Owner">Owner</SelectItem>
              <SelectItem value="Manager">Manager</SelectItem>
              <SelectItem value="Artist">Artist</SelectItem>
              <SelectItem value="A&R">A&R</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="font-semibold text-sm mb-2 block">How many years of experience do you have in your position?</Label>
          <Select value={experience} onValueChange={setExperience}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Less than 1 year">Less than 1 year</SelectItem>
              <SelectItem value="1-2 years">1-2 years</SelectItem>
              <SelectItem value="2-3 years">2-3 years</SelectItem>
              <SelectItem value="3-5 years">3-5 years</SelectItem>
              <SelectItem value="5+ years">5+ years</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}

/* ── Step 3: Team details ── */
function StepTeam({
  teamName, setTeamName, teamSize, setTeamSize, revenue, setRevenue, artistCount, setArtistCount,
}: {
  teamName: string; setTeamName: (v: string) => void;
  teamSize: string; setTeamSize: (v: string) => void;
  revenue: string; setRevenue: (v: string) => void;
  artistCount: string; setArtistCount: (v: string) => void;
}) {
  return (
    <>
      <h1 className="text-3xl font-bold mb-3">Tell us more about your team</h1>
      <p className="text-muted-foreground leading-relaxed mb-6">
        Just a few more questions about your team.
      </p>

      <div className="space-y-5">
        <div>
          <Label className="font-semibold text-sm mb-2 block">What's your team or label name?</Label>
          <Input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g. My Label"
            autoFocus
          />
        </div>

        <div>
          <Label className="font-semibold text-sm mb-2 block">What is your team size?</Label>
          <Select value={teamSize} onValueChange={setTeamSize}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1-5">1-5</SelectItem>
              <SelectItem value="6-10">6-10</SelectItem>
              <SelectItem value="11-25">11-25</SelectItem>
              <SelectItem value="25+">25+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="font-semibold text-sm mb-2 block">What is your team's monthly revenue?</Label>
          <Select value={revenue} onValueChange={setRevenue}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="less than $10,000">less than $10,000</SelectItem>
              <SelectItem value="$10,000 - $50,000">$10,000 - $50,000</SelectItem>
              <SelectItem value="$50,000 - $100,000">$50,000 - $100,000</SelectItem>
              <SelectItem value="$100,000+">$100,000+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="font-semibold text-sm mb-2 block">How many artists does your team manage?</Label>
          <Select value={artistCount} onValueChange={setArtistCount}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2-5">2-5</SelectItem>
              <SelectItem value="6-10">6-10</SelectItem>
              <SelectItem value="10+">10+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}

/* ── Step 4: Get Organized ── */
function StepOrganized() {
  return (
    <>
      <h1 className="text-3xl font-bold mb-3">Get Organized</h1>
      <p className="text-muted-foreground leading-relaxed">
        Rollout helps keep your operations on track without the extra fluff. Get insights into
        everything important through a single screen.
      </p>
      <div className="mt-6 rounded-xl overflow-hidden bg-foreground aspect-[16/10] flex items-center justify-center">
        <img src={rolloutLogo} alt="Rollout" className="h-12 invert" />
      </div>
    </>
  );
}

/* ── Step 5: Start with a Task ── */
function StepTask() {
  return (
    <>
      <h1 className="text-3xl font-bold mb-3">Start with a Task</h1>
      <p className="text-muted-foreground leading-relaxed">
        Create tasks, assign people, campaigns, and expenses instantly. All from a single screen.
      </p>
      <div className="mt-6 rounded-xl overflow-hidden bg-muted/50 aspect-[16/10] p-6 flex flex-col justify-center">
        {/* Mock task input */}
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="h-5 w-5 rounded border-2 border-muted-foreground/30 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground/50">
                Task name (use @ to assign task, # to pick initiative)
              </p>
              <p className="text-xs text-muted-foreground/40 mt-1">Description</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 ml-8">
            {[Star, User, CalendarDays, Hash, DollarSign, Link2, Bookmark].map((Icon, i) => (
              <div key={i} className="h-7 w-7 rounded border border-border flex items-center justify-center">
                <Icon className="h-3.5 w-3.5 text-muted-foreground/40" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
