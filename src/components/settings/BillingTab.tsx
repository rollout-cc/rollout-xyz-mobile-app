import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTeamPlan } from "@/hooks/useTeamPlan";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, ExternalLink } from "lucide-react";

export function BillingTab() {
  const { isPaid, isTrialing, trialDaysLeft, currentPeriodEnd } = useTeamPlan();
  const [loading, setLoading] = useState(false);

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to open billing portal");
    } finally {
      setLoading(false);
    }
  };

  if (!isPaid) {
    return (
      <div className="space-y-4">
        <h2 className="text-foreground">Billing</h2>
        <p className="text-sm text-muted-foreground">
          You're on the free Rising plan. Upgrade to Icon to access billing management.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-foreground">Billing</h2>

      <div className="rounded-lg border border-border p-5 max-w-lg space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {isTrialing ? "Trial Active" : "Active Subscription"}
            </p>
            <p className="text-sm text-muted-foreground">
              {isTrialing
                ? `${trialDaysLeft} days left in your free trial`
                : currentPeriodEnd
                ? `Next billing date: ${new Date(currentPeriodEnd).toLocaleDateString()}`
                : "Active subscription"}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleManageBilling}
          disabled={loading}
          className="w-full"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          {loading ? "Loading..." : "Manage Payment & Invoices"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Update your payment method, view invoices, or change your plan through the billing portal.
        </p>
      </div>
    </div>
  );
}
