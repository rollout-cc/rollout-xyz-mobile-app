import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, legal_name, business_name, federal_tax_classification, llc_classification, exempt_payee_code, fatca_exemption_code, address_line1, address_line2, city, state, zip, tin_type, tin, signature_name, payment_method, bank_routing, bank_account, paypal_email, venmo_handle } = await req.json();

    if (!token || !legal_name || !federal_tax_classification || !address_line1 || !city || !state || !zip || !tin_type || !tin || !signature_name || !payment_method) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find vendor by token
    const { data: vendor, error: vendorErr } = await adminClient
      .from("vendors")
      .select("id, w9_status")
      .eq("w9_token", token)
      .single();

    if (vendorErr || !vendor) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (vendor.w9_status === "completed") {
      return new Response(JSON.stringify({ error: "W-9 already submitted" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const tinLastFour = tin.replace(/[^0-9]/g, "").slice(-4);

    // Store W-9 data
    const { error: w9Err } = await adminClient.from("vendor_w9_data").insert({
      vendor_id: vendor.id,
      legal_name,
      business_name: business_name || null,
      federal_tax_classification,
      llc_classification: llc_classification || null,
      exempt_payee_code: exempt_payee_code || null,
      fatca_exemption_code: fatca_exemption_code || null,
      address_line1,
      address_line2: address_line2 || null,
      city,
      state,
      zip,
      tin_type,
      tin_last_four: tinLastFour,
      tin_encrypted: tin, // stored at rest via Supabase encryption
      signature_name,
      signature_date: new Date().toISOString().split("T")[0],
      payment_method,
      bank_routing_encrypted: bank_routing || null,
      bank_account_encrypted: bank_account || null,
      paypal_email: paypal_email || null,
      venmo_handle: venmo_handle || null,
    });

    if (w9Err) {
      console.error("W-9 insert error:", w9Err);
      return new Response(JSON.stringify({ error: "Failed to save W-9 data" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update vendor status
    await adminClient.from("vendors").update({
      w9_status: "completed",
      w9_completed_at: new Date().toISOString(),
    }).eq("id", vendor.id);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("submit-vendor-w9 error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
