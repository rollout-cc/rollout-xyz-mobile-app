import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Ban, Check, Sparkles, Sprout } from "lucide-react";

interface TrialWelcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TRIAL_FEATURES = [
  "Unlimited artists & tasks",
  "Add team members",
  "Splits & finance tools",
  "A&R pipeline",
  "Team roles & permissions",
];

const FREE_FEATURES = ["3 roster artists", "10 tasks/month", "2 A&R prospects"];

const FREE_EXCLUDED = [
  "Team members & collaboration",
  "Splits & finance tracking",
  "Advanced permissions",
];

const sectionLabelClass =
  "border-0 text-[11px] font-bold uppercase tracking-widest text-muted-foreground";

export function TrialWelcomeDialog({ open, onOpenChange }: TrialWelcomeDialogProps) {
  const handleStartTrial = () => {
    onOpenChange(false);
  };

  const handleUseFree = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="backdrop-blur-md supports-[backdrop-filter]:bg-black/35 bg-black/55"
        closeClassName="max-md:top-7 max-md:right-4 max-md:flex max-md:h-9 max-md:w-9 max-md:items-center max-md:justify-center max-md:rounded-full max-md:opacity-90"
        className={cn(
          "scroll-container w-full gap-0 border-border/60 bg-background p-0 shadow-2xl duration-300",
          "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:top-auto",
          "max-md:max-h-[min(92dvh,100%)] max-md:max-w-full max-md:translate-x-0 max-md:translate-y-0",
          "max-md:overflow-y-auto max-md:rounded-b-none max-md:rounded-t-[1.25rem] max-md:border-x-0 max-md:border-b-0",
          "md:left-[50%] md:top-[50%] md:max-w-[42rem] md:translate-x-[-50%] md:translate-y-[-50%] md:rounded-2xl",
        )}
      >
        <div
          className="flex shrink-0 justify-center pt-2 pb-0.5 md:hidden"
          aria-hidden
        >
          <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Trial */}
          <div className="flex flex-1 flex-col border-border/50 px-4 pb-5 pt-1 md:border-r md:bg-gradient-to-b md:from-background md:to-secondary/40 md:px-6 md:py-6">
            <DialogHeader className="mb-3 space-y-0 border-0 text-left">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 ring-1 ring-border/60">
                <Sparkles className="h-[1.125rem] w-[1.125rem] text-foreground" strokeWidth={1.75} />
              </div>
              <DialogTitle className="text-lg font-bold leading-snug tracking-tight text-foreground md:text-xl">
                Try Rollout free for 30 days
              </DialogTitle>
            </DialogHeader>

            <p className="mb-4 text-sm leading-snug text-muted-foreground">
              Full access to every feature — no credit card required. See how Rollout fits your roster
              workflow.
            </p>

            <div className="mb-4 space-y-2 border-0">
              <p className={sectionLabelClass}>What&apos;s included</p>
              <ul className="space-y-2">
                {TRIAL_FEATURES.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm leading-snug text-foreground">
                    <span className="mt-0.5 flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto space-y-2">
              <Button
                onClick={handleStartTrial}
                className="h-11 w-full rounded-xl text-sm font-semibold shadow-sm"
              >
                Start My Free Trial
              </Button>
              <p className="text-center text-[11px] leading-snug text-muted-foreground">
                All features · 30 days free · No credit card
              </p>
            </div>
          </div>

          {/* Free plan — same vertical rhythm as trial for alignment */}
          <div className="flex flex-1 flex-col px-4 pb-[max(1.25rem,var(--safe-area-inset-bottom))] pt-1 md:px-6 md:py-6 md:pb-6">
            <div className="rounded-xl border border-border/70 bg-muted/35 p-4 md:rounded-none md:border-0 md:bg-transparent md:p-0">
              <div className="mb-3 border-0">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-background ring-1 ring-border/60 md:bg-primary/5">
                  <Sprout className="h-[1.125rem] w-[1.125rem] text-muted-foreground" strokeWidth={1.75} />
                </div>
                <h3 className="text-lg font-bold leading-snug tracking-tight text-foreground md:text-xl">
                  Or continue with the free plan
                </h3>
                <p className="mt-1.5 text-sm leading-snug text-muted-foreground">
                  Rising is free forever with limits on roster size and advanced tools.
                </p>
              </div>

              <div className="mb-4 space-y-2 border-0">
                <p className={cn(sectionLabelClass, "mb-0")}>Included on Rising</p>
                <ul className="space-y-2">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm leading-snug text-muted-foreground">
                      <Check className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 text-foreground/35" strokeWidth={2} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-4 rounded-lg border border-border/80 bg-background/80 p-3">
                <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-foreground">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                    <Ban className="h-3 w-3" strokeWidth={2} />
                  </span>
                  Not included on free plan
                </p>
                <ul className="space-y-1 text-xs leading-snug text-muted-foreground">
                  {FREE_EXCLUDED.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <Button
                variant="outline"
                onClick={handleUseFree}
                className="h-11 w-full rounded-xl border-border/80 bg-background text-sm font-semibold hover:bg-muted/50"
              >
                Use Free Version
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
