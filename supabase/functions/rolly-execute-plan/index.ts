import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map job title keywords to role categories
const JOB_TITLE_ROLE_MAP: Record<string, string[]> = {
  marketing: ["marketing", "content", "social", "social media", "creative director", "brand", "pr", "press", "communications", "growth"],
  ar: ["a&r", "ar", "talent", "scout", "repertoire", "artist relations"],
  finance: ["accountant", "accounting", "controller", "cfo", "finance", "business manager", "bookkeeper"],
  operations: ["operations", "chief of staff", "coo", "project manager", "coordinator", "admin", "office manager"],
  creative: ["creative", "designer", "videographer", "photographer", "graphic", "art director", "editor", "animator"],
  legal: ["legal", "attorney", "counsel", "lawyer", "paralegal", "contracts"],
};

function classifyJobTitle(jobTitle: string): string {
  if (!jobTitle) return "general";
  const lower = jobTitle.toLowerCase();
  for (const [role, keywords] of Object.entries(JOB_TITLE_ROLE_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) return role;
  }
  return "general";
}

// Extract keywords from a title for matching
function extractKeywords(title: string): string[] {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 3);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await sb.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { items, team_id } = await req.json();

    if (!team_id) {
      return new Response(JSON.stringify({ error: "team_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all artists for this team to resolve names → IDs
    const { data: artists } = await sb
      .from("artists")
      .select("id, name")
      .eq("team_id", team_id);

    const artistMap = new Map<string, string>();
    (artists ?? []).forEach((a: any) => {
      artistMap.set(a.name.trim().toLowerCase(), a.id);
    });

    const resolveArtistId = (name?: string): string | null => {
      if (!name) return artists?.[0]?.id || null;
      const lower = name.trim().toLowerCase().replace(/\s+/g, " ");
      if (artistMap.has(lower)) return artistMap.get(lower)!;
      for (const [key, id] of artistMap) {
        if (key.includes(lower) || lower.includes(key)) return id;
      }
      const inputWords = lower.split(/\s+/);
      for (const [key, id] of artistMap) {
        const keyWords = key.split(/\s+/);
        const overlap = inputWords.filter(w => keyWords.includes(w));
        if (overlap.length > 0 && overlap.length >= Math.min(inputWords.length, keyWords.length) * 0.5) return id;
      }
      console.warn(`Could not match artist name "${name}" to any roster artist. Available: ${[...artistMap.keys()].join(", ")}`);
      return artists?.[0]?.id || null;
    };

    // Fetch team members with job titles for smart assignment
    const { data: teamMembers, error: teamMembersError } = await sb
      .from("team_memberships")
      .select("user_id, role, job_title")
      .eq("team_id", team_id);

    if (teamMembersError) {
      console.error("Failed to fetch team members:", teamMembersError.message);
    }

    const memberIds = (teamMembers ?? []).map((m: any) => m.user_id).filter(Boolean);

    // Build member profiles with role classification
    const memberProfiles = (teamMembers ?? []).map((m: any) => ({
      userId: m.user_id,
      teamRole: m.role,
      jobTitle: m.job_title || "",
      roleCategory: classifyJobTitle(m.job_title || ""),
    }));

    // Fetch artist permissions for access filtering
    const artistAccessMap = new Map<string, string[]>();
    if (memberIds.length > 0) {
      const { data: permissions } = await sb
        .from("artist_permissions")
        .select("user_id, artist_id, permission")
        .in("user_id", memberIds);

      const ownersAndManagers = memberProfiles
        .filter(m => m.teamRole === "team_owner" || m.teamRole === "manager")
        .map(m => m.userId);

      for (const artist of (artists ?? [])) {
        const usersWithAccess: string[] = [...ownersAndManagers];
        for (const perm of (permissions ?? [])) {
          if (perm.artist_id === artist.id &&
            (perm.permission === "view_access" || perm.permission === "full_access") &&
            !usersWithAccess.includes(perm.user_id)) {
            usersWithAccess.push(perm.user_id);
          }
        }
        artistAccessMap.set(artist.id, usersWithAccess);
      }
    }

    // Fetch historical tasks for keyword matching
    const { data: historicalTasks } = await sb
      .from("tasks")
      .select("assigned_to, title")
      .eq("team_id", team_id)
      .order("created_at", { ascending: false })
      .limit(200);

    // Build keyword profile per user from historical tasks
    const userTaskKeywords = new Map<string, string[]>();
    for (const task of (historicalTasks ?? [])) {
      if (!task.assigned_to) continue;
      const existing = userTaskKeywords.get(task.assigned_to) || [];
      existing.push(...extractKeywords(task.title));
      userTaskKeywords.set(task.assigned_to, existing);
    }

    // Track workload balance for current plan
    const planAssignmentCounts = new Map<string, number>();

    // Smart assignment function
    const getBestAssignee = (artistId: string, taskTitle: string, assignToRole?: string): string => {
      const usersWithAccess = artistAccessMap.get(artistId);
      if (!usersWithAccess || usersWithAccess.length === 0) return user.id;

      const eligibleMembers = memberProfiles.filter(m => usersWithAccess.includes(m.userId));
      if (eligibleMembers.length === 0) return user.id;

      const taskKeywords = extractKeywords(taskTitle);

      let bestScore = -Infinity;
      let bestUser = eligibleMembers[0].userId;

      for (const member of eligibleMembers) {
        let score = 0;

        // Job title match: +3 if role category matches assign_to_role
        if (assignToRole && assignToRole !== "general" && member.roleCategory === assignToRole) {
          score += 3;
        }

        // Historical task keyword overlap: +1 per matching keyword
        const historicalKeywords = userTaskKeywords.get(member.userId) || [];
        if (historicalKeywords.length > 0 && taskKeywords.length > 0) {
          const matches = taskKeywords.filter(kw => historicalKeywords.includes(kw));
          score += Math.min(matches.length, 3); // cap at 3
        }

        // Workload balance: -0.5 per task already assigned in this plan
        const currentLoad = planAssignmentCounts.get(member.userId) || 0;
        score -= currentLoad * 0.5;

        if (score > bestScore) {
          bestScore = score;
          bestUser = member.userId;
        }
      }

      // Track assignment
      planAssignmentCounts.set(bestUser, (planAssignmentCounts.get(bestUser) || 0) + 1);
      return bestUser;
    };

    const results: { type: string; success: boolean; title: string; error?: string }[] = [];

    console.log("Received items:", JSON.stringify(items.map((i: any) => ({ type: i.type, title: i.title, artist_name: i.artist_name, assign_to_role: i.assign_to_role }))));

    const campaigns = items.filter((i: any) => i.type === "campaign");
    const tasks = items.filter((i: any) => i.type === "task");
    const milestones = items.filter((i: any) => i.type === "milestone");
    const budgetItems = items.filter((i: any) => i.type === "budget");

    const matched = campaigns.length + tasks.length + milestones.length + budgetItems.length;
    if (matched < items.length) {
      console.warn(`${items.length - matched} items had unknown types`);
    }

    // 1. Create initiatives (campaigns) first
    const campaignIdMap = new Map<string, string>();
    for (const c of campaigns) {
      const artistId = resolveArtistId(c.artist_name);
      if (!artistId) {
        results.push({ type: "campaign", success: false, title: c.title, error: "Artist not found" });
        continue;
      }
      const { data, error } = await sb.from("initiatives").insert({
        artist_id: artistId,
        name: c.title,
        description: c.description || null,
        start_date: c.date || null,
        end_date: c.end_date || null,
      }).select("id").single();

      if (error) {
        results.push({ type: "campaign", success: false, title: c.title, error: error.message });
      } else {
        campaignIdMap.set(c.title.toLowerCase(), data.id);
        results.push({ type: "campaign", success: true, title: c.title });
      }
    }

    // 2. Create tasks with smart assignment
    for (const t of tasks) {
      const artistId = resolveArtistId(t.artist_name);
      if (!artistId) {
        results.push({ type: "task", success: false, title: t.title, error: "Artist not found" });
        continue;
      }

      let initiativeId: string | null = null;
      if (t.campaign_name) {
        const lower = t.campaign_name.toLowerCase();
        for (const [key, id] of campaignIdMap) {
          if (key.includes(lower) || lower.includes(key)) {
            initiativeId = id;
            break;
          }
        }
      }

      const assignee = getBestAssignee(artistId, t.title, t.assign_to_role);

      const { error } = await sb.from("tasks").insert({
        artist_id: artistId,
        team_id: team_id,
        title: t.title,
        description: t.description || null,
        due_date: t.date || null,
        initiative_id: initiativeId,
        is_completed: false,
        assigned_to: assignee,
      });

      if (error) {
        results.push({ type: "task", success: false, title: t.title, error: error.message });
      } else {
        results.push({ type: "task", success: true, title: t.title });
      }
    }

    // 3. Create milestones
    for (const m of milestones) {
      const artistId = resolveArtistId(m.artist_name);
      if (!artistId) {
        results.push({ type: "milestone", success: false, title: m.title, error: "Artist not found" });
        continue;
      }
      const { error } = await sb.from("artist_milestones").insert({
        artist_id: artistId,
        title: m.title,
        date: m.date || new Date().toISOString().split("T")[0],
        description: m.description || null,
      });

      if (error) {
        results.push({ type: "milestone", success: false, title: m.title, error: error.message });
      } else {
        results.push({ type: "milestone", success: true, title: m.title });
      }
    }

    // 4. Create budgets
    for (const b of budgetItems) {
      const artistId = resolveArtistId(b.artist_name);
      if (!artistId) {
        results.push({ type: "budget", success: false, title: b.title, error: "Artist not found" });
        continue;
      }
      const { error } = await sb.from("budgets").insert({
        artist_id: artistId,
        label: b.title,
        amount: b.amount || 0,
      });

      if (error) {
        results.push({ type: "budget", success: false, title: b.title, error: error.message });
      } else {
        results.push({ type: "budget", success: true, title: b.title });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    if (failCount > 0) {
      console.error("Failed items:", JSON.stringify(results.filter(r => !r.success)));
    }
    console.log(`Execute plan: ${successCount} created, ${failCount} failed out of ${items.length} items`);

    return new Response(JSON.stringify({
      success: failCount === 0,
      created: successCount,
      failed: failCount,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Execute plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
