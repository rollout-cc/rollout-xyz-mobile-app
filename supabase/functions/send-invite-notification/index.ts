const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const flagUrl = 'https://ctnsworqzzguykzzvdme.supabase.co/storage/v1/object/public/email-assets/rollout-flag.svg';
const wordmarkUrl = 'https://ctnsworqzzguykzzvdme.supabase.co/storage/v1/object/public/email-assets/rollout-logo.png';

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, email, phone, team_name, invitee_name, role } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inviteUrl = `https://rollout.cc/join/${token}`;

    if (!email) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Invite link generated for ${phone || "unknown"}`,
          url: inviteUrl,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const firstName = invitee_name?.split(" ")[0] || "";
    const roleLabel = role || "member";

    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:Switzer,Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#e8e4dc;">
        <tr><td style="padding:48px 40px;">
          <img src="${flagUrl}" alt="Rollout" height="40" style="height:40px;margin-bottom:24px;display:block;" />
          <h1 style="font-size:28px;font-weight:bold;color:#0d0d0d;margin:0 0 16px;line-height:1.2;">It's time to get organized.</h1>
          <p style="font-size:16px;color:#0d0d0d;line-height:1.5;margin:0 0 16px;">
            You've been invited to join the team <strong>${team_name || "a team"}</strong> on Rollout and granted access as <strong>${roleLabel}</strong>.
          </p>
          <p style="font-size:16px;color:#0d0d0d;line-height:1.5;margin:0 0 24px;">
            Click the button below to create and verify your Rollout account and begin creating and assigning tasks.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="background-color:#0d0d0d;border-radius:9999px;padding:14px 32px;">
              <a href="${inviteUrl}" target="_blank" style="color:#f2ead9;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">
                Join Team
              </a>
            </td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #c4c0b8;margin:32px 0;" />
          <p style="font-size:14px;color:#666666;line-height:1.5;margin:0 0 8px;">
            For any questions or issues please email <a href="mailto:support@rollout.cc" style="color:#0d0d0d;font-weight:bold;text-decoration:none;">support@rollout.cc</a>
          </p>
          <img src="${wordmarkUrl}" alt="ROLLOUT" height="32" style="height:32px;margin-top:24px;" />
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Rollout <accounts@rollout.cc>",
        to: [email],
        subject: `You've been invited to join ${team_name || "a team"} on Rollout`,
        html: htmlBody,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend API error:", resendData);
      throw new Error(resendData.message || "Failed to send email via Resend");
    }

    console.log("Email sent successfully:", resendData.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invite email sent to ${email}`,
        url: inviteUrl,
        email_id: resendData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("send-invite-notification error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
