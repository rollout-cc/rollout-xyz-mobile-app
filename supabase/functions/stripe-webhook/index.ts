import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Product to plan mapping
const PRODUCT_MAP: Record<string, { plan: string; seats: number }> = {
  "prod_U5CIvGZDhdaGnx": { plan: "icon", seats: 5 },
  "prod_U5CZIYD0Nmn0ty": { plan: "icon", seats: 10 },
  "prod_U5CfH5aXZPJHUm": { plan: "icon", seats: 15 },
};

serve(async (req) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response("STRIPE_SECRET_KEY not set", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();

    // Try to verify webhook signature if available
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;
    if (sig && webhookSecret) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
      logStep("WARNING: No webhook signature verification");
    }

    logStep("Event received", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const teamId = session.metadata?.team_id;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (!teamId) {
          logStep("No team_id in metadata, skipping");
          break;
        }

        // Fetch the subscription to get product details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const productId = subscription.items.data[0]?.price?.product as string;
        const mapping = PRODUCT_MAP[productId] || { plan: "icon", seats: 5 };

        const isTrialing = subscription.status === "trialing";
        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null;
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

        await supabase
          .from("team_subscriptions")
          .upsert({
            team_id: teamId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan: mapping.plan,
            seat_limit: mapping.seats,
            status: isTrialing ? "trialing" : "active",
            trial_ends_at: trialEnd,
            current_period_end: periodEnd,
          }, { onConflict: "team_id" });

        logStep("Subscription activated", { teamId, plan: mapping.plan, seats: mapping.seats });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const teamId = subscription.metadata?.team_id;

        if (!teamId) {
          logStep("No team_id in subscription metadata, skipping");
          break;
        }

        const productId = subscription.items.data[0]?.price?.product as string;
        const mapping = PRODUCT_MAP[productId] || { plan: "icon", seats: 5 };
        const isTrialing = subscription.status === "trialing";
        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null;
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

        let status = subscription.status;
        if (status === "trialing") status = "trialing";
        else if (status === "active") status = "active";
        else if (status === "past_due") status = "past_due";
        else if (status === "canceled" || status === "unpaid") status = "canceled";

        await supabase
          .from("team_subscriptions")
          .update({
            plan: status === "canceled" ? "rising" : mapping.plan,
            seat_limit: status === "canceled" ? 1 : mapping.seats,
            status,
            trial_ends_at: trialEnd,
            current_period_end: periodEnd,
          })
          .eq("team_id", teamId);

        logStep("Subscription updated", { teamId, status, plan: mapping.plan });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const teamId = subscription.metadata?.team_id;

        if (!teamId) {
          logStep("No team_id in subscription metadata, skipping");
          break;
        }

        await supabase
          .from("team_subscriptions")
          .update({
            plan: "rising",
            seat_limit: 1,
            status: "canceled",
            stripe_subscription_id: null,
            trial_ends_at: null,
            current_period_end: null,
          })
          .eq("team_id", teamId);

        logStep("Subscription deleted, downgraded to rising", { teamId });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice paid", { invoiceId: invoice.id, amount: invoice.amount_paid });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
