import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTeamPlan } from "@/hooks/useTeamPlan";
import { PLAN_TIERS, ICON_TIERS } from "@/lib/plans";
import { UpgradeDialog } from "@/components/billing/UpgradeDialog";
import { LegendContactDialog } from "@/components/billing/LegendContactDialog";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { toast } from "sonner";
import { Check, Crown, Sparkles, Rocket, Clock } from "lucide-react";

export function PlanTab() {
  const { plan, seatLimit, isTrialing, trialDaysLeft, isPaid, tierKey, refetch } = useTeamPlan();
  const { selectedTeamId } = useSelectedTeam();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (tier: string) => {
    setLoading(tier);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { tier, team_id: selectedTeamId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setLoading("portal");
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to open billing portal");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-foreground mb-1">Plan</h2>
        <p className="text-sm text-muted-foreground">
          {isTrialing
            ? `You're on a free trial of Icon with ${trialDaysLeft} days remaining.`
            : isPaid
            ? `You're on the ${PLAN_TIERS[tierKey as keyof typeof PLAN_TIERS]?.name ?? "Icon"} plan with ${seatLimit} seats.`
            : "You're on the free Rising plan."}
        </p>
      </div>

      {/* Trial banner */}
      {isTrialing && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <Clock className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left in your free trial
            </p>
            <p className="text-xs text-muted-foreground">
              All Icon features are unlocked. Subscribe before your trial ends to keep access.
            </p>
          </div>
          <Button size="sm" onClick={() => setUpgradeOpen(true)}>
            Upgrade Now
          </Button>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Rising */}
        <div
          className={`relative rounded-lg border p-5 ${
            plan === "rising" && !isPaid && !isTrialing
              ? "border-foreground bg-secondary/50"
              : "border-border"
          }`}
        >
          {plan === "rising" && !isPaid && !isTrialing && (
            <span className="absolute -top-2.5 left-4 bg-foreground text-background text-xs font-medium px-2 py-0.5 rounded-full">
              Current
            </span>
          )}
          <div className="flex items-center gap-2 mb-3">
            <Rocket className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Rising</h3>
          </div>
          <p className="text-2xl font-bold text-foreground mb-1">Free</p>
          <p className="text-xs text-muted-foreground mb-4">Solo user, limited features</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 mt-0.5 text-foreground shrink-0" /> 3 roster artists</li>
            <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 mt-0.5 text-foreground shrink-0" /> 2 A&R prospects</li>
            <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 mt-0.5 text-foreground shrink-0" /> 10 tasks/month</li>
            <li className="flex items-start gap-1.5 text-destructive/70"><span className="h-3.5 w-3.5 mt-0.5 shrink-0 text-center">✕</span> No team members</li>
            <li className="flex items-start gap-1.5 text-destructive/70"><span className="h-3.5 w-3.5 mt-0.5 shrink-0 text-center">✕</span> No splits or finance</li>
          </ul>
        </div>

        {/* Icon */}
        <div
          className={`relative rounded-lg border p-5 ${
            (isPaid && plan === "icon") || isTrialing
              ? "border-foreground bg-secondary/50"
              : "border-border"
          }`}
        >
          {((isPaid && plan === "icon") || isTrialing) && (
            <span className="absolute -top-2.5 left-4 bg-foreground text-background text-xs font-medium px-2 py-0.5 rounded-full">
              {isTrialing ? "Trial" : "Current"}
            </span>
          )}
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Icon</h3>
          </div>
          <p className="text-2xl font-bold text-foreground mb-1">
            From $45<span className="text-sm font-normal text-muted-foreground">/mo</span>
          </p>
          <p className="text-xs text-muted-foreground mb-4">All features, team collaboration</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground mb-4">
            <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 mt-0.5 text-foreground shrink-0" /> Unlimited artists & tasks</li>
            <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 mt-0.5 text-foreground shrink-0" /> <strong className="text-foreground">Add team members</strong></li>
            <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 mt-0.5 text-foreground shrink-0" /> Splits & finance tools</li>
            <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 mt-0.5 text-foreground shrink-0" /> Team roles & permissions</li>
            <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 mt-0.5 text-foreground shrink-0" /> 30-day free trial</li>
          </ul>

          {(!isPaid || isTrialing) && (
            <div className="space-y-2">
              {ICON_TIERS.map((t) => {
                const info = PLAN_TIERS[t];
                return (
                  <Button
                    key={t}
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => handleUpgrade(t)}
                    disabled={loading !== null}
                  >
                    <span>{info.seats} seats</span>
                    <span className="font-semibold">${info.price}/mo</span>
                  </Button>
                );
              })}
            </div>
          )}

          {isPaid && plan === "icon" && !isTrialing && (
            <Button variant="outline" size="sm" onClick={handleManageBilling} disabled={loading !== null}>
              Manage Subscription
            </Button>
          )}
        </div>

        {/* Legend */}
        <div className="relative rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Legend</h3>
          </div>
          <p className="text-2xl font-bold text-foreground mb-1">Custom</p>
          <p className="text-xs text-muted-foreground mb-4">Enterprise-grade support</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground mb-4">
            <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 mt-0.5 text-foreground shrink-0" /> 15+ team seats</li>
            <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 mt-0.5 text-foreground shrink-0" /> Dedicated support</li>
            <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 mt-0.5 text-foreground shrink-0" /> Custom APIs & integrations</li>
          </ul>
          <Button variant="outline" size="sm" onClick={() => setLegendOpen(true)}>
            Contact Us
          </Button>
        </div>
      </div>

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      <LegendContactDialog open={legendOpen} onOpenChange={setLegendOpen} />
    </div>
  );
}
