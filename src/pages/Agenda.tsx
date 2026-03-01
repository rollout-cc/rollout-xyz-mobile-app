import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, DollarSign, ChevronDown, ChevronUp, User, Copy, Check } from "lucide-react";
import { format, startOfWeek, endOfWeek, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Agenda() {
  const { selectedTeamId: teamId } = useSelectedTeam();

  // Artists for picker
  const { data: artists = [] } = useQuery({
    queryKey: ["agenda-artists", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("id, name, avatar_url")
        .eq("team_id", teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const artistId = selectedArtistId || artists[0]?.id;
  const artist = artists.find((a) => a.id === artistId);

  // Budgets
  const { data: budgets = [] } = useQuery({
    queryKey: ["agenda-budgets", artistId],
    queryFn: async () => {
      const { data, error } = await supabase.from("budgets").select("*").eq("artist_id", artistId!);
      if (error) throw error;
      return data;
    },
    enabled: !!artistId,
  });

  // Transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ["agenda-transactions", artistId],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*").eq("artist_id", artistId!);
      if (error) throw error;
      return data;
    },
    enabled: !!artistId,
  });

  // Initiatives (campaigns)
  const { data: initiatives = [] } = useQuery({
    queryKey: ["agenda-initiatives", artistId],
    queryFn: async () => {
      const { data, error } = await supabase.from("initiatives").select("*").eq("artist_id", artistId!);
      if (error) throw error;
      return data;
    },
    enabled: !!artistId,
  });

  // Tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ["agenda-tasks", teamId, artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("team_id", teamId!)
        .eq("artist_id", artistId!)
        .eq("is_completed", false)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!teamId && !!artistId,
  });

  // Milestones
  const { data: milestones = [] } = useQuery({
    queryKey: ["agenda-milestones", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_milestones")
        .select("*")
        .eq("artist_id", artistId!)
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!artistId,
  });

  // Artist-specific permissions (members with access)
  const { data: artistPerms = [] } = useQuery({
    queryKey: ["agenda-artist-perms", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_permissions")
        .select("user_id")
        .eq("artist_id", artistId!)
        .in("permission", ["view_access", "full_access"]);
      if (error) throw error;
      return data;
    },
    enabled: !!artistId,
  });

  // Profiles for assignees
  const { data: profiles = [] } = useQuery({
    queryKey: ["agenda-profiles", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select("user_id, profiles(full_name)")
        .eq("team_id", teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const profileMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((p: any) => {
      map[p.user_id] = (p.profiles as any)?.full_name || "?";
    });
    return map;
  }, [profiles]);

  // Scoped member list: if artist has permissions configured, use those; else all team members
  const scopedMemberIds = useMemo(() => {
    const allIds = Object.keys(profileMap);
    if (artistPerms.length === 0) return allIds;
    const permIds = artistPerms.map((p) => p.user_id);
    return allIds.filter((id) => permIds.includes(id));
  }, [profileMap, artistPerms]);

  // Reset assignees when artist changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setSelectedAssignees([]); }, [artistId]);

  const allSelected = selectedAssignees.length === 0 || selectedAssignees.length === scopedMemberIds.length;

  const toggleAssignee = useCallback((uid: string) => {
    setSelectedAssignees((prev) => {
      if (prev.length === 0) {
        // Currently "all" — deselect this one by selecting everyone else
        return scopedMemberIds.filter((id) => id !== uid);
      }
      if (prev.includes(uid)) {
        const next = prev.filter((id) => id !== uid);
        return next.length === 0 ? [] : next; // empty = all
      }
      const next = [...prev, uid];
      return next.length === scopedMemberIds.length ? [] : next;
    });
  }, [scopedMemberIds]);

  const toggleAll = useCallback(() => {
    setSelectedAssignees((prev) => (prev.length === 0 ? ["__none__"] : []));
  }, []);

  // Calculations
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  // Filter tasks by assignees
  const filteredTasks = allSelected
    ? tasks
    : selectedAssignees[0] === "__none__"
      ? []
      : tasks.filter((t) => t.assigned_to && selectedAssignees.includes(t.assigned_to));

  const openTaskCount = filteredTasks.length;
  const campaignCount = initiatives.length;

  // Budget per category with spent
  const budgetCards = budgets.map((b) => {
    const spent = transactions
      .filter((t) => t.budget_id === b.id)
      .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    const pct = Number(b.amount) > 0 ? Math.min((spent / Number(b.amount)) * 100, 100) : 0;
    return { ...b, spent, pct };
  });

  // Tasks due this week
  const weeklyTasks = filteredTasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return d >= weekStart && d <= weekEnd;
  });

  // Milestones this week
  const weeklyMilestones = milestones.filter((m: any) => {
    const d = parse(m.date, "yyyy-MM-dd", new Date());
    return d >= weekStart && d <= weekEnd;
  });

  // Group tasks by initiative
  const campaignSections = initiatives.map((init) => {
    const campaignTasks = filteredTasks.filter((t) => t.initiative_id === init.id);
    return { ...init, tasks: campaignTasks };
  }).filter((c) => c.tasks.length > 0);

  // Collapsible state
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));

  const formatMoney = (n: number) => `$${n.toLocaleString()}`;

  const exportAgenda = useCallback(() => {
    if (!artist) return;
    const lines: string[] = [];
    lines.push(`AGENDA — ${artist.name}`);
    lines.push(`Week of ${format(weekStart, "MMMM d")} – ${format(weekEnd, "MMMM d, yyyy")}`);
    lines.push(`Open Tasks: ${openTaskCount} | Campaigns: ${campaignCount}`);
    lines.push("");

    if (budgetCards.length > 0) {
      lines.push("BUDGETS");
      budgetCards.forEach((b) => lines.push(`  ${b.label}: ${formatMoney(b.spent)} / ${formatMoney(Number(b.amount))} (${Math.round(b.pct)}%)`));
      lines.push("");
    }

    lines.push("THIS WEEK'S TASKS");
    if (weeklyTasks.length === 0) { lines.push("  No tasks due this week."); }
    else { weeklyTasks.forEach((t) => {
      const due = t.due_date ? format(new Date(t.due_date), "MMM d") : "";
      const cost = t.expense_amount ? ` — $${Number(t.expense_amount).toLocaleString()}` : "";
      lines.push(`  ☐ ${t.title}${cost}${due ? ` (${due})` : ""}`);
    }); }
    lines.push("");

    campaignSections.forEach((c) => {
      lines.push(`CAMPAIGN: ${c.name}`);
      c.tasks.forEach((t) => {
        const due = t.due_date ? format(new Date(t.due_date), "MMM d") : "";
        lines.push(`  ☐ ${t.title}${due ? ` (${due})` : ""}`);
      });
      lines.push("");
    });

    if (weeklyMilestones.length > 0) {
      lines.push("MILESTONES THIS WEEK");
      weeklyMilestones.forEach((m: any) => {
        lines.push(`  • ${m.title} — ${format(parse(m.date, "yyyy-MM-dd", new Date()), "MMM d, yyyy")}`);
      });
    }

    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Agenda copied to clipboard");
  }, [artist, budgetCards, weeklyTasks, campaignSections, weeklyMilestones, openTaskCount, campaignCount, weekStart, weekEnd]);

  if (!teamId) return <AppLayout title="Agenda"><p className="text-muted-foreground">Loading...</p></AppLayout>;

  return (
    <AppLayout title="Agenda">
      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <Select value={artistId || ""} onValueChange={(v) => setSelectedArtistId(v)}>
          <SelectTrigger className="w-[200px]">
            <div className="flex items-center gap-2">
              {artist && (
                <Avatar className="h-5 w-5">
                  <AvatarImage src={artist.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">{artist.name[0]}</AvatarFallback>
                </Avatar>
              )}
              <SelectValue placeholder="Select artist" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {artists.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[180px] justify-start gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate text-sm">
                {allSelected
                  ? "All Members"
                  : selectedAssignees.length === 1
                    ? profileMap[selectedAssignees[0]] || "1 Member"
                    : `${selectedAssignees.length} Members`}
              </span>
              <ChevronDown className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[200px] p-1">
            <button
              onClick={toggleAll}
              className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              <span>Select All</span>
            </button>
            <div className="h-px bg-border my-1" />
            {scopedMemberIds.map((uid) => {
              const checked = allSelected || selectedAssignees.includes(uid);
              return (
                <button
                  key={uid}
                  onClick={() => toggleAssignee(uid)}
                  className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggleAssignee(uid)} />
                  <span className="truncate">{profileMap[uid] || "?"}</span>
                </button>
              );
            })}
          </PopoverContent>
        </Popover>
        {artist && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportAgenda}>
            <Copy className="h-3.5 w-3.5" /> Export View
          </Button>
        )}
      </div>

      {!artist ? (
        <p className="text-muted-foreground text-sm">Select an artist to view their agenda.</p>
      ) : (
        <>
          {/* Artist header */}
          <div className="flex items-start gap-5 mb-6">
            <Avatar className="h-16 w-16">
              <AvatarImage src={artist.avatar_url ?? undefined} />
              <AvatarFallback className="text-xl">{artist.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2>{artist.name}</h2>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span>Open Tasks <strong>{openTaskCount}</strong></span>
              <span>Campaigns <strong>{campaignCount}</strong></span>
            </div>
          </div>

          {/* Budget categories row */}
          {budgetCards.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2 mb-8">
              {budgetCards.map((b) => {
                const pctColor = b.pct > 90 ? "bg-destructive" : b.pct > 60 ? "bg-orange-500" : "bg-emerald-500";
                return (
                  <div key={b.id} className="min-w-[160px] rounded-lg border border-border p-3 shrink-0">
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
          <CollapsibleSection
            title="This Week"
            subtitle={`${format(weekStart, "MMMM d")} - ${format(weekEnd, "MMMM d, yyyy")}`}
            open={!collapsed["week"]}
            onToggle={() => toggle("week")}
          >
            {weeklyTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">No tasks due this week.</p>
            ) : (
              <div className="space-y-0">
                {weeklyTasks.map((t) => (
                  <TaskRow key={t.id} task={t} initiatives={initiatives} profileMap={profileMap} />
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* Campaigns with tasks */}
          {campaignSections.map((campaign) => (
            <CollapsibleSection
              key={campaign.id}
              title={campaign.name}
              subtitle={
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  {campaign.start_date && (
                    <span className={cn("flex items-center gap-1", campaign.start_date && new Date(campaign.start_date) < now ? "text-destructive" : "")}>
                      <CalendarDays className="h-3 w-3" /> {format(new Date(campaign.start_date), "MMM d, yyyy")}
                    </span>
                  )}
                </span>
              }
              open={!collapsed[campaign.id]}
              onToggle={() => toggle(campaign.id)}
            >
              <div className="space-y-0">
                {campaign.tasks.map((t) => (
                  <TaskRow key={t.id} task={t} initiatives={initiatives} profileMap={profileMap} />
                ))}
              </div>
            </CollapsibleSection>
          ))}

          {/* Milestones This Week */}
          <CollapsibleSection
            title="Milestones This Week"
            subtitle={`${format(weekStart, "MMMM d")} - ${format(weekEnd, "MMMM d, yyyy")}`}
            open={!collapsed["milestones"]}
            onToggle={() => toggle("milestones")}
          >
            {weeklyMilestones.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">No milestones this week.</p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
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
            )}
          </CollapsibleSection>
        </>
      )}
    </AppLayout>
  );
}

/* ── Collapsible Section ── */
function CollapsibleSection({
  title, subtitle, open, onToggle, children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border py-4 mb-2">
      <button onClick={onToggle} className="flex items-center justify-between w-full text-left">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
        </div>
        {open ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

/* ── Task Row ── */
function TaskRow({
  task, initiatives, profileMap,
}: {
  task: any;
  initiatives: any[];
  profileMap: Record<string, string>;
}) {
  const now = new Date();
  const isOverdue = task.due_date && new Date(task.due_date) < now;
  const initiative = task.initiative_id ? initiatives.find((i) => i.id === task.initiative_id) : null;
  const assigneeName = task.assigned_to ? profileMap[task.assigned_to] : null;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-b-0">
      <div className="h-5 w-5 rounded border-2 border-muted-foreground/30 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{task.title}</span>
          {task.expense_amount != null && task.expense_amount > 0 && (
            <span className="text-xs text-muted-foreground">${Number(task.expense_amount).toLocaleString()}</span>
          )}
          {task.due_date && (
            <span className={cn("text-xs px-1.5 py-0.5 rounded", isOverdue ? "bg-destructive/10 text-destructive font-medium" : "text-muted-foreground")}>
              {format(new Date(task.due_date), "MMM d, yyyy")}
            </span>
          )}
          {assigneeName && <User className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
        {(initiative || task.description) && (
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {initiative && <strong>{initiative.name}</strong>}
            {initiative && task.description && " "}
            {task.description}
          </div>
        )}
      </div>
    </div>
  );
}
