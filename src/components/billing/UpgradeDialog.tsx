import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { PLAN_TIERS, ICON_TIERS } from "@/lib/plans";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useState } from "react";
import { CheckoutSheet } from "./CheckoutSheet";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

export function UpgradeDialog({ open, onOpenChange, feature }: UpgradeDialogProps) {
  const { selectedTeamId } = useSelectedTeam();
  const [checkoutTier, setCheckoutTier] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const handleUpgrade = (tier: string) => {
    setCheckoutTier(tier);
    setCheckoutOpen(true);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Upgrade to Icon
            </DialogTitle>
            <DialogDescription>
              {feature
                ? `${feature} is available on the Icon plan. Upgrade to unlock all features including team collaboration.`
                : "Unlock unlimited artists, tasks, team members, splits, and more with Icon."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {ICON_TIERS.map((tierKey) => {
              const tier = PLAN_TIERS[tierKey];
              return (
                <div
                  key={tierKey}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-foreground/20 transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {tier.name} {tier.seats}
                    </p>
                    <p className="text-sm text-muted-foreground">{tier.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-foreground">
                      ${tier.price}/mo
                    </span>
                    <Button size="sm" onClick={() => handleUpgrade(tierKey)}>
                      Start Trial
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-2">
            All plans include a 30-day free trial. Cancel anytime.
          </p>
        </DialogContent>
      </Dialog>

      <CheckoutSheet
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        tier={checkoutTier}
        teamId={selectedTeamId!}
      />
    </>
  );
}
