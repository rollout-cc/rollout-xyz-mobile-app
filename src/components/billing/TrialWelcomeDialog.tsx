import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Rocket } from "lucide-react";
import { UpgradeDialog } from "@/components/billing/UpgradeDialog";

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

const FREE_FEATURES = [
  "3 roster artists",
  "10 tasks/month",
  "2 A&R prospects",
];

export function TrialWelcomeDialog({ open, onOpenChange }: TrialWelcomeDialogProps) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const handleStartTrial = () => {
    onOpenChange(false);
  };

  const handleUseFree = () => {
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row">
            {/* Left side — trial offer */}
            <div className="flex-1 p-6 sm:p-8">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Try Rollout free for 30 days
                </DialogTitle>
              </DialogHeader>

              <p className="text-sm text-muted-foreground mb-6">
                Get full access to every feature — no credit card required. See how Rollout can transform how you manage your roster.
              </p>

              <div className="space-y-4 mb-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  What's included
                </p>
                <ul className="space-y-2">
                  {TRIAL_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                onClick={handleStartTrial}
                className="w-full rounded-lg h-11 font-medium"
              >
                Start My Free Trial
              </Button>

              <p className="text-[11px] text-muted-foreground text-center mt-2">
                All features. 30 days free. No credit card needed.
              </p>
            </div>

            {/* Right side — free tier comparison */}
            <div className="flex-1 bg-muted/30 border-t sm:border-t-0 sm:border-l border-border p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-4">
                <Rocket className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground text-sm">Or continue with the free plan</h3>
              </div>

              <p className="text-xs text-muted-foreground mb-4">
                The Rising plan is free forever, but comes with limitations:
              </p>

              <ul className="space-y-2 mb-6">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="rounded-lg border border-border bg-background p-3 mb-4">
                <p className="text-xs font-medium text-foreground mb-1">🚫 Not included on free plan</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>• Team members & collaboration</li>
                  <li>• Splits & finance tracking</li>
                  <li>• Advanced permissions</li>
                </ul>
              </div>

              <Button
                variant="outline"
                onClick={handleUseFree}
                className="w-full rounded-lg"
                size="sm"
              >
                Use Free Version
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
}
