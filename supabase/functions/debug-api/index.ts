import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-debug-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth: static API key ──
  const debugKey = Deno.env.get("DEBUG_API_KEY");
  if (!debugKey) {
    return new Response(
      JSON.stringify({ error: "DEBUG_API_KEY not configured on server" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const providedKey =
    req.headers.get("x-debug-key") ??
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (providedKey !== debugKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Supabase admin client ──
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const { action } = body;

    // ────────────────────────────────────────────
    // 1. QUERY – read-only SQL via Postgres
    // ────────────────────────────────────────────
    if (action === "query") {
      const { sql } = body;
      if (!sql || typeof sql !== "string") {
        return json({ error: "Missing `sql` string" }, 400);
      }
      // Safety: only allow SELECT / WITH / EXPLAIN
      const trimmed = sql.trim().toUpperCase();
      if (
        !trimmed.startsWith("SELECT") &&
        !trimmed.startsWith("WITH") &&
        !trimmed.startsWith("EXPLAIN")
      ) {
        return json(
          { error: "Only SELECT / WITH / EXPLAIN queries allowed via `query`. Use `execute` for mutations." },
          400,
        );
      }
      const { data, error } = await supabaseAdmin.rpc("execute_readonly_query", {
        query_text: sql,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ rows: data });
    }

    // ────────────────────────────────────────────
    // 2. EXECUTE – write operations via typed SDK
    // ────────────────────────────────────────────
    if (action === "execute") {
      const { operation } = body;

      // 2a. Delete a test user entirely (auth + all related rows)
      if (operation === "delete_user") {
        const { email } = body;
        if (!email) return json({ error: "Missing `email`" }, 400);

        // Look up user
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const target = users.find((u: any) => u.email === email);
        if (!target) return json({ error: `User ${email} not found` }, 404);

        // Clean related rows
        const uid = target.id;
        await supabaseAdmin.from("notification_preferences").delete().eq("user_id", uid);
        await supabaseAdmin.from("artist_permissions").delete().eq("user_id", uid);
        await supabaseAdmin.from("team_memberships").delete().eq("user_id", uid);
        await supabaseAdmin.from("profiles").delete().eq("id", uid);
        await supabaseAdmin.auth.admin.deleteUser(uid);

        return json({ ok: true, deleted_user_id: uid });
      }

      // 2b. Reset an invite link so it can be reused
      if (operation === "reset_invite") {
        const { email, token } = body;
        let query = supabaseAdmin.from("invite_links").update({ used_at: null } as any);
        if (email) query = query.eq("invitee_email", email);
        if (token) query = query.eq("token", token);
        const { error } = await query;
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }

      // 2c. Update a row in any table
      if (operation === "update") {
        const { table, match, set } = body;
        if (!table || !match || !set) {
          return json({ error: "Missing `table`, `match`, or `set`" }, 400);
        }
        let query = supabaseAdmin.from(table).update(set);
        for (const [col, val] of Object.entries(match)) {
          query = query.eq(col, val);
        }
        const { data, error } = await query.select();
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true, rows: data });
      }

      // 2d. Insert a row
      if (operation === "insert") {
        const { table, row } = body;
        if (!table || !row) return json({ error: "Missing `table` or `row`" }, 400);
        const { data, error } = await supabaseAdmin.from(table).insert(row).select();
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true, rows: data });
      }

      // 2e. Delete rows
      if (operation === "delete") {
        const { table, match } = body;
        if (!table || !match) return json({ error: "Missing `table` or `match`" }, 400);
        let query = supabaseAdmin.from(table).delete();
        for (const [col, val] of Object.entries(match)) {
          query = query.eq(col, val);
        }
        const { data, error } = await query.select();
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true, deleted: data });
      }

      return json({ error: `Unknown operation: ${operation}` }, 400);
    }

    // ────────────────────────────────────────────
    // 3. LIST TABLES – schema introspection
    // ────────────────────────────────────────────
    if (action === "list_tables") {
      const { data, error } = await supabaseAdmin.rpc("execute_readonly_query", {
        query_text: `
          SELECT table_name, 
                 (SELECT count(*) FROM information_schema.columns c 
                  WHERE c.table_schema = 'public' AND c.table_name = t.table_name) as column_count
          FROM information_schema.tables t 
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ tables: data });
    }

    // ────────────────────────────────────────────
    // 4. DESCRIBE TABLE – column details
    // ────────────────────────────────────────────
    if (action === "describe") {
      const { table } = body;
      if (!table) return json({ error: "Missing `table`" }, 400);
      const { data, error } = await supabaseAdmin.rpc("execute_readonly_query", {
        query_text: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = '${table.replace(/'/g, "''")}'
          ORDER BY ordinal_position
        `,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ columns: data });
    }

    // ────────────────────────────────────────────
    // 5. LIST USERS – auth user listing
    // ────────────────────────────────────────────
    if (action === "list_users") {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) return json({ error: error.message }, 400);
      return json({
        users: users.map((u: any) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          email_confirmed_at: u.email_confirmed_at,
        })),
      });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("debug-api error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
