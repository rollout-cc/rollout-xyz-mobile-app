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

DAILY BRIEFING — "What do I need to do?":
- When the user asks "what do I need to do today", "what's on my plate", "what should I focus on", "my agenda", or ANY variation of asking about their workload — ALWAYS use get_my_agenda immediately.
- This works with or without an artist name. "What do I need to do for [artist]?" filters to that artist. "What do I need to do?" returns across ALL artists.
- Present the results prioritized: overdue items first (urgent), then today's tasks, then upcoming deadlines and milestones.
- If there are P1 (high priority) tasks, highlight those as the top focus.
- Be actionable: don't just list tasks — give a quick game plan. "You've got 3 things overdue and a video shoot milestone in 4 days. I'd knock out [task] first, then prep for the shoot."
- If the agenda is light, mention it positively and suggest proactive work based on upcoming milestones.

DATA AWARENESS — Read Before You Write:
- When asked to work with existing data, ALWAYS use read tools first (get_artist_tasks, get_artist_milestones, get_artist_campaigns, get_artist_budgets, get_artist_transactions, get_artist_contacts, get_artist_links, get_artist_travel_info, get_artist_splits, get_artist_info). Never invent items that may already exist.
- When the user asks you to RECALL or LOOK UP anything — contacts, travel info, clothing sizes, PRO info, links, budgets, transactions, splits — use the appropriate read tool immediately and relay the information.
- You can edit anything you can create: use update_tasks, update_milestone, update_budget, update_campaign, update_transaction to modify existing items (expenses AND revenue).
- You can delete anything: use delete_tasks, delete_milestones, delete_budgets, delete_transactions.
- After reading, use search_knowledge to look up industry best practices when relevant.
- Infer additional tasks from knowledge (e.g. "Shoot music video" → pre-production, crew, locations, wardrobe).
- Check existing tasks to avoid duplicates before creating new ones.

TASK GRANULARITY — Decompose Every Milestone (ALWAYS, on FIRST request):
- CRITICAL: On the VERY FIRST response, ALWAYS decompose each milestone or deliverable into 3-6 granular sub-tasks. Do NOT create one task per milestone — that is too shallow. Break them ALL down immediately.
- This applies whether milestones come from text, images/screenshots, or plan mode. If you see a release plan with 5 milestones, you should create 15-30 tasks total, not 5-6.
- Use search_knowledge ONCE per milestone type you haven't seen before, then create ALL the sub-tasks for that milestone.
- You can call create_tasks with up to 20 tasks in a single call — batch aggressively. Do NOT make one create_tasks call per milestone.
- MANDATORY sub-tasks per milestone type (use these as minimum checklists, add more from knowledge):
  - "Music video shoot" → scout & book location, hire director/DP/crew, wardrobe & styling planning, create shot list/treatment, pre-production meeting, book BTS photographer/videographer, secure permits if needed, plan catering/craft services
  - "Single/mixtape/EP release" → submit to distributor (2-4 weeks early), create pre-save link, pitch playlist curators, schedule social content rollout (teasers, countdown), prepare press kit/one-sheet, set up smart link (Linkfire/ToneDen), plan release day content, coordinate any features/collabs
  - "Release party / event" → secure venue & negotiate deal, book DJ/opener/talent, design flyer/invite, build & manage guest list, coordinate AV/sound/lighting, plan content capture (photographer, videographer), arrange catering/bar, promote event on socials, day-of run of show
  - "Documentary / mini-doc" → outline story arc, schedule interview subjects, hire camera crew, plan shooting schedule, secure locations, plan post-production timeline
  - "EP/album recording" → book studio sessions, finalize tracklist & sequence, hire engineer/mixer, schedule features & collaborators, plan cover art shoot, budget for mastering
- Image showing 5 milestones → decompose ALL 5 into sub-tasks in one pass (expect 20-40 tasks total)
- Always check existing tasks first (get_artist_tasks) to avoid duplicates.
- When a release plan has milestones, each milestone should generate multiple supporting tasks — not a 1:1 mirror. Never do a lazy 1:1 mapping.

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
- When the user mentions REVENUE or INCOME (e.g. "$5,000 from Nike brand deal", "got paid $10k for the show"), use create_revenue.
- Revenue categories: Royalty, Live/Touring, Merchandise, Brand Deal, Show Fee, Feature, Publishing, Other. Pick the best fit from context.
- If the user says "send invoice to X for $Y", also use create_revenue to log the income.

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
  // === CREATE TOOLS ===
  {
    type: "function",
    function: {
      name: "create_tasks",
      description: "Create one or more tasks/work items for an artist. When creating tasks for a milestone or major deliverable, always generate 3-6 granular sub-tasks covering the real steps involved — never a single vague summary task. Use search_knowledge to inform the breakdown.",
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
      name: "create_revenue",
      description: "Log a revenue/income transaction for an artist. Use when the user mentions income, payment received, brand deal payment, show fee, royalties, merch sales, etc.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
          description: { type: "string", description: "What the revenue is from (e.g. 'Nike brand deal', 'Coachella show fee')" },
          amount: { type: "number", description: "Dollar amount" },
          revenue_source: { type: "string", description: "Who paid / source name (e.g. 'Nike', 'Live Nation')" },
          revenue_category: { type: "string", enum: ["Royalty", "Live/Touring", "Merchandise", "Brand Deal", "Show Fee", "Feature", "Publishing", "Other"], description: "Category of revenue" },
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
      name: "create_campaign",
      description: "Create a campaign/initiative for an artist with optional date range.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
          name: { type: "string", description: "Campaign name" },
          description: { type: "string", description: "What this campaign is about" },
          start_date: { type: "string", description: "ISO date for start" },
          end_date: { type: "string", description: "ISO date for end" },
        },
        required: ["artist_name", "name"],
      },
    },
  },
  // === UPDATE TOOLS ===
  {
    type: "function",
    function: {
      name: "update_tasks",
      description: "Update one or more existing tasks by title match. Can change title, description, due date, completion status, assignee, or expense amount.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
          updates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                current_title: { type: "string", description: "Current title of the task to find and update" },
                new_title: { type: "string", description: "New title (if renaming)" },
                description: { type: "string", description: "New description" },
                due_date: { type: "string", description: "New due date (ISO)" },
                is_completed: { type: "boolean", description: "Mark as completed or reopen" },
                expense_amount: { type: "number", description: "New expense amount" },
                assignee_name: { type: "string", description: "New assignee name" },
              },
              required: ["current_title"],
            },
          },
        },
        required: ["artist_name", "updates"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_milestone",
      description: "Update an existing milestone by title match. Can change title, date, or description.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
          current_title: { type: "string", description: "Current milestone title to find" },
          new_title: { type: "string", description: "New title" },
          date: { type: "string", description: "New date (ISO)" },
          description: { type: "string", description: "New description" },
        },
        required: ["artist_name", "current_title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_budget",
      description: "Update an existing budget category by label match. Can change label or amount.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
          current_label: { type: "string", description: "Current budget label to find" },
          new_label: { type: "string", description: "New label" },
          amount: { type: "number", description: "New budget amount" },
        },
        required: ["artist_name", "current_label"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_campaign",
      description: "Update an existing campaign/initiative by name match. Can change name, description, dates, or archive it.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
          current_name: { type: "string", description: "Current campaign name to find" },
          new_name: { type: "string", description: "New name" },
          description: { type: "string", description: "New description" },
          start_date: { type: "string", description: "New start date (ISO)" },
          end_date: { type: "string", description: "New end date (ISO)" },
          is_archived: { type: "boolean", description: "Set to true to archive the campaign" },
        },
        required: ["artist_name", "current_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_transaction",
      description: "Update an existing expense OR revenue transaction by description match. Can change description, amount, date, status, type (expense/revenue), revenue_source, revenue_category, or mark as paid.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
          current_description: { type: "string", description: "Current transaction description to find" },
          new_description: { type: "string", description: "New description" },
          amount: { type: "number", description: "New amount" },
          transaction_date: { type: "string", description: "New date (ISO)" },
          status: { type: "string", enum: ["pending", "completed"], description: "Transaction status — use 'completed' to mark as paid" },
          type: { type: "string", enum: ["expense", "revenue"], description: "Change transaction type" },
          revenue_source: { type: "string", description: "Update revenue source (who paid)" },
          revenue_category: { type: "string", enum: ["Royalty", "Live/Touring", "Merchandise", "Brand Deal", "Show Fee", "Feature", "Publishing", "Other"], description: "Update revenue category" },
        },
        required: ["artist_name", "current_description"],
      },
    },
  },
  // === DELETE TOOLS ===
  {
    type: "function",
    function: {
      name: "delete_tasks",
      description: "Delete one or more tasks for an artist. Use when the user asks to remove, delete, or clear tasks. Can delete all open tasks for an artist or specific tasks by title.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist whose tasks to delete" },
          task_titles: { type: "array", items: { type: "string" }, description: "Optional list of specific task titles to delete. If omitted, deletes ALL open tasks for the artist." },
          delete_completed_too: { type: "boolean", description: "If true, also delete completed tasks. Default false (only open tasks)." },
        },
        required: ["artist_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_milestones",
      description: "Delete milestones for an artist by title. If no titles given, deletes all future milestones.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
          milestone_titles: { type: "array", items: { type: "string" }, description: "Specific titles to delete. If omitted, deletes all future milestones." },
        },
        required: ["artist_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_budgets",
      description: "Delete budget categories for an artist by label.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
          budget_labels: { type: "array", items: { type: "string" }, description: "Specific labels to delete. If omitted, deletes ALL budgets." },
        },
        required: ["artist_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_transactions",
      description: "Delete expense or revenue transactions for an artist by description match.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
          descriptions: { type: "array", items: { type: "string" }, description: "Descriptions of transactions to delete." },
        },
        required: ["artist_name", "descriptions"],
      },
    },
  },
  // === READ / RECALL TOOLS ===
  {
    type: "function",
    function: {
      name: "search_creators",
      description: "Search the creator intelligence database for influencers, repost pages, playlist curators, venues, and industry contacts.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search term — creator name, category, genre, or keyword" },
          platform: { type: "string", description: "Filter by platform: instagram, tiktok, spotify_playlist, youtube, venue, contact" },
          category: { type: "string", description: "Filter by category" },
          genre: { type: "string", description: "Filter by genre fit" },
          min_confidence: { type: "number", description: "Minimum confidence score 0-1. Default 0." },
          limit: { type: "number", description: "Max results to return. Default 10." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_artist_info",
      description: "Fetch full artist profile info: name, genres, goals, focus areas, Spotify ID, objectives, monthly listeners. Use when the user asks about an artist's details, setup, or profile.",
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
      description: "Fetch active campaigns/initiatives for an artist.",
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
      description: "Fetch open tasks for an artist. Also use to recall what tasks exist, check status, or answer questions about what's on the to-do list.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
          include_completed: { type: "boolean", description: "If true, also return completed tasks. Default false." },
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
      name: "get_artist_transactions",
      description: "Fetch recent expenses and revenue transactions for an artist. Use when the user asks about spending, costs, revenue, or financial history.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Name of the artist" },
          type: { type: "string", enum: ["expense", "revenue", "all"], description: "Filter by type. Default 'all'." },
          limit: { type: "number", description: "Max results. Default 20." },
        },
        required: ["artist_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_artist_contacts",
      description: "Fetch contacts associated with an artist (managers, agents, publicists, lawyers, etc). Use when the user asks about who works with an artist or needs contact info.",
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
      name: "get_artist_links",
      description: "Fetch saved links/resources for an artist (social profiles, press kits, drive folders, etc). Use when the user asks for an artist's links or resources.",
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
      name: "get_artist_travel_info",
      description: "Fetch travel and personal info for an artist's team members: passport names, dietary restrictions, airline preferences, clothing sizes, PRO/publishing info. Use when recalling any personal, travel, or business registration details.",
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
      name: "get_artist_splits",
      description: "Fetch split sheet projects and songs for an artist. Use when discussing royalties, splits, or publishing.",
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
      name: "get_my_agenda",
      description: "Fetch the current user's tasks, upcoming milestones, and recent activity across ALL artists or a specific artist. Use when the user asks 'what do I need to do today', 'what's on my plate', 'what should I focus on', 'my tasks', 'my agenda', or any variation of asking about their own workload. Returns tasks assigned to the current user, upcoming milestones, and overdue items.",
      parameters: {
        type: "object",
        properties: {
          artist_name: { type: "string", description: "Optional — filter to a specific artist. If omitted, returns across all artists." },
          days_ahead: { type: "number", description: "How many days ahead to look. Default 7." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_knowledge",
      description: "Search the industry knowledge base for best practices, strategies, and guidance.",
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
      // === CREATE TOOLS ===
      case "create_tasks": {
        const results: any[] = [];
        for (const task of args.tasks) {
          let artistId: string | null = null;
          if (task.artist_name) {
            artistId = await resolveArtistId(adminClient, teamId, task.artist_name);
            if (!artistId) { results.push({ title: task.title, error: `Artist "${task.artist_name}" not found` }); continue; }
          }
          let assigneeId = userId;
          if (task.assignee_name) { const resolved = await resolveUserId(adminClient, teamId, task.assignee_name); if (resolved) assigneeId = resolved; }
          const { data, error } = await adminClient.from("tasks").insert({
            title: task.title, description: task.description || null, artist_id: artistId, team_id: teamId,
            assigned_to: assigneeId, due_date: task.due_date || null, expense_amount: task.expense_amount || null,
          }).select("id, title").single();
          if (error) results.push({ title: task.title, error: error.message });
          else results.push({ id: data.id, title: data.title, status: "created" });
        }
        const created = results.filter(r => r.status === "created").length;
        return { success: created > 0, message: `Created ${created} task(s)`, data: results };
      }

      case "create_expense": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data, error } = await adminClient.from("transactions").insert({
          artist_id: artistId, description: args.description, amount: args.amount, type: "expense",
          transaction_date: args.transaction_date || new Date().toISOString().split("T")[0], status: "completed",
        }).select("id, description, amount").single();
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Logged $${args.amount} expense: "${args.description}"`, data };
      }

      case "create_revenue": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data, error } = await adminClient.from("transactions").insert({
          artist_id: artistId, description: args.description, amount: args.amount, type: "revenue",
          transaction_date: args.transaction_date || new Date().toISOString().split("T")[0], status: "completed",
          revenue_source: args.revenue_source || null,
          revenue_category: args.revenue_category || "Other",
        }).select("id, description, amount, revenue_source, revenue_category").single();
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Logged $${args.amount} revenue: "${args.description}"${args.revenue_source ? ` from ${args.revenue_source}` : ""}`, data };
      }

      case "create_milestone": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data, error } = await adminClient.from("artist_milestones").insert({
          artist_id: artistId, title: args.title, date: args.date, description: args.description || null,
        }).select("id, title, date").single();
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Added milestone "${args.title}" on ${args.date}`, data };
      }

      case "create_split_project": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data: project, error: projErr } = await adminClient.from("split_projects").insert({
          artist_id: artistId, name: args.project_name, project_type: args.project_type,
        }).select("id, name").single();
        if (projErr) return { success: false, message: projErr.message };
        const tracks = args.track_names.map((name: string, i: number) => ({ project_id: project.id, title: name, track_number: i + 1 }));
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
            artist_id: artistId, label: budget.label, amount: budget.amount,
          }).select("id, label, amount").single();
          if (error) results.push({ label: budget.label, error: error.message });
          else results.push({ id: data.id, label: data.label, amount: data.amount, status: "created" });
        }
        const created = results.filter(r => r.status === "created").length;
        return { success: created > 0, message: `Created ${created} budget(s)`, data: results };
      }

      case "create_campaign": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data, error } = await adminClient.from("initiatives").insert({
          artist_id: artistId, name: args.name, description: args.description || null,
          start_date: args.start_date || null, end_date: args.end_date || null,
        }).select("id, name").single();
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Created campaign "${args.name}"`, data };
      }

      // === UPDATE TOOLS ===
      case "update_tasks": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const results: any[] = [];
        for (const upd of args.updates) {
          const { data: found } = await adminClient.from("tasks").select("id")
            .eq("artist_id", artistId).ilike("title", `%${upd.current_title}%`).limit(1);
          if (!found || found.length === 0) { results.push({ title: upd.current_title, error: "Task not found" }); continue; }
          const updates: any = {};
          if (upd.new_title) updates.title = upd.new_title;
          if (upd.description !== undefined) updates.description = upd.description;
          if (upd.due_date) updates.due_date = upd.due_date;
          if (upd.is_completed !== undefined) { updates.is_completed = upd.is_completed; updates.completed_at = upd.is_completed ? new Date().toISOString() : null; }
          if (upd.expense_amount !== undefined) updates.expense_amount = upd.expense_amount;
          if (upd.assignee_name) { const resolved = await resolveUserId(adminClient, teamId, upd.assignee_name); if (resolved) updates.assigned_to = resolved; }
          const { error } = await adminClient.from("tasks").update(updates).eq("id", found[0].id);
          if (error) results.push({ title: upd.current_title, error: error.message });
          else results.push({ title: upd.new_title || upd.current_title, status: "updated" });
        }
        const updated = results.filter(r => r.status === "updated").length;
        return { success: updated > 0, message: `Updated ${updated} task(s)`, data: results };
      }

      case "update_milestone": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data: found } = await adminClient.from("artist_milestones").select("id")
          .eq("artist_id", artistId).ilike("title", `%${args.current_title}%`).limit(1);
        if (!found?.length) return { success: false, message: `Milestone "${args.current_title}" not found` };
        const updates: any = {};
        if (args.new_title) updates.title = args.new_title;
        if (args.date) updates.date = args.date;
        if (args.description !== undefined) updates.description = args.description;
        const { error } = await adminClient.from("artist_milestones").update(updates).eq("id", found[0].id);
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Updated milestone "${args.new_title || args.current_title}"` };
      }

      case "update_budget": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data: found } = await adminClient.from("budgets").select("id")
          .eq("artist_id", artistId).ilike("label", `%${args.current_label}%`).limit(1);
        if (!found?.length) return { success: false, message: `Budget "${args.current_label}" not found` };
        const updates: any = {};
        if (args.new_label) updates.label = args.new_label;
        if (args.amount !== undefined) updates.amount = args.amount;
        const { error } = await adminClient.from("budgets").update(updates).eq("id", found[0].id);
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Updated budget "${args.new_label || args.current_label}"` };
      }

      case "update_campaign": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data: found } = await adminClient.from("initiatives").select("id")
          .eq("artist_id", artistId).ilike("name", `%${args.current_name}%`).limit(1);
        if (!found?.length) return { success: false, message: `Campaign "${args.current_name}" not found` };
        const updates: any = {};
        if (args.new_name) updates.name = args.new_name;
        if (args.description !== undefined) updates.description = args.description;
        if (args.start_date) updates.start_date = args.start_date;
        if (args.end_date) updates.end_date = args.end_date;
        if (args.is_archived !== undefined) updates.is_archived = args.is_archived;
        const { error } = await adminClient.from("initiatives").update(updates).eq("id", found[0].id);
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Updated campaign "${args.new_name || args.current_name}"` };
      }

      case "update_expense":
      case "update_transaction": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data: found } = await adminClient.from("transactions").select("id, type")
          .eq("artist_id", artistId).ilike("description", `%${args.current_description}%`).limit(1);
        if (!found?.length) return { success: false, message: `Transaction "${args.current_description}" not found` };
        const updates: any = {};
        if (args.new_description) updates.description = args.new_description;
        if (args.amount !== undefined) updates.amount = args.amount;
        if (args.transaction_date) updates.transaction_date = args.transaction_date;
        if (args.status) updates.status = args.status;
        if (args.type) updates.type = args.type;
        if (args.revenue_source !== undefined) updates.revenue_source = args.revenue_source;
        if (args.revenue_category) updates.revenue_category = args.revenue_category;
        const { error } = await adminClient.from("transactions").update(updates).eq("id", found[0].id);
        if (error) return { success: false, message: error.message };
        const label = args.status === "completed" ? "Marked as paid" : `Updated transaction`;
        return { success: true, message: `${label}: "${args.new_description || args.current_description}"` };
      }

      // === DELETE TOOLS ===
      case "delete_tasks": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        let query = adminClient.from("tasks").delete().eq("artist_id", artistId);
        if (!args.delete_completed_too) query = query.eq("is_completed", false);
        if (args.task_titles?.length > 0) query = query.in("title", args.task_titles);
        const { data, error } = await query.select("id");
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Deleted ${data?.length || 0} task(s)`, data: { deleted: data?.length || 0 } };
      }

      case "delete_milestones": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        let query = adminClient.from("artist_milestones").delete().eq("artist_id", artistId);
        if (args.milestone_titles?.length > 0) query = query.in("title", args.milestone_titles);
        else query = query.gte("date", new Date().toISOString().split("T")[0]);
        const { data, error } = await query.select("id");
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Deleted ${data?.length || 0} milestone(s)`, data: { deleted: data?.length || 0 } };
      }

      case "delete_budgets": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        let query = adminClient.from("budgets").delete().eq("artist_id", artistId);
        if (args.budget_labels?.length > 0) query = query.in("label", args.budget_labels);
        const { data, error } = await query.select("id");
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Deleted ${data?.length || 0} budget(s)`, data: { deleted: data?.length || 0 } };
      }

      case "delete_expenses":
      case "delete_transactions": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const results: any[] = [];
        for (const desc of args.descriptions) {
          const { data, error } = await adminClient.from("transactions").delete()
            .eq("artist_id", artistId).ilike("description", `%${desc}%`).select("id");
          if (error) results.push({ description: desc, error: error.message });
          else results.push({ description: desc, deleted: data?.length || 0 });
        }
        const total = results.reduce((sum: number, r: any) => sum + (r.deleted || 0), 0);
        return { success: true, message: `Deleted ${total} transaction(s)`, data: results };
      }

      // === READ / RECALL TOOLS ===
      case "search_creators": {
        const { data, error } = await adminClient.rpc("search_creator_intelligence", {
          search_query: args.query || "", platform_filter: args.platform || null,
          category_filter: args.category || null, genre_filter: args.genre || null,
          min_confidence: args.min_confidence || 0, match_limit: args.limit || 10, p_team_id: teamId,
        });
        if (error) return { success: false, message: error.message };
        if (!data?.length) return { success: true, message: "No creators found.", data: [] };
        const formatted = data.map((c: any) => ({
          handle: c.handle, platform: c.platform, category: c.category, genre_fit: c.genre_fit,
          follower_count: c.follower_count, average_views: c.average_views, engagement_rate: c.engagement_rate,
          rate: c.rate, contact_info: c.contact_info, confidence_label: c.confidence_label,
          url: c.url, audience_type: c.audience_type, notes: c.notes,
        }));
        return { success: true, message: `Found ${data.length} creator(s)`, data: formatted };
      }

      case "get_artist_info": {
        const { data, error } = await adminClient.from("artists")
          .select("name, genres, primary_focus, secondary_focus, primary_goal, secondary_goal, primary_metric, secondary_metric, spotify_id, monthly_listeners, objective_1_type, objective_1_target, objective_2_type, objective_2_target, rolly_profile")
          .eq("team_id", teamId).ilike("name", `%${args.artist_name}%`).limit(1).single();
        if (error) return { success: false, message: `Artist "${args.artist_name}" not found` };
        return { success: true, message: `Artist info for "${data.name}"`, data };
      }

      case "get_artist_milestones": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data, error } = await adminClient.from("artist_milestones")
          .select("title, date, description, artist_timelines(name)")
          .eq("artist_id", artistId).gte("date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0])
          .order("date", { ascending: true }).limit(20);
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Found ${(data || []).length} milestone(s)`, data: data || [] };
      }

      case "get_artist_campaigns": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data, error } = await adminClient.from("initiatives")
          .select("name, description, start_date, end_date")
          .eq("artist_id", artistId).eq("is_archived", false)
          .order("start_date", { ascending: false }).limit(10);
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Found ${(data || []).length} campaign(s)`, data: data || [] };
      }

      case "get_artist_tasks": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        let query = adminClient.from("tasks")
          .select("title, description, due_date, is_completed, assigned_to, expense_amount")
          .eq("artist_id", artistId);
        if (!args.include_completed) query = query.eq("is_completed", false);
        const { data, error } = await query.order("due_date", { ascending: true, nullsFirst: false }).limit(50);
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Found ${(data || []).length} task(s)`, data: data || [] };
      }

      case "get_artist_budgets": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data, error } = await adminClient.from("budgets")
          .select("label, amount").eq("artist_id", artistId).order("label");
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Found ${(data || []).length} budget(s)`, data: data || [] };
      }

      case "get_artist_transactions": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        let query = adminClient.from("transactions")
          .select("description, amount, type, transaction_date, status, revenue_source, revenue_category")
          .eq("artist_id", artistId);
        if (args.type && args.type !== "all") query = query.eq("type", args.type);
        const { data, error } = await query.order("transaction_date", { ascending: false }).limit(args.limit || 20);
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Found ${(data || []).length} transaction(s)`, data: data || [] };
      }

      case "get_artist_contacts": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data, error } = await adminClient.from("artist_contacts")
          .select("name, role, email, phone").eq("artist_id", artistId).order("name");
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Found ${(data || []).length} contact(s)`, data: data || [] };
      }

      case "get_artist_links": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data, error } = await adminClient.from("artist_links")
          .select("title, url, description, artist_link_folders(name)")
          .eq("artist_id", artistId).order("sort_order");
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Found ${(data || []).length} link(s)`, data: data || [] };
      }

      case "get_artist_travel_info": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data, error } = await adminClient.from("artist_travel_info")
          .select("member_name, first_name, last_name, passport_name, date_of_birth, dietary_restrictions, preferred_airline, preferred_seat, ktn_number, tsa_precheck_number, shirt_size, pant_size, shoe_size, dress_size, hat_size, favorite_brands, drivers_license, pro_name, ipi_number, publisher_name, publishing_admin, publisher_pro, isni, spotify_uri, record_label, distributor, notes")
          .eq("artist_id", artistId);
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Found ${(data || []).length} member record(s)`, data: data || [] };
      }

      case "get_artist_splits": {
        const artistId = await resolveArtistId(adminClient, teamId, args.artist_name);
        if (!artistId) return { success: false, message: `Artist "${args.artist_name}" not found` };
        const { data, error } = await adminClient.from("split_projects")
          .select("name, project_type, split_songs(title, track_number)")
          .eq("artist_id", artistId).order("created_at", { ascending: false });
        if (error) return { success: false, message: error.message };
        return { success: true, message: `Found ${(data || []).length} split project(s)`, data: data || [] };
      }

      case "get_my_agenda": {
        const todayStr = new Date().toISOString().split("T")[0];
        const daysAhead = args.days_ahead || 7;
        const futureDate = new Date(Date.now() + daysAhead * 86400000).toISOString().split("T")[0];

        // Build artist filter if specified
        let artistFilter: string | null = null;
        if (args.artist_name) {
          artistFilter = await resolveArtistId(adminClient, teamId, args.artist_name);
          if (!artistFilter) return { success: false, message: `Artist "${args.artist_name}" not found` };
        }

        // Fetch tasks assigned to user (or all open tasks if no assignee filter needed)
        let tasksQuery = adminClient.from("tasks")
          .select("title, description, due_date, is_completed, priority, expense_amount, artists(name)")
          .eq("team_id", teamId)
          .eq("assigned_to", userId)
          .eq("is_completed", false)
          .order("priority", { ascending: true, nullsFirst: false })
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(30);
        if (artistFilter) tasksQuery = tasksQuery.eq("artist_id", artistFilter);
        const { data: myTasks } = await tasksQuery;

        // Separate overdue, today, and upcoming
        const overdue = (myTasks || []).filter((t: any) => t.due_date && t.due_date < todayStr);
        const today = (myTasks || []).filter((t: any) => t.due_date === todayStr);
        const upcoming = (myTasks || []).filter((t: any) => t.due_date && t.due_date > todayStr && t.due_date <= futureDate);
        const noDueDate = (myTasks || []).filter((t: any) => !t.due_date);

        // Fetch upcoming milestones
        let msQuery = adminClient.from("artist_milestones")
          .select("title, date, description, artists!inner(name, team_id)")
          .eq("artists.team_id", teamId)
          .gte("date", todayStr)
          .lte("date", futureDate)
          .order("date", { ascending: true })
          .limit(10);
        if (artistFilter) msQuery = msQuery.eq("artist_id", artistFilter);
        const { data: milestones } = await msQuery;

        return {
          success: true,
          message: `Found ${overdue.length} overdue, ${today.length} due today, ${upcoming.length} upcoming, ${noDueDate.length} undated tasks, and ${(milestones || []).length} milestones`,
          data: {
            overdue: overdue.map((t: any) => ({ title: t.title, due_date: t.due_date, priority: t.priority, artist: t.artists?.name })),
            due_today: today.map((t: any) => ({ title: t.title, priority: t.priority, artist: t.artists?.name, description: t.description })),
            upcoming: upcoming.map((t: any) => ({ title: t.title, due_date: t.due_date, priority: t.priority, artist: t.artists?.name })),
            no_due_date: noDueDate.slice(0, 10).map((t: any) => ({ title: t.title, priority: t.priority, artist: t.artists?.name })),
            milestones: (milestones || []).map((m: any) => ({ title: m.title, date: m.date, artist: m.artists?.name })),
          },
        };
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
        .eq("is_completed", false)
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

    for (let i = 0; i < 5; i++) {
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
