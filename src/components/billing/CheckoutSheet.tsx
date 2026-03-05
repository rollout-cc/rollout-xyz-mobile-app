import { useState, useCallback, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import rolloutLogo from "@/assets/rollout-logo.png";

let stripePromise: ReturnType<typeof loadStripe> | null = null;

async function getStripePromise() {
  if (stripePromise) return stripePromise;
  const { data, error } = await supabase.functions.invoke("get-stripe-config");
  if (error || !data?.publishableKey) {
    console.error("Failed to load Stripe config", error);
    return null;
  }
  stripePromise = loadStripe(data.publishableKey);
  return stripePromise;
}

interface CheckoutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: string | null;
  teamId: string;
  onComplete?: () => void;
}

export function CheckoutSheet({ open, onOpenChange, tier, teamId, onComplete }: CheckoutSheetProps) {
  const [stripe, setStripe] = useState<Awaited<ReturnType<typeof loadStripe>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      getStripePromise().then((s) => setStripe(s));
    }
  }, [open]);

  const fetchClientSecret = useCallback(async () => {
    if (!tier) throw new Error("No tier selected");
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { tier, team_id: teamId, embedded: true },
    });
    if (error) throw error;
    if (!data?.clientSecret) throw new Error("No client secret returned");
    setLoading(false);
    return data.clientSecret;
  }, [tier, teamId]);

  const handleComplete = useCallback(() => {
    toast.success("Checkout complete! Your trial has started.");
    onComplete?.();
    onOpenChange(false);
  }, [onComplete, onOpenChange]);

  if (!stripe || !tier) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col overflow-y-auto">
        {/* Rollout branding header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3 mb-2">
            <img src={rolloutLogo} alt="Rollout" className="h-8 dark:invert" />
          </div>
          <p className="text-xs text-muted-foreground">
            Secure checkout powered by Stripe
          </p>
        </div>

        {/* Embedded Stripe Checkout */}
        <div className="flex-1 min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <EmbeddedCheckoutProvider
            stripe={stripe}
            options={{ fetchClientSecret, onComplete: handleComplete }}
          >
            <EmbeddedCheckout className="h-full" />
          </EmbeddedCheckoutProvider>
        </div>

        <div className="px-6 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            By subscribing you agree to Rollout's terms of service. Cancel anytime.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
