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

    const { invoice_id } = await req.json();
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "invoice_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: invoice, error: invErr } = await adminClient
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!invoice.recipient_email) {
      return new Response(JSON.stringify({ error: "Invoice has no recipient email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: lineItems } = await adminClient
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", invoice_id)
      .order("sort_order");

    const { data: team } = await adminClient.from("teams").select("name").eq("id", invoice.team_id).single();
    const teamName = team?.name || "Your team";

    const fmt = (n: number) => `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const lineItemsHtml = (lineItems || []).map((li: any) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px;">${li.description}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; text-align: center;">${li.quantity}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; text-align: right;">${fmt(li.unit_price)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; text-align: right;">${fmt(li.amount)}</td>
      </tr>
    `).join("");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${teamName} via Rollout <accounts@rollout.cc>`,
        to: invoice.recipient_email,
        subject: `Invoice ${invoice.invoice_number} from ${teamName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 32px;">
              <img src="https://rollout-cc.lovable.app/rollout-flag.png" alt="Rollout" style="height: 36px;" />
            </div>
            <div style="border: 1px solid #e5e5e5; border-radius: 12px; overflow: hidden;">
              <div style="padding: 24px; border-bottom: 1px solid #e5e5e5;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <h1 style="font-size: 22px; font-weight: 700; color: #0d0d0d; margin: 0 0 4px;">Invoice ${invoice.invoice_number}</h1>
                    <p style="font-size: 13px; color: #888; margin: 0;">From ${teamName}</p>
                  </div>
                </div>
                <div style="margin-top: 16px; display: flex; gap: 32px;">
                  <div><p style="font-size: 11px; color: #888; margin: 0;">Issue Date</p><p style="font-size: 13px; color: #0d0d0d; margin: 2px 0 0;">${invoice.issue_date}</p></div>
                  ${invoice.due_date ? `<div><p style="font-size: 11px; color: #888; margin: 0;">Due Date</p><p style="font-size: 13px; color: #0d0d0d; margin: 2px 0 0;">${invoice.due_date}</p></div>` : ""}
                </div>
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #fafafa;">
                    <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; color: #888; text-align: left; font-weight: 600;">Description</th>
                    <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; color: #888; text-align: center; font-weight: 600;">Qty</th>
                    <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; color: #888; text-align: right; font-weight: 600;">Price</th>
                    <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; color: #888; text-align: right; font-weight: 600;">Amount</th>
                  </tr>
                </thead>
                <tbody>${lineItemsHtml}</tbody>
              </table>
              <div style="padding: 16px 12px; border-top: 2px solid #0d0d0d; text-align: right;">
                ${invoice.tax_rate > 0 ? `<p style="font-size: 13px; color: #555; margin: 0 0 4px;">Subtotal: ${fmt(invoice.subtotal)}</p><p style="font-size: 13px; color: #555; margin: 0 0 8px;">Tax (${invoice.tax_rate}%): ${fmt(invoice.subtotal * invoice.tax_rate / 100)}</p>` : ""}
                <p style="font-size: 18px; font-weight: 700; color: #0d0d0d; margin: 0;">Total: ${fmt(invoice.total)}</p>
              </div>
              ${invoice.notes ? `<div style="padding: 16px 12px; border-top: 1px solid #eee;"><p style="font-size: 12px; color: #666; margin: 0;">${invoice.notes}</p></div>` : ""}
            </div>
            <p style="font-size: 11px; color: #bbb; margin-top: 24px; text-align: center;">
              Sent via <a href="https://rollout.cc" style="color: #bbb;">Rollout</a>
            </p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Resend error:", errText);
      return new Response(JSON.stringify({ error: "Failed to send invoice" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update status to sent
    await adminClient.from("invoices").update({ status: "sent" }).eq("id", invoice_id);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("send-invoice error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
