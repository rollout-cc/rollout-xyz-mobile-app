import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { vendor_id } = await req.json();
    if (!vendor_id) {
      return new Response(JSON.stringify({ error: "vendor_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: vendor, error: vendorErr } = await adminClient
      .from("vendors")
      .select("*")
      .eq("id", vendor_id)
      .single();

    if (vendorErr || !vendor) {
      return new Response(JSON.stringify({ error: "Vendor not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!vendor.email) {
      return new Response(JSON.stringify({ error: "Vendor has no email address" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get team info for branding
    const { data: team } = await adminClient.from("teams").select("name").eq("id", vendor.team_id).single();
    const teamName = team?.name || "Your team";

    const w9Url = `https://rollout-cc.lovable.app/vendor-w9/${vendor.w9_token}`;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Rollout <accounts@rollout.cc>",
        to: vendor.email,
        subject: `${teamName} needs your W-9 information`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <img src="https://rollout-cc.lovable.app/rollout-flag.png" alt="Rollout" style="height: 40px;" />
            </div>
            <h1 style="font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #0d0d0d;">W-9 Form Request</h1>
            <p style="font-size: 14px; line-height: 1.6; color: #555; margin-bottom: 24px;">
              <strong>${teamName}</strong> is requesting your W-9 tax information and payment details before processing your payment. Please complete the secure form below.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${w9Url}" style="display: inline-block; padding: 12px 32px; background: #0d0d0d; color: #f5f0e8; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
                Complete W-9 Form
              </a>
            </div>
            <p style="font-size: 12px; color: #999; margin-top: 32px; text-align: center;">
              Sent via <a href="https://rollout.cc" style="color: #999;">Rollout</a>
            </p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Resend error:", errText);
      return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update status to pending
    await adminClient.from("vendors").update({ w9_status: "pending" }).eq("id", vendor_id);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("send-vendor-w9-request error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
