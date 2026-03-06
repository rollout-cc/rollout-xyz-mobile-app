import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    // Use anon-key client with auth header for getClaims (ES256 compatible)
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) throw new Error(`Authentication error: ${userError?.message || "Auth session missing!"}`);
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get team_id from request body
    const body = await req.json().catch(() => ({}));
    const teamId = body.team_id;
    if (!teamId) throw new Error("team_id is required");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if there's an existing subscription record for this team
    const { data: sub } = await supabaseClient
      .from("team_subscriptions")
      .select("*")
      .eq("team_id", teamId)
      .single();

    // Grandfathered teams get permanent full access
    if (sub?.is_grandfathered) {
      logStep("Grandfathered team detected", { teamId });
      return new Response(JSON.stringify({
        plan: "icon",
        seat_limit: 15,
        status: "active",
        is_trialing: false,
        trial_days_left: 0,
        current_period_end: "2099-12-31T00:00:00Z",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!sub || !sub.stripe_subscription_id) {
      // No Stripe subscription — check if trial is still active
      const trialEndsAt = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null;
      const now = new Date();

      if (trialEndsAt && trialEndsAt > now) {
        const trialDaysLeft = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        logStep("Active trial found", { trialDaysLeft });
        return new Response(JSON.stringify({
          plan: "icon",
          seat_limit: 5,
          status: "trialing",
          is_trialing: true,
          trial_days_left: trialDaysLeft,
          current_period_end: trialEndsAt.toISOString(),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Trial expired or no trial, returning rising plan");
      return new Response(JSON.stringify({
        plan: "rising",
        seat_limit: 1,
        status: "active",
        is_trialing: false,
        trial_days_left: 0,
        current_period_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Fetch the actual subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    logStep("Stripe subscription fetched", { status: subscription.status });

    const isActive = ["active", "trialing"].includes(subscription.status);
    const isTrialing = subscription.status === "trialing";
    const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
    const trialDaysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
    const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

    // Determine seat limit from the product
    const productId = subscription.items.data[0]?.price?.product as string;
    let seatLimit = 1;
    let plan = "rising";

    // Map product IDs to plans
    const PRODUCT_MAP: Record<string, { plan: string; seats: number }> = {
      "prod_U5CIvGZDhdaGnx": { plan: "icon", seats: 5 },
      "prod_U5CZIYD0Nmn0ty": { plan: "icon", seats: 10 },
      "prod_U5CfH5aXZPJHUm": { plan: "icon", seats: 15 },
    };

    if (PRODUCT_MAP[productId]) {
      plan = PRODUCT_MAP[productId].plan;
      seatLimit = PRODUCT_MAP[productId].seats;
    }

    // Update the local subscription record
    const updateStatus = isActive ? (isTrialing ? "trialing" : "active") : subscription.status;
    await supabaseClient
      .from("team_subscriptions")
      .update({
        plan,
        seat_limit: seatLimit,
        status: updateStatus,
        trial_ends_at: trialEnd?.toISOString() || null,
        current_period_end: periodEnd,
      })
      .eq("team_id", teamId);

    logStep("Subscription synced", { plan, seatLimit, status: updateStatus });

    return new Response(JSON.stringify({
      plan,
      seat_limit: seatLimit,
      status: updateStatus,
      is_trialing: isTrialing,
      trial_days_left: trialDaysLeft,
      current_period_end: periodEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
