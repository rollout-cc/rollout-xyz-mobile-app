import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Check, AlertTriangle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { jobTitleToPersona, type PermissionFlags } from "@/components/settings/PermissionToggles";

interface AssignedArtist {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface InviteeOnboardingProps {
  teamId: string;
  userId: string;
  teamName: string;
  teamAvatar: string | null;
  jobTitle: string;
  permissions: PermissionFlags;
  assignedArtists: AssignedArtist[];
  allRosterArtists: AssignedArtist[];
  assistsUserName?: string | null;
  onComplete: () => void;
}

type QualifyingQuestion = {
  id: string;
  label: string;
  permKey?: keyof PermissionFlags;
};

function getQuestionsForTitle(jobTitle: string, assistsUserName?: string | null): QualifyingQuestion[] {
  const persona = jobTitleToPersona(jobTitle);

  if (["Artist Manager", "Senior Manager", "Tour Manager", "Business Manager"].includes(jobTitle) || persona === "management") {
    return [
      { id: "handles_budgets", label: "Do you handle budgets or finances?", permKey: "perm_view_finance" },
      { id: "manages_staff", label: "Do you manage staff or payroll?", permKey: "perm_view_staff_salaries" },
      { id: "distributes", label: "Are you involved in distributing music?", permKey: "perm_distribution" },
      { id: "works_ar", label: "Do you work with A&R?", permKey: "perm_view_ar" },
      { id: "marketing", label: "Do you manage marketing campaigns?" },
    ];
  }

  if (["A&R Coordinator", "A&R Manager", "Head of A&R"].includes(jobTitle) || persona === "ar") {
    return [
      { id: "staff_or_consultant", label: "Are you staff A&R or a consultant?" },
      { id: "deal_paperwork", label: "Do you handle deal paperwork?", permKey: "perm_distribution" },
      { id: "artist_budgets", label: "Do you need to see artist budgets?", permKey: "perm_view_finance" },
    ];
  }

  if (["Operations Manager", "Chief of Staff", "COO"].includes(jobTitle) || persona === "operations") {
    return [
      { id: "main_focus", label: "What's your main focus? (Project Mgmt / Marketing / Finance / General)" },
      { id: "handles_staff", label: "Do you handle staff or payroll?", permKey: "perm_view_staff_salaries" },
      { id: "distributes", label: "Are you involved in distributing music?", permKey: "perm_distribution" },
      { id: "invoices_vendors", label: "Do you manage invoices or vendor payments?", permKey: "perm_manage_finance" },
    ];
  }

  if (jobTitle === "Executive Assistant") {
    return [
      { id: "confirm_assist", label: `You'll be assisting ${assistsUserName || "your executive"}. Confirm?` },
      { id: "own_ops", label: "Do you handle any operational tasks on your own?" },
      { id: "calendar", label: "Do you manage your exec's calendar?" },
    ];
  }

  // Artist / default
  return [
    { id: "see_splits", label: "Do you want to see splits?", permKey: "perm_distribution" },
    { id: "track_expenses", label: "Do you want to track expenses?", permKey: "perm_view_finance" },
    { id: "manage_timelines", label: "Do you want to manage release timelines?" },
  ];
}

export function InviteeOnboarding({
  teamId,
  userId,
  teamName,
  teamAvatar,
  jobTitle,
  permissions,
  assignedArtists,
  allRosterArtists,
  assistsUserName,
  onComplete,
}: InviteeOnboardingProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>(
    assignedArtists.map((a) => a.id)
  );
  const [submitting, setSubmitting] = useState(false);

  const assignedIds = useMemo(() => new Set(assignedArtists.map((a) => a.id)), [assignedArtists]);
  const questions = useMemo(() => getQuestionsForTitle(jobTitle, assistsUserName), [jobTitle, assistsUserName]);

  // Detect mismatches: user said yes but doesn't have the permission
  const mismatches = useMemo(() => {
    const results: { question: string; permKey: keyof PermissionFlags }[] = [];
    for (const q of questions) {
      if (q.permKey && answers[q.id] === true && !permissions[q.permKey]) {
        results.push({ question: q.label, permKey: q.permKey });
      }
    }
    return results;
  }, [answers, permissions, questions]);

  const requestedArtists = useMemo(
    () => selectedArtistIds.filter((id) => !assignedIds.has(id)),
    [selectedArtistIds, assignedIds]
  );

  const hasMismatches = mismatches.length > 0 || requestedArtists.length > 0;

  const toggleArtist = (id: string) => {
    setSelectedArtistIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmitRequests = async () => {
    setSubmitting(true);
    try {
      // Insert permission upgrade requests
      for (const m of mismatches) {
        await supabase.from("access_requests").insert({
          team_id: teamId,
          requester_id: userId,
          request_type: "permission_upgrade",
          detail: { permission: m.permKey, question: m.question },
        });
      }

      // Insert artist access requests
      for (const artistId of requestedArtists) {
        const artist = allRosterArtists.find((a) => a.id === artistId);
        await supabase.from("access_requests").insert({
          team_id: teamId,
          requester_id: userId,
          request_type: "artist_access",
          detail: { artist_id: artistId, artist_name: artist?.name || "Unknown" },
        });
      }

      // Notify team owner
      if (mismatches.length > 0 || requestedArtists.length > 0) {
        await supabase.functions.invoke("send-notification", {
          body: {
            team_id: teamId,
            type: "access_request",
            title: "New access request",
            body: `A team member has requested additional permissions or artist access.`,
          },
        }).catch(() => {/* silent */});
      }

      toast.success("Requests submitted to your team admin!");
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit requests");
    } finally {
      setSubmitting(false);
    }
  };

  const stepContent = () => {
    switch (step) {
      case 1:
        return (
          <motion.div key="welcome" className="flex flex-col items-center gap-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Avatar className="h-16 w-16">
              <AvatarImage src={teamAvatar ?? undefined} />
              <AvatarFallback className="text-2xl bg-muted text-muted-foreground">{teamName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-lg font-semibold text-[hsl(40,30%,95%)]">
                You've been invited as <span className="text-primary">{jobTitle}</span>
              </p>
              <p className="text-sm text-[hsl(0,0%,55%)] mt-1">at {teamName}</p>
            </div>
            <Button
              onClick={() => setStep(2)}
              className="h-12 w-full rounded-full bg-[hsl(40,30%,95%)] text-[hsl(0,0%,5%)] hover:bg-[hsl(40,30%,90%)] font-medium"
            >
              Let's get started <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </motion.div>
        );

      case 2:
        return (
          <motion.div key="questions" className="flex flex-col gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div>
              <p className="text-lg font-semibold text-[hsl(40,30%,95%)]">A few quick questions</p>
              <p className="text-sm text-[hsl(0,0%,55%)] mt-1">Help us tailor your experience.</p>
            </div>
            <div className="space-y-2">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between rounded-lg border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,12%)] px-4 py-3"
                >
                  <p className="text-sm text-[hsl(40,30%,90%)] pr-3">{q.label}</p>
                  <Switch
                    checked={answers[q.id] ?? false}
                    onCheckedChange={(checked) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: checked }))
                    }
                  />
                </div>
              ))}
            </div>
            <Button
              onClick={() => setStep(3)}
              className="h-12 w-full rounded-full bg-[hsl(40,30%,95%)] text-[hsl(0,0%,5%)] hover:bg-[hsl(40,30%,90%)] font-medium"
            >
              Continue
            </Button>
          </motion.div>
        );

      case 3:
        return (
          <motion.div key="artists" className="flex flex-col gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div>
              <p className="text-lg font-semibold text-[hsl(40,30%,95%)]">Artist access</p>
              <p className="text-sm text-[hsl(0,0%,55%)] mt-1">
                Pre-assigned artists are checked. Select others to request access.
              </p>
            </div>
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
              {allRosterArtists.map((artist) => {
                const isAssigned = assignedIds.has(artist.id);
                const isSelected = selectedArtistIds.includes(artist.id);
                return (
                  <button
                    key={artist.id}
                    onClick={() => toggleArtist(artist.id)}
                    className={cn(
                      "flex items-center gap-3 w-full p-3 rounded-lg border transition-colors text-left",
                      isSelected
                        ? "border-primary/50 bg-primary/5"
                        : "border-[hsl(0,0%,20%)] bg-[hsl(0,0%,12%)] hover:border-[hsl(0,0%,30%)]"
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={artist.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">{artist.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-[hsl(40,30%,90%)] flex-1">{artist.name}</span>
                    {isAssigned && (
                      <span className="text-[10px] text-[hsl(0,0%,50%)] mr-1">Assigned</span>
                    )}
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
              {allRosterArtists.length === 0 && (
                <p className="text-sm text-[hsl(0,0%,55%)] text-center py-4">No artists on the roster yet.</p>
              )}
            </div>
            <Button
              onClick={() => setStep(4)}
              className="h-12 w-full rounded-full bg-[hsl(40,30%,95%)] text-[hsl(0,0%,5%)] hover:bg-[hsl(40,30%,90%)] font-medium"
            >
              Continue
            </Button>
          </motion.div>
        );

      case 4:
        return (
          <motion.div key="review" className="flex flex-col gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {hasMismatches ? (
              <>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <p className="text-lg font-semibold text-[hsl(40,30%,95%)]">Access requests</p>
                </div>
                <p className="text-sm text-[hsl(0,0%,55%)]">
                  Some things you need aren't in your current permissions. We'll send a request to your team admin.
                </p>
                <div className="space-y-1.5">
                  {mismatches.map((m) => (
                    <div key={m.permKey} className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <p className="text-xs text-[hsl(40,30%,85%)]">{m.question}</p>
                    </div>
                  ))}
                  {requestedArtists.map((id) => {
                    const artist = allRosterArtists.find((a) => a.id === id);
                    return (
                      <div key={id} className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <p className="text-xs text-[hsl(40,30%,85%)]">
                          Requesting access to <span className="font-medium">{artist?.name}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
                <Button
                  onClick={handleSubmitRequests}
                  disabled={submitting}
                  className="h-12 w-full rounded-full bg-[hsl(40,30%,95%)] text-[hsl(0,0%,5%)] hover:bg-[hsl(40,30%,90%)] font-medium"
                >
                  {submitting ? "Submitting..." : "Submit Requests & Continue"}
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-emerald-400" />
                  <p className="text-lg font-semibold text-[hsl(40,30%,95%)]">You're all set!</p>
                </div>
                <p className="text-sm text-[hsl(0,0%,55%)]">
                  Your permissions match your needs. Let's get started.
                </p>
                <Button
                  onClick={onComplete}
                  className="h-12 w-full rounded-full bg-[hsl(40,30%,95%)] text-[hsl(0,0%,5%)] hover:bg-[hsl(40,30%,90%)] font-medium"
                >
                  Get Started
                </Button>
              </>
            )}
          </motion.div>
        );
    }
  };

  return (
    <AnimatePresence mode="wait">
      {stepContent()}
    </AnimatePresence>
  );
}
