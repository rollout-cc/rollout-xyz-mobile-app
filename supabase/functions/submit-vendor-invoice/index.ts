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
    const { token, description, amount, invoice_date, due_date, notes } = await req.json();

    if (!token || !description || !amount || !invoice_date) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find vendor by w9_token
    const { data: vendor, error: vendorErr } = await adminClient
      .from("vendors")
      .select("id, team_id, name, w9_status, invoice_artist_id, invoice_payment_terms")
      .eq("w9_token", token)
      .single();

    if (vendorErr || !vendor) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired link" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (vendor.w9_status !== "completed") {
      return new Response(
        JSON.stringify({ error: "Please complete your W-9 before submitting an invoice" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate PO number
    const { data: poData } = await adminClient.rpc("next_po_number", { p_team_id: vendor.team_id });
    const poNumber = poData || "PO-0001";

    // Insert vendor invoice
    const { error: insertErr } = await adminClient.from("vendor_invoices").insert({
      vendor_id: vendor.id,
      team_id: vendor.team_id,
      artist_id: vendor.invoice_artist_id,
      po_number: poNumber,
      payment_terms: vendor.invoice_payment_terms || "net_30",
      description,
      amount: Math.abs(parseFloat(amount)),
      invoice_date,
      due_date: due_date || null,
      notes: notes || null,
      status: "pending",
    });

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to submit invoice" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, po_number: poNumber }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("submit-vendor-invoice error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
