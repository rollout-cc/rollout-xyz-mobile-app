import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, parse } from "date-fns";
import { CalendarDays, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import rolloutLogo from "@/assets/rollout-logo.png";
import { useState } from "react";

export default function PublicAgenda() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["public_agenda", token],
    queryFn: async () => {
      const { data: artist, error: aErr } = await (supabase as any)
        .from("artists")
        .select("id, name, avatar_url, banner_url, agenda_public_token, agenda_is_public, team_id")
        .eq("agenda_public_token", token)
        .eq("agenda_is_public", true)
        .single();
      if (aErr) throw aErr;

      // Fetch team logo
      const { data: team } = await supabase
        .from("teams")
        .select("name, avatar_url")
        .eq("id", artist.team_id)
        .single();

      const [tasksRes, budgetsRes, transactionsRes, initiativesRes, milestonesRes] = await Promise.all([
        supabase.from("tasks").select("*").eq("artist_id", artist.id).eq("is_completed", false).order("due_date", { ascending: true }),
        supabase.from("budgets").select("*").eq("artist_id", artist.id),
        supabase.from("transactions").select("*").eq("artist_id", artist.id),
        supabase.from("initiatives").select("*").eq("artist_id", artist.id).eq("is_archived", false),
        supabase.from("artist_milestones").select("*").eq("artist_id", artist.id).order("date", { ascending: true }),
      ]);

      return {
        artist,
        team,
        tasks: tasksRes.data ?? [],
        budgets: budgetsRes.data ?? [],
        transactions: transactionsRes.data ?? [],
        initiatives: initiativesRes.data ?? [],
        milestones: milestonesRes.data ?? [],
      };
    },
    enabled: !!token,
  });

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (error || !data) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">This agenda is not available or has been disabled.</div>;
  }

  const { artist, team, tasks, budgets, transactions, initiatives, milestones } = data;
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const formatMoney = (n: number) => `$${n.toLocaleString()}`;

  const budgetCards = budgets.map((b: any) => {
    const spent = transactions.filter((t: any) => t.budget_id === b.id).reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0);
    const pct = Number(b.amount) > 0 ? Math.min((spent / Number(b.amount)) * 100, 100) : 0;
    return { ...b, spent, pct };
  });

  const campaignSections = initiatives.map((init: any) => {
    const campaignTasks = tasks.filter((t: any) => t.initiative_id === init.id);
    return { ...init, tasks: campaignTasks };
  }).filter((c: any) => c.tasks.length > 0);

  // Exclude campaign tasks from "This Week" to prevent duplicates
  const campaignTaskIds = new Set(campaignSections.flatMap((c: any) => c.tasks.map((t: any) => t.id)));

  const weeklyTasks = tasks.filter((t: any) => {
    if (!t.due_date) return false;
    if (campaignTaskIds.has(t.id)) return false;
    const d = new Date(t.due_date);
    return d >= weekStart && d <= weekEnd;
  });

  const weeklyMilestones = milestones.filter((m: any) => {
    const d = parse(m.date, "yyyy-MM-dd", new Date());
    return d >= weekStart && d <= weekEnd;
  });

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {team?.avatar_url && (
            <img src={team.avatar_url} alt="" className="h-7 w-7 rounded-md object-cover" />
          )}
          <img src={rolloutLogo} alt="Rollout" className="h-6 invert dark:invert-0" />
        </div>
        <Link to="/login" className="text-sm font-medium px-5 py-2 rounded-full border border-border hover:bg-accent transition-colors">
          Sign In
        </Link>
      </div>

      <div className="max-w-[820px] mx-auto px-6 py-10">
        {/* Artist header */}
        <div className="flex items-center gap-4 mb-8">
          <Avatar className="h-14 w-14">
            <AvatarImage src={artist.avatar_url ?? undefined} />
            <AvatarFallback className="text-lg">{artist.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-muted-foreground">{artist.name}</p>
            <h1 className="text-2xl font-bold">Meeting Agenda</h1>
            <p className="text-xs text-muted-foreground">
              Week of {format(weekStart, "MMMM d")} – {format(weekEnd, "MMMM d, yyyy")}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm mb-6">
          <span>Open Work <strong>{tasks.length}</strong></span>
          <span>Campaigns <strong>{initiatives.length}</strong></span>
        </div>

        {/* Budget cards */}
        {budgetCards.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {budgetCards.map((b: any) => {
              const pctColor = b.pct > 90 ? "bg-destructive" : b.pct > 60 ? "bg-orange-500" : "bg-emerald-500";
              return (
                <div key={b.id} className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground mb-1">{b.label}</div>
                  <div className="text-sm font-bold">{formatMoney(b.spent)}/{formatMoney(Number(b.amount))}</div>
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", pctColor)} style={{ width: `${b.pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* This Week's Tasks */}
        <Section
          title="This Week"
          subtitle={`${format(weekStart, "MMMM d")} - ${format(weekEnd, "MMMM d, yyyy")}`}
          open={!collapsed["week"]}
          onToggle={() => toggle("week")}
        >
          {weeklyTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">No work due this week.</p>
          ) : (
            <div className="space-y-2">
              {weeklyTasks.map((t: any) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          )}
        </Section>

        {/* Campaigns */}
        {campaignSections.map((campaign: any) => (
          <Section
            key={campaign.id}
            title={campaign.name}
            subtitle={campaign.start_date ? format(new Date(campaign.start_date), "MMM d, yyyy") : undefined}
            open={!collapsed[campaign.id]}
            onToggle={() => toggle(campaign.id)}
          >
            <div className="space-y-2">
              {campaign.tasks.map((t: any) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          </Section>
        ))}

        {/* Milestones */}
        {weeklyMilestones.length > 0 && (
          <Section
            title="Milestones This Week"
            subtitle={`${format(weekStart, "MMMM d")} - ${format(weekEnd, "MMMM d, yyyy")}`}
            open={!collapsed["milestones"]}
            onToggle={() => toggle("milestones")}
          >
            <div className="grid grid-cols-2 gap-3 mt-2">
              {weeklyMilestones.map((m: any) => (
                <div key={m.id} className="rounded-lg border border-border p-4">
                  <div className="font-semibold text-sm">{m.title}</div>
                  {m.description && <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3">
                    <CalendarDays className="h-3 w-3" />
                    {format(parse(m.date, "yyyy-MM-dd", new Date()), "MMMM d, yyyy")}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border mt-16">
        <div className="max-w-[820px] mx-auto px-6 py-8 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img src={rolloutLogo} alt="Rollout" className="h-5 invert dark:invert-0" />
            <div>
              <p className="font-semibold text-sm">Grow your music business with Rollout</p>
              <p className="text-xs text-muted-foreground">Forward thinkers in the music industry save monthly hundreds of hours thanks to Rollout.</p>
            </div>
          </div>
          <Link to="/login" className="shrink-0 text-sm font-medium px-6 py-2.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity">
            Apply
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, open, onToggle, children }: { title: string; subtitle?: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-t border-border py-4 mb-2">
      <button onClick={onToggle} className="flex items-center justify-between w-full text-left">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function TaskRow({ task }: { task: any }) {
  return (
    <div className="flex items-center gap-3 py-2 px-1">
      <div className="h-4 w-4 rounded border border-border shrink-0" />
      <span className="text-sm font-medium flex-1">{task.title}</span>
      {task.expense_amount && (
        <span className="text-xs text-muted-foreground">${Number(task.expense_amount).toLocaleString()}</span>
      )}
      {task.due_date && (
        <span className="text-xs text-muted-foreground">{format(new Date(task.due_date), "MMM d, yyyy")}</span>
      )}
    </div>
  );
}
