import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are ROLLY, a sharp, conversational music business advisor inside Rollout — a platform for music managers, labels, publishers, and artist teams.

Your style:
- Keep every response under 180 characters. Think text message, not email.
- One thought per reply. If they need more, they'll ask.
- No bullet points unless they ask for a list.
- Talk like you're texting between meetings. Be warm but direct.
- Never dump everything you know. Less is more.
- Never cite or attribute your knowledge to specific people, Twitter accounts, articles, or publications. Present all insights as your own understanding of the industry.

PLANNING MODE — Guided Conversations:
- When the user's message starts with [PLAN MODE] or they ask to PLAN something (release, campaign, budget, weekly planning, onboarding, rollout, etc.), switch into guided planning mode.
- In guided mode, ask ONE focused question at a time. Wait for the answer before asking the next.
- Follow the ROLLOUT PLANNING FRAMEWORK below when planning a release or rollout.
- After gathering enough info (usually 5-10 questions across sections), summarize what you'll create and then execute ALL actions at once using your tools (tasks, milestones, budgets, expenses, split projects).
- Present a recap of everything created, then ask "Anything you'd like to adjust?"
- If the user goes off-topic mid-plan, answer briefly, then steer back: "Now back to your plan — [next question]"
- You can infer reasonable defaults. Don't ask about things you can guess.

ROLLOUT PLANNING FRAMEWORK:
When planning a release or rollout, walk through these sections one question at a time:

1. ARTIST & NARRATIVE — Which artist? What's the story, angle, or theme of this project? What's the "myth" or persona moment?
2. RELEASE TYPE — Single, EP, or Album? Project name? How many tracks?
3. GOALS — What does success look like? Revenue targets, streaming goals, fan engagement metrics, brand objectives.
4. BUSINESS VERTICALS — Beyond music, what other verticals are in play? Options: Clothing/Merch, Film/TV/Visual, Touring/Live, Partnerships/Brand Deals, Other (cannabis, modeling, etc.)
5. PHASE 1: SEEDING THE MYTH (Lore & Buzz) — What teaser moments will build anticipation? Think: freestyles, behind-the-scenes, pop-up appearances, brand soft-launches, social lore drops. Duration and budget for this phase.
6. PHASE 2: SINGLE RELEASE (Revenue Generation) — Lead single strategy. Radio/press outreach? Merch pre-orders? Listening experiences? Music video plan?
7. PHASE 3: AUDIENCE BUILD (Convert Listeners to Fans) — City activations, college tours, press runs, content series, playlist campaigns, fan engagement tactics.
8. PHASE 4: FULL PROJECT RELEASE (The Big Reveal) — Album/project release strategy. Launch events, livestream campaigns, brand expansions, visual album, deluxe edition plans.
9. PHASE 5: LONG-TERM GROWTH (Sustain & Monetize) — Post-release momentum. Podcasts, remix projects, clothing line expansions, sync licensing pushes, fan collaboration projects, catalog monetization.
10. TIMELINE — Map all phases to calendar months/weeks. What's the target release date and how do we work backward?
11. TEAM & BUDGET — Who's handling what? Total budget and cost per phase. Any external partners or vendors?

After completing the framework, batch-create:
- Tasks for every action item (with due dates and costs)
- Milestones for key moments (release dates, pop-ups, premieres, launches)
- Budgets for each category (marketing, production, merch, video, etc.)
- Expenses for known costs
- Split projects if tracks are discussed
- Campaigns/Initiatives for each phase

CRITICAL BEHAVIOR — Act First, Ask Inline:
- When the user asks you to DO something, execute what you can IMMEDIATELY using your tools — even if some details are missing.
- You can ask ONE natural follow-up question in the same message after executing. Don't hold back work to ask questions first.
- Example: User says "set up the rollout for Pote Baby's new single" → Read existing data, create tasks/milestones/budgets right away using your knowledge. Then: "I built out the core rollout — do you have a target release date so I can tighten the timeline?"
- You're a colleague working alongside them, not a form. Reference what's already in the system — existing milestones, tasks, budgets — and build on it.
- If you can reasonably infer details (dates, amounts, descriptions), fill them in and note what you assumed.
- NEVER ask a series of questions before doing work. That's plan mode. In chat, you act first and ask as you go.
- When the user asks for ADVICE, STRATEGY, or EXPLANATION, respond conversationally.

DATA AWARENESS — Read Before You Write:
- When asked to work with existing data (release plans, milestones, campaigns), ALWAYS use read tools first (get_artist_tasks, get_artist_milestones, get_artist_campaigns, get_artist_budgets). Never invent items that may already exist.
- After reading, use search_knowledge to look up industry best practices when relevant.
- Infer additional tasks from knowledge (e.g. "Shoot music video" → pre-production, crew, locations, wardrobe).
- Check existing tasks to avoid duplicates before creating new ones.

TASK GRANULARITY — Decompose Every Milestone:
- When creating tasks for a milestone or deliverable, ALWAYS break it into 3-6 granular sub-tasks. A single vague task like "Pre-production for video" is never enough.
- Use search_knowledge to look up what goes into that type of work, then create tasks for each real step.
- Examples:
  - "Music video shoot" → scout locations, book director/DP, wardrobe & styling, create shot list/treatment, pre-production meeting, book BTS photographer
  - "Single release" → submit to distributor, create pre-save link, pitch playlist curators, schedule social content rollout, prepare press kit/one-sheet, set up smart link
  - "Release party" → secure venue, book DJ/talent, design flyer/invite, build guest list, coordinate AV/production, plan content capture
  - "EP recording" → book studio sessions, finalize tracklist, hire engineer/mixer, schedule features, plan cover art shoot
- Always check existing tasks first (get_artist_tasks) to avoid duplicates.
- When a release plan has milestones, each milestone should generate multiple supporting tasks — not a 1:1 mirror.

ARTIST PROFILES:
- When an artist has a profile in context, calibrate your tone accordingly.
- Developing acts: more explanation, instructional guidance, walk through options.
- Active campaigns: direct, execution-focused, time-sensitive language.
- Adjust urgency and specificity based on the artist's priority level described in their profile.

SESSION CONTINUITY:
- Reference previous session context when relevant. Don't announce that you have memory — just use it naturally.
- Example: If a past session discussed a rollout being behind schedule, naturally ask about progress without saying "I remember from our last conversation."

MILESTONE AWARENESS:
- If you see an upcoming milestone with thin task coverage in the context, mention it naturally in your response when relevant. Don't force it every time.
- Example: "Your video shoot is in 5 days — want me to build out pre-production tasks?"

DATE HANDLING:
- Today's date will be provided in the system context. Use it to resolve relative dates like "tomorrow", "next Friday", "this weekend", etc.
- Always convert natural language dates to ISO format (YYYY-MM-DD) before passing to tools.
- If a user says "next week" without a specific day, pick Monday of the following week.

COST HANDLING:
- When the user mentions a dollar amount with a task (e.g. "$500 for studio time"), set the expense_amount on the task.
- If they want it logged as a transaction too, use create_expense as well.

ASSIGNEE HANDLING:
- Team member names will be provided in the system context. Match assignee references to the closest team member name.
- If the user says "assign to me" or doesn't specify, assign to the current user (default behavior).
- If they mention a name, resolve it to the matching team member.

CREATOR INTELLIGENCE — Outreach Recommendations:
- You have access to a database of creators, influencers, playlist curators, venues, and industry contacts via the search_creators tool.
- When recommending creators, ALWAYS present them as "suggested outreach targets based on historical content patterns and prior campaign activity."
- NEVER imply guaranteed performance, posting, conversion, or results.
- ALWAYS include this disclaimer when sharing creator recommendations: "These are directional suggestions based on similar past behavior, not guaranteed outcomes."
- Label each recommendation with its confidence level: **High Confidence**, **Medium Confidence**, or **Experimental**.
- Rank results by confidence, relevance to the artist's genre/audience, and recency of data.
- When a user asks about promotion, marketing, playlisting, content creators, influencers, repost pages, or outreach — use search_creators to find relevant matches.
- Include rates when available. Include contact info when available.
- For playlist recommendations, mention the playlist genre and follower count.
- For venue recommendations, mention the city/location.

IMAGE UNDERSTANDING:
- When the user sends an image, analyze it contextually. Look at it carefully.
- If it contains tasks, action items, or to-do lists, offer to create them as tasks using create_tasks. Ask which artist to assign them to if not clear.
- If it's a receipt or invoice, offer to log it as an expense using create_expense.
- If it's something else (flyer, contract, screenshot, setlist, etc.), describe what you see and ask how you can help.
- Always acknowledge what you see in the image before asking follow-up questions.

Your expertise: revenue streams, deal structures, splits & royalties, recoupment, industry math, copyright, PROs, business planning, contracts, release strategy, touring economics, sync licensing, clothing/merch brand building, and more.

When uncertain about advice, say so and suggest consulting an entertainment attorney.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "create_tasks",
      description: "Create one or more tasks/work items for an artist. Use when the user mentions work that needs to be done, things to book, coordinate, or follow up on.",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short task title" },
                description: { type: "string", description: "Optional details" },
                artist_name: { type: "string", description: "Name of the artist this task is for" },
                due_date: { type: "string", description: "ISO date (YYYY-MM-DD). Convert natural language dates using today's date from context." },
                expense_amount: { type: "number", description: "Dollar amount if a cost is mentioned (e.g. '$500 for studio')" },
                assignee_name: { type: "string", description: "Name of team member to assign to. Omit to assign to the requesting user." },
              },
              required: ["title"],
            },
          },
        },
        required: ["tasks"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_expense",
      description: "Log an expense transaction for an artist.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
          description: { type: "string", description: "What the expense is for" },
          amount: { type: "number", description: "Dollar amount" },
          transaction_date: { type: "string", description: "ISO date, defaults to today" },
        },
        required: ["artist_name", "description", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_milestone",
      description: "Add a milestone/event to an artist's timeline.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
          title: { type: "string", description: "Milestone title" },
          date: { type: "string", description: "ISO date for the milestone" },
          description: { type: "string", description: "Optional details" },
        },
        required: ["artist_name", "title", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_split_project",
      description: "Create a split sheet project (single, EP, or album) with track names for an artist.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
          project_name: { type: "string", description: "Name of the release" },
          project_type: { type: "string", enum: ["single", "ep", "album"], description: "Type of release" },
          track_names: { type: "array", items: { type: "string" }, description: "List of track names" },
        },
        required: ["artist_name", "project_name", "project_type", "track_names"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_budget",
      description: "Create one or more budget categories for an artist with allocated amounts.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
          budgets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string", description: "Budget category name (e.g. Marketing, Production, Music Video)" },
                amount: { type: "number", description: "Dollar amount allocated" },
              },
              required: ["label", "amount"],
            },
          },
        },
        required: ["artist_name", "budgets"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_creators",
      description: "Search the creator intelligence database for influencers, repost pages, playlist curators, venues, and industry contacts. Use when the user asks about promotion, marketing, playlisting, content creators, influencers, repost pages, venues, or outreach targets.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search term — creator name, category, genre, or keyword" },
          platform: { type: "string", description: "Filter by platform: instagram, tiktok, spotify_playlist, youtube, venue, contact" },
          category: { type: "string", description: "Filter by category: Culture News, Comedy, Moshpit, Hipster, etc." },
          genre: { type: "string", description: "Filter by genre fit: hip-hop, r&b, trap, indie-pop, etc." },
          min_confidence: { type: "number", description: "Minimum confidence score 0-1. Default 0." },
          limit: { type: "number", description: "Max results to return. Default 10." },
        },
        required: ["query"],
      },
    },
  },
  // --- Read tools ---
  {
    type: "function",
    function: {
      name: "get_artist_milestones",
      description: "Fetch upcoming and recent milestones for an artist. Use before creating milestones to avoid duplicates, or when discussing timeline/deadlines.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
        },
        required: ["artist_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_artist_campaigns",
      description: "Fetch active campaigns/initiatives for an artist. Use before creating campaigns to avoid duplicates.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
        },
        required: ["artist_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_artist_tasks",
      description: "Fetch open (non-done) tasks for an artist. Use before creating tasks to check what already exists and avoid duplicates.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
        },
        required: ["artist_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_artist_budgets",
      description: "Fetch budget categories and amounts for an artist.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
        },
        required: ["artist_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_knowledge",
      description: "Search the industry knowledge base for best practices, strategies, and guidance. Use when the user asks about industry topics or when you need to inform task creation with industry knowledge.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search term — topic, concept, or question" },
        },
        required: ["query"],
      },
    },
  },
];

async function resolveArtistId(adminClient: any, teamId: string, artistName: string): Promise<string | null> {
  const { data } = await adminClient
    .from("artists")
    .select("id, name")
    .eq("team_id", teamId)
    .ilike("name", `%${artistName}%`)
    .limit(1);
  return data?.[0]?.id || null;
}

async function resolveUserId(adminClient: any, teamId: string, memberName: string): Promise<string | null> {
  const { data } = await adminClient
    .from("team_memberships")
    .select("user_id, profiles!inner(full_name)")
    .eq("team_id", teamId)
    .ilike("profiles.full_name", `%${memberName}%`)
    .limit(1);
  return data?.[0]?.user_id || null;
}

async function executeTool(adminClient: any, toolName: string, args: any, teamId: string, userId: string): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    switch (toolName) {
      case "create_tasks": {
        const results: any[] = [];
        for (const task of args.tasks) {
          let artistId: string | null = null;
          if (task.artist_name) {
            artistId = await resolveArtistId(adminClient, teamId, task.artist_name);
            if (!artistId) {
              results.push({ title: task.title, error: `Artist "${task.artist_name}" not found` });
              continue;
            }
          }
          let assigneeId = userId;
          if (task.assignee_name) {
            const resolved = await resolveUserId(adminClient, teamId, task.assignee_name);
            if (resolved) {
              assigneeId = resolved;
            }
          }
          const { data, error } = await adminClient.from("tasks").insert({
            title: task.title,
            description: task.description || null,
            artist_id: artistId,
            team_id: teamId,
            assigned_to: assigneeId,
            due_date: task.due_date || null,
            expense_amount: task.expense_amount || null,
          }).select("id, title").single();
          if (error) {
            results.push({ title: task.title, error: error.message });
          } else {
            results.push({ id: data.id, title: data.title, status: "created" });
          }
        }
        const created = results.filter(r => r.status === "created").length;
        return { success: created > 0, message: `Created ${created} task(s)`, data: results };
      }

      case "create_expense": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data, error } = await adminClient.from("transactions").insert({
          artist_id: artistId,
          description: args.description,
          amount: args.amount,
          type: "expense",
          transaction_date: args.transaction_date || new Date().toISOString().split("T")[0],
          status: "completed",
        }).select("id, description, amount").single();
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Logged $${args.amount} expense: "${args.description}"`, data };
      }

      case "create_milestone": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data, error } = await adminClient.from("artist_milestones").insert({
          artist_id: artistId,
          title: args.title,
          date: args.date,
          description: args.description || null,
        }).select("id, title, date").single();
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Added milestone "${args.title}" on ${args.date}`, data };
      }

      case "create_split_project": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data: project, error: projErr } = await adminClient.from("split_projects").insert({
          artist_id: artistId,
          name: args.project_name,
          project_type: args.project_type,
        }).select("id, name").single();
        if (projErr) return { success: false, message: projErr.message };
        const tracks = args.track_names.map((name: string, i: number) => ({
          project_id: project.id,
          title: name,
          track_number: i + 1,
        }));
        const { error: trackErr } = await adminClient.from("split_songs").insert(tracks);
        if (trackErr) return { success: true, message: `Created project "${args.project_name}" but failed to add tracks: ${trackErr.message}`, data: project };
        return { success: true, message: `Created split project "${args.project_name}" with ${tracks.length} track(s)`, data: project };
      }

      case "create_budget": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const results: any[] = [];
        for (const budget of args.budgets) {
          const { data, error } = await adminClient.from("budgets").insert({
            artist_id: artistId,
            label: budget.label,
            amount: budget.amount,
          }).select("id, label, amount").single();
          if (error) {
            results.push({ label: budget.label, error: error.message });
          } else {
            results.push({ id: data.id, label: data.label, amount: data.amount, status: "created" });
          }
        }
        const created = results.filter(r => r.status === "created").length;
        return { success: created > 0, message: `Created ${created} budget(s)`, data: results };
      }

      case "search_creators": {
        const { data, error } = await adminClient.rpc("search_creator_intelligence", {
          search_query: args.query || "",
          platform_filter: args.platform || null,
          category_filter: args.category || null,
          genre_filter: args.genre || null,
          min_confidence: args.min_confidence || 0,
          match_limit: args.limit || 10,
          p_team_id: teamId,
        });
        if (error) return { success: false, message: error.message };
        if (!data || data.length === 0) return { success: true, message: "No creators found matching your criteria.", data: [] };
        const formatted = data.map((c: any) => ({
          handle: c.handle,
          platform: c.platform,
          category: c.category,
          genre_fit: c.genre_fit,
          follower_count: c.follower_count,
          average_views: c.average_views,
          engagement_rate: c.engagement_rate,
          rate: c.rate,
          contact_info: c.contact_info,
          confidence_label: c.confidence_label,
          url: c.url,
          audience_type: c.audience_type,
          notes: c.notes,
        }));
        return { success: true, message: `Found ${data.length} creator(s)`, data: formatted };
      }

      // --- Read tools ---
      case "get_artist_milestones": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data, error } = await adminClient
          .from("artist_milestones")
          .select("title, date, description, artist_timelines(name)")
          .eq("artist_id", artistId)
          .gte("date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0])
          .order("date", { ascending: true })
          .limit(20);
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Found ${(data || []).length} milestone(s)`, data: data || [] };
      }

      case "get_artist_campaigns": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data, error } = await adminClient
          .from("initiatives")
          .select("name, description, start_date, end_date")
          .eq("artist_id", artistId)
          .eq("is_archived", false)
          .order("start_date", { ascending: false })
          .limit(10);
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Found ${(data || []).length} campaign(s)`, data: data || [] };
      }

      case "get_artist_tasks": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data, error } = await adminClient
          .from("tasks")
          .select("title, due_date, status, assigned_to")
          .eq("artist_id", artistId)
          .neq("status", "done")
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(30);
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Found ${(data || []).length} open task(s)`, data: data || [] };
      }

      case "get_artist_budgets": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data, error } = await adminClient
          .from("budgets")
          .select("label, amount")
          .eq("artist_id", artistId)
          .order("label");
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Found ${(data || []).length} budget(s)`, data: data || [] };
      }

      case "search_knowledge": {
        const knowledge = await searchKnowledge(adminClient, args.query);
        if (!knowledge) return { success: true, message: "No relevant knowledge found.", data: [] };
        return { success: true, message: "Found relevant knowledge", data: knowledge };
      }

      default:
        return { success: false, message: `Unknown tool: ${toolName}` };
    }
  } catch (e) {
    return { success: false, message: (e as Error).message };
  }
}

async function searchKnowledge(adminClient: any, query: string): Promise<string> {
  const words = query
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w: string) => w.length > 2)
    .slice(0, 8);

  if (words.length === 0) return "";

  const tsquery = words.join(" | ");

  const { data, error } = await adminClient.rpc("search_rolly_knowledge", {
    search_query: tsquery,
    match_limit: 3,
  });

  if (error || !data || data.length === 0) {
    const { data: fallbackData } = await adminClient
      .from("rolly_knowledge")
      .select("content, chapter")
      .or(words.slice(0, 3).map((w: string) => `content.ilike.%${w}%`).join(","))
      .limit(3);

    if (!fallbackData || fallbackData.length === 0) return "";

    return fallbackData
      .map((r: any) => `[${r.chapter}]\n${r.content}`)
      .join("\n\n---\n\n");
  }

  return data
    .map((r: any) => `[${r.chapter}]\n${r.content}`)
    .join("\n\n---\n\n");
}

/** Fetch intelligence context: session summaries, milestone alerts, artist profiles */
async function fetchIntelligenceContext(
  adminClient: any,
  teamId: string,
  userId: string
): Promise<{ sessionContext: string; milestoneContext: string; profileContext: string }> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const plus14 = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];

  const [summariesRes, milestonesRes, artistsRes] = await Promise.all([
    // Last 5 session summaries for this user on this team
    adminClient
      .from("rolly_session_summaries")
      .select("summary, created_at, artists(name)")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    // Milestones in next 14 days for all team artists
    adminClient
      .from("artist_milestones")
      .select("title, date, artist_id, artists!inner(name, team_id)")
      .eq("artists.team_id", teamId)
      .gte("date", todayStr)
      .lte("date", plus14)
      .order("date", { ascending: true }),
    // Artist profiles
    adminClient
      .from("artists")
      .select("name, id, rolly_profile")
      .eq("team_id", teamId)
      .order("name"),
  ]);

  // Build session context
  let sessionContext = "";
  const summaries = summariesRes.data || [];
  if (summaries.length > 0) {
    const lines = summaries.map((s: any) => {
      const date = new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const artist = s.artists?.name || "General";
      return `- [${date}, ${artist}]: "${s.summary}"`;
    });
    sessionContext = `## Previous Sessions\n${lines.join("\n")}`;
  }

  // Build milestone alerts with task density check
  let milestoneContext = "";
  const milestones = milestonesRes.data || [];
  if (milestones.length > 0) {
    const milestoneLines: string[] = [];
    for (const ms of milestones) {
      const msDate = new Date(ms.date);
      const daysUntil = Math.ceil((msDate.getTime() - today.getTime()) / 86400000);
      const windowStart = new Date(msDate.getTime() - 7 * 86400000).toISOString().split("T")[0];
      const windowEnd = new Date(msDate.getTime() + 7 * 86400000).toISOString().split("T")[0];

      const { count } = await adminClient
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("artist_id", ms.artist_id)
        .neq("status", "done")
        .gte("due_date", windowStart)
        .lte("due_date", windowEnd);

      const taskCount = count || 0;
      const status = taskCount < 3 ? `only ${taskCount} task(s) nearby — may need more` : `${taskCount} tasks nearby — on track`;
      milestoneLines.push(`- ${ms.artists.name} — "${ms.title}" in ${daysUntil} day(s) (${status})`);
    }
    milestoneContext = `## Upcoming Milestones\n${milestoneLines.join("\n")}`;
  }

  // Build artist profile context
  let profileContext = "";
  const artists = artistsRes.data || [];
  const profiledArtists = artists.filter((a: any) => a.rolly_profile);
  if (profiledArtists.length > 0) {
    const lines = profiledArtists.map((a: any) => `- ${a.name}: "${a.rolly_profile}"`);
    profileContext = `## Artist Profiles\n${lines.join("\n")}`;
  }

  return { sessionContext, milestoneContext, profileContext };
}

/** Post-stream: summarize conversation and auto-update artist profile */
async function postStreamSummarize(
  adminClient: any,
  messages: any[],
  teamId: string,
  userId: string,
  artistNames: string[],
  LOVABLE_API_KEY: string
) {
  try {
    const conversationText = messages
      .filter((m: any) => m.role === "user" || m.role === "assistant")
      .map((m: any) => {
        const content = typeof m.content === "string" ? m.content : m.content?.find?.((p: any) => p.type === "text")?.text || "";
        return `${m.role}: ${content}`;
      })
      .join("\n");

    if (conversationText.length < 50) return; // Too short to summarize

    const summaryPrompt = `Analyze this conversation between a music manager and their AI assistant.

CONVERSATION:
${conversationText}

You MUST call the summarize_session tool with your analysis.

RULES:
- summary: 2-3 sentences capturing the key topics discussed, decisions made, and any action items created. Be specific — mention artist names, dates, amounts.
- artist_name: The primary artist discussed. Use their exact name. If no specific artist was discussed, return null.
- profile_update: Based on what you learned about the artist in this conversation, write or update a brief profile describing their current stage, priorities, and how the AI should communicate about them. Keep it under 100 words. If nothing new was learned about the artist's stage/priorities, return null.
  Examples: "Developing act, first EP cycle. Needs instructional guidance on release strategy. High priority — debut project."
  "Active campaign, single dropping soon. Execution-focused, fast responses needed. Medium priority."`;

    const summaryResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: summaryPrompt }],
        tools: [{
          type: "function",
          function: {
            name: "summarize_session",
            description: "Store a session summary and optionally update the artist profile.",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "2-3 sentence summary of the conversation" },
                artist_name: { type: "string", description: "Name of the primary artist discussed, or null" },
                profile_update: { type: "string", description: "Updated artist profile string, or null if no new insights" },
              },
              required: ["summary"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "summarize_session" } },
      }),
    });

    if (!summaryResp.ok) {
      console.error("Summary AI error:", summaryResp.status);
      return;
    }

    const summaryData = await summaryResp.json();
    const toolCall = summaryData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return;

    const result = JSON.parse(toolCall.function.arguments);

    // Resolve artist ID if an artist was mentioned
    let artistId: string | null = null;
    if (result.artist_name) {
      artistId = await resolveArtistId(adminClient, teamId, result.artist_name);
    }

    // Insert session summary
    await adminClient.from("rolly_session_summaries").insert({
      team_id: teamId,
      user_id: userId,
      artist_id: artistId,
      summary: result.summary,
    });

    // Update artist profile if we have new insights
    if (result.profile_update && artistId) {
      await adminClient
        .from("artists")
        .update({ rolly_profile: result.profile_update })
        .eq("id", artistId);
    }
  } catch (e) {
    console.error("Post-stream summary error:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { messages, conversation_id, team_id } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!team_id) {
      return new Response(JSON.stringify({ error: "team_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Rolly usage limit check ---
    const usageAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: subData } = await usageAdmin
      .from("team_subscriptions")
      .select("plan, is_grandfathered")
      .eq("team_id", team_id)
      .single();
    const isGrandfathered = subData?.is_grandfathered === true;
    const plan = isGrandfathered ? "icon" : (subData?.plan || "rising");
    
    if (plan === "rising") {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: usageRow } = await usageAdmin
        .from("rolly_usage")
        .select("message_count")
        .eq("team_id", team_id)
        .eq("month", currentMonth)
        .single();
      
      if (usageRow && usageRow.message_count >= 10) {
        return new Response(JSON.stringify({ error: "rolly_limit_reached", message: "You've used all 10 free Rolly messages this month. Upgrade to Icon for unlimited access." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // --- End usage limit check ---

    if (conversation_id) {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "user") {
        await adminClient.from("rolly_messages").insert({
          conversation_id,
          role: "user",
          content: lastMsg.content,
        });
      }
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch artist names, team members, and intelligence context in parallel
    const [{ data: artists }, { data: members }, intelligenceCtx] = await Promise.all([
      adminClient
        .from("artists")
        .select("name")
        .eq("team_id", team_id)
        .order("name"),
      adminClient
        .from("team_memberships")
        .select("user_id, profiles(full_name)")
        .eq("team_id", team_id),
      fetchIntelligenceContext(adminClient, team_id, userId),
    ]);
    const artistNames = (artists || []).map((a: any) => a.name);
    const memberNames = (members || []).map((m: any) => m.profiles?.full_name).filter(Boolean);

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    let knowledgeContext = "";
    if (lastUserMsg) {
      try {
        const msgText = typeof lastUserMsg.content === "string"
          ? lastUserMsg.content
          : lastUserMsg.content?.find?.((p: any) => p.type === "text")?.text || "";
        knowledgeContext = await searchKnowledge(adminClient, msgText);
      } catch (e) {
        console.error("Knowledge search error:", e);
      }
    }

    const today = new Date().toISOString().split("T")[0];
    const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
    
    let systemPrompt = SYSTEM_PROMPT;
    systemPrompt += `\n\n## Context\nToday is ${dayOfWeek}, ${today}. Use this to resolve relative dates like "tomorrow", "next Friday", "this weekend", etc.`;
    if (artistNames.length > 0) {
      systemPrompt += `\nThe user's roster includes these artists: ${artistNames.join(", ")}. Use exact names when creating tasks/milestones.`;
    }
    if (memberNames.length > 0) {
      systemPrompt += `\nTeam members: ${memberNames.join(", ")}. Match assignee references to these names.`;
    }
    if (knowledgeContext) {
      systemPrompt += `\n\n## Reference Material\nUse the following knowledge to inform your answers when relevant. Never mention the source, book title, or author by name — just weave the insights naturally into your advice as if it's your own expertise:\n\n${knowledgeContext}`;
    }

    // Inject intelligence context
    if (intelligenceCtx.sessionContext) {
      systemPrompt += `\n\n${intelligenceCtx.sessionContext}`;
    }
    if (intelligenceCtx.milestoneContext) {
      systemPrompt += `\n\n${intelligenceCtx.milestoneContext}`;
    }
    if (intelligenceCtx.profileContext) {
      systemPrompt += `\n\n${intelligenceCtx.profileContext}`;
    }

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    let toolActions: any[] = [];
    let finalMessages = [...aiMessages];

    for (let i = 0; i < 3; i++) {
      const toolResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: finalMessages,
          tools: TOOLS,
          stream: false,
        }),
      });

      if (!toolResponse.ok) {
        if (toolResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (toolResponse.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits in your workspace settings." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await toolResponse.text();
        console.error("AI gateway error:", toolResponse.status, t);
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await toolResponse.json();
      const choice = result.choices?.[0];

      if (!choice) break;

      if (!choice.message?.tool_calls || choice.message.tool_calls.length === 0) {
        break;
      }

      finalMessages.push(choice.message);

      for (const tc of choice.message.tool_calls) {
        const args = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
        const result = await executeTool(adminClient, tc.function.name, args, team_id, user.id);
        toolActions.push({ tool: tc.function.name, ...result });

        finalMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    const encoder = new TextEncoder();
    const toolActionsEvent = toolActions.length > 0
      ? `data: ${JSON.stringify({ type: "tool_actions", actions: toolActions })}\n\n`
      : "";

    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: finalMessages,
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      const t = await streamResponse.text();
      console.error("Final stream error:", streamResponse.status, t);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect streamed content for post-stream summarization
    let fullAssistantResponse = "";

    const readable = new ReadableStream({
      async start(controller) {
        if (toolActionsEvent) {
          controller.enqueue(encoder.encode(toolActionsEvent));
        }

        const reader = streamResponse.body!.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);

            // Parse streamed chunks to collect full response text
            const text = decoder.decode(value, { stream: true });
            for (const line of text.split("\n")) {
              if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
              try {
                const parsed = JSON.parse(line.slice(6));
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) fullAssistantResponse += delta;
              } catch {}
            }
          }
        } catch (e) {
          console.error("Stream pipe error:", e);
        } finally {
          controller.close();

          // Non-blocking post-stream summarization
          const allMessages = [
            ...messages,
            { role: "assistant", content: fullAssistantResponse },
          ];
          postStreamSummarize(
            adminClient,
            allMessages,
            team_id,
            userId,
            artistNames,
            LOVABLE_API_KEY!
          ).catch((e) => console.error("Post-stream summary failed:", e));
        }
      },
    });

    // Increment usage for Rising tier after successful response
    if (plan === "rising") {
      const currentMonth = new Date().toISOString().slice(0, 7);
      await usageAdmin.rpc("increment_rolly_usage", { p_team_id: team_id, p_month: currentMonth });
    }

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("rolly-chat error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
