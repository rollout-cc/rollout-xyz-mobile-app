const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Send push notifications to a user's registered devices.
 * Accepts: { user_id, title, body, data? }
 * Queries push_tokens table and sends via APNs (iOS) or FCM (Android).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, data } = await req.json();

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "user_id and title required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.1");
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if user has push_enabled
    const { data: prefs } = await adminClient
      .from("notification_preferences")
      .select("push_enabled")
      .eq("user_id", user_id)
      .single();

    if (prefs && !prefs.push_enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "push disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all device tokens for the user
    const { data: tokens, error: tokensErr } = await adminClient
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", user_id);

    if (tokensErr || !tokens?.length) {
      return new Response(JSON.stringify({ skipped: true, reason: "no tokens" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { platform: string; success: boolean; error?: string }[] = [];

    for (const t of tokens) {
      if (t.platform === "ios") {
        const result = await sendAPNs(t.token, title, body || "", data);
        results.push({ platform: "ios", ...result });
      } else if (t.platform === "android") {
        const result = await sendFCM(t.token, title, body || "", data);
        results.push({ platform: "android", ...result });
      }
    }

    // Clean up invalid tokens
    const invalidTokens = results
      .filter((r) => !r.success && r.error === "invalid_token")
      .map((_, i) => tokens[i].token);

    if (invalidTokens.length > 0) {
      await adminClient
        .from("push_tokens")
        .delete()
        .eq("user_id", user_id)
        .in("token", invalidTokens);
    }

    console.log("[Push] Results:", JSON.stringify(results));

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Push] Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Send via Apple Push Notification service (APNs) using .p8 key
 */
async function sendAPNs(
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const keyP8 = Deno.env.get("APNS_KEY_P8");
  const keyId = Deno.env.get("APNS_KEY_ID");
  const teamId = Deno.env.get("APNS_TEAM_ID");
  const bundleId = "app.lovable.c232114e61894b4b9345b3f5a8174ff3";

  if (!keyP8 || !keyId || !teamId) {
    console.warn("[APNs] Missing credentials, skipping");
    return { success: false, error: "missing_credentials" };
  }

  try {
    // Decode base64 .p8 key
    const pemContents = atob(keyP8);

    // Create JWT for APNs
    const jwt = await createAPNsJWT(pemContents, keyId, teamId);

    const apnsUrl = `https://api.push.apple.com/3/device/${deviceToken}`;

    const payload = {
      aps: {
        alert: { title, body },
        sound: "default",
        badge: 1,
      },
      ...(data || {}),
    };

    const res = await fetch(apnsUrl, {
      method: "POST",
      headers: {
        Authorization: `bearer ${jwt}`,
        "apns-topic": bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 200) {
      return { success: true };
    }

    const errBody = await res.text();
    console.error("[APNs] Error:", res.status, errBody);

    if (res.status === 410 || res.status === 400) {
      return { success: false, error: "invalid_token" };
    }

    return { success: false, error: errBody };
  } catch (err) {
    console.error("[APNs] Exception:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Create a JWT for APNs authentication using ES256
 */
async function createAPNsJWT(
  pemContents: string,
  keyId: string,
  teamId: string
): Promise<string> {
  // Extract the key data from PEM format
  const pemLines = pemContents
    .split("\n")
    .filter((line) => !line.startsWith("-----") && line.trim() !== "");
  const keyData = Uint8Array.from(atob(pemLines.join("")), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const header = { alg: "ES256", kid: keyId };
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: teamId, iat: now };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const claimsB64 = btoa(JSON.stringify(claims)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signingInput = `${headerB64}.${claimsB64}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(signingInput)
  );

  // Convert DER signature to raw r||s format for JWT
  const sigArray = new Uint8Array(signature);
  const sigB64 = btoa(String.fromCharCode(...sigArray))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signingInput}.${sigB64}`;
}

/**
 * Send via Firebase Cloud Messaging (FCM) legacy HTTP API
 */
async function sendFCM(
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const serverKey = Deno.env.get("FCM_SERVER_KEY");

  if (!serverKey) {
    console.warn("[FCM] Missing FCM_SERVER_KEY, skipping");
    return { success: false, error: "missing_credentials" };
  }

  try {
    const res = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: `key=${serverKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: deviceToken,
        notification: { title, body, sound: "default" },
        data: data || {},
      }),
    });

    const result = await res.json();

    if (result.success === 1) {
      return { success: true };
    }

    if (result.results?.[0]?.error === "NotRegistered" || result.results?.[0]?.error === "InvalidRegistration") {
      return { success: false, error: "invalid_token" };
    }

    return { success: false, error: JSON.stringify(result) };
  } catch (err) {
    console.error("[FCM] Exception:", err);
    return { success: false, error: (err as Error).message };
  }
}
