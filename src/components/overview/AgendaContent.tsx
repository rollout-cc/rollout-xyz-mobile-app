/**
 * AgendaContent — extracted from pages/Agenda.tsx for embedding in Company tabs.
 * Renders the full Agenda UI without AppLayout wrapper.
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, DollarSign, ChevronDown, ChevronUp, User, Copy, Check, Share2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { format, startOfWeek, endOfWeek, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";


export function AgendaContent() {
  const { selectedTeamId: teamId } = useSelectedTeam();
  const queryClient = useQueryClient();

  const { data: artists = [] } = useQuery({
    queryKey: ["agenda-artists", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("id, name, avatar_url, agenda_is_public, agenda_public_token")
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

  const { data: budgets = [] } = useQuery({
    queryKey: ["agenda-budgets", artistId],
    queryFn: async () => {
      const { data, error } = await supabase.from("budgets").select("*").eq("artist_id", artistId!);
      if (error) throw error;
      return data;
    },
    enabled: !!artistId,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["agenda-transactions", artistId],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*").eq("artist_id", artistId!);
      if (error) throw error;
      return data;
    },
    enabled: !!artistId,
  });

  const { data: initiatives = [] } = useQuery({
    queryKey: ["agenda-initiatives", artistId],
    queryFn: async () => {
      const { data, error } = await supabase.from("initiatives").select("*").eq("artist_id", artistId!);
      if (error) throw error;
      return data;
    },
    enabled: !!artistId,
  });

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

  const { data: artistPermissions = [] } = useQuery({
    queryKey: ["agenda-artist-permissions", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_permissions")
        .select("user_id, permission")
        .eq("artist_id", artistId!)
        .neq("permission", "no_access");
      if (error) throw error;
      return data;
    },
    enabled: !!artistId,
  });

  const { data: teamOwnersManagers = [] } = useQuery({
    queryKey: ["agenda-team-owners-managers", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select("user_id")
        .eq("team_id", teamId!)
        .in("role", ["team_owner", "manager"]);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const artistMemberIds = useMemo(() => {
    const ids = new Set<string>();
    artistPermissions.forEach((p) => ids.add(p.user_id));
    teamOwnersManagers.forEach((m) => ids.add(m.user_id));
    return Array.from(ids);
  }, [artistPermissions, teamOwnersManagers]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["agenda-profiles", artistMemberIds],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", artistMemberIds);
      if (error) throw error;
      return data;
    },
    enabled: artistMemberIds.length > 0,
  });

  const profileMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((p: any) => { map[p.id] = p.full_name || "?"; });
    return map;
  }, [profiles]);

  const scopedMemberIds = useMemo(() => artistMemberIds.filter((id) => profileMap[id]), [artistMemberIds, profileMap]);

  useEffect(() => { setSelectedAssignees([]); }, [artistId]);

  const allSelected = selectedAssignees.length === 0;
  const noneSelected = selectedAssignees.length > 0 && selectedAssignees[0] === "__none__";

  const toggleAssignee = useCallback((uid: string) => {
    setSelectedAssignees((prev) => {
      if (prev.length === 0 || (prev.length === 1 && prev[0] === "__none__")) return [uid];
      if (prev.includes(uid)) {
        const next = prev.filter((id) => id !== uid);
        return next.length === 0 ? ["__none__"] : next;
      }
      const next = [...prev, uid];
      return next.length === scopedMemberIds.length ? [] : next;
    });
  }, [scopedMemberIds]);

  const toggleSelectAll = useCallback(() => {
    setSelectedAssignees((prev) => (prev.length === 0 ? ["__none__"] : []));
  }, []);

  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  const filteredTasks = allSelected ? tasks : noneSelected ? [] : tasks.filter((t) => t.assigned_to && selectedAssignees.includes(t.assigned_to));
  const openTaskCount = filteredTasks.length;
  const campaignCount = initiatives.length;

  const budgetCards = budgets.map((b) => {
    const spent = transactions.filter((t) => t.budget_id === b.id).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    const pct = Number(b.amount) > 0 ? Math.min((spent / Number(b.amount)) * 100, 100) : 0;
    return { ...b, spent, pct };
  });

  const weeklyTasks = filteredTasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return d >= weekStart && d <= weekEnd;
  });

  const weeklyMilestones = milestones.filter((m: any) => {
    const d = parse(m.date, "yyyy-MM-dd", new Date());
    return d >= weekStart && d <= weekEnd;
  });

  const campaignSections = initiatives.map((init) => {
    const campaignTasks = filteredTasks.filter((t) => t.initiative_id === init.id);
    return { ...init, tasks: campaignTasks };
  }).filter((c) => c.tasks.length > 0);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));
  const formatMoney = (n: number) => `$${n.toLocaleString()}`;
  const formatMoneyAbbr = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return `$${n.toLocaleString()}`;
  };

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
    if (weeklyTasks.length === 0) lines.push("  No tasks due this week.");
    else weeklyTasks.forEach((t) => {
      const due = t.due_date ? format(new Date(t.due_date), "MMM d") : "";
      const cost = t.expense_amount ? ` — $${Number(t.expense_amount).toLocaleString()}` : "";
      lines.push(`  ☐ ${t.title}${cost}${due ? ` (${due})` : ""}`);
    });
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

  if (!teamId) return <p className="text-muted-foreground">Loading...</p>;

  const weekRangeShort = `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}`;
  const weekRangeFull = `${format(weekStart, "MMMM d")} – ${format(weekEnd, "MMMM d, yyyy")}`;

  return (
    <div>
      {/* Filters — two rows on mobile, single row on desktop. All controls use h-9 for consistent height. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 mb-6">
        {/* Row 1: artist + members */}
        <div className="flex items-center gap-2 min-w-0">
          <Select value={artistId || ""} onValueChange={(v) => setSelectedArtistId(v)}>
            <SelectTrigger className="h-9 flex-1 sm:w-[200px] sm:flex-none text-sm">
              <div className="flex items-center gap-2">
                {artist && (
                  <Avatar className="h-5 w-5 shrink-0">
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
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5 px-3 h-9">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm hidden sm:inline truncate max-w-[120px]">
                  {allSelected ? "All Members" : noneSelected ? "No Members" : selectedAssignees.length === 1 ? profileMap[selectedAssignees[0]] || "1 Member" : `${selectedAssignees.length} Members`}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[200px] p-1">
              <button onClick={toggleSelectAll} className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent">
                <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                <span>Select All</span>
              </button>
              <div className="h-px bg-border my-1" />
              {scopedMemberIds.map((uid) => {
                const checked = allSelected || (!noneSelected && selectedAssignees.includes(uid));
                return (
                  <button key={uid} onClick={() => toggleAssignee(uid)} className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent">
                    <Checkbox checked={checked} onCheckedChange={() => toggleAssignee(uid)} />
                    <span className="truncate">{profileMap[uid] || "?"}</span>
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        </div>

        {/* Row 2 on mobile / continues same row on desktop: export + share */}
        {artist && (
          <div className="flex items-center gap-2 sm:ml-auto h-9">
            <Button variant="outline" size="sm" className="gap-1.5 h-9 flex-1 sm:flex-none" onClick={exportAgenda}>
              <Copy className="h-3.5 w-3.5" />
              <span>Export</span>
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-9 flex-1 sm:flex-none">
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[300px] p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Public Link</span>
                    <Switch
                      checked={(artist as any).agenda_is_public ?? false}
                      onCheckedChange={async (checked) => {
                        await supabase.from("artists").update({ agenda_is_public: checked } as any).eq("id", artist.id);
                        queryClient.invalidateQueries({ queryKey: ["agenda-artists", teamId] });
                        toast.success(checked ? "Agenda sharing enabled" : "Agenda sharing disabled");
                      }}
                    />
                  </div>
                  {(artist as any).agenda_is_public && (artist as any).agenda_public_token && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Anyone with this link can view this agenda.</p>
                      <div className="flex gap-2">
                        <input readOnly value={`https://app.rollout.cc/shared/agenda/${(artist as any).agenda_public_token}`} className="flex-1 text-xs bg-muted rounded px-2 py-1.5 border border-border truncate" />
                        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(`https://app.rollout.cc/shared/agenda/${(artist as any).agenda_public_token}`); toast.success("Link copied!"); }}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {!artist ? (
        <p className="text-muted-foreground text-sm">Select an artist to view their agenda.</p>
      ) : (
        <>
          {/* Artist header */}
          <div className="flex items-center justify-between gap-3 mb-5 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={artist.avatar_url ?? undefined} />
                <AvatarFallback className="text-base">{artist.name[0]}</AvatarFallback>
              </Avatar>
              <h2 className="truncate">{artist.name}</h2>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
              <div className="text-center">
                <div className="text-base font-bold text-foreground">{openTaskCount}</div>
                <div>Tasks</div>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="text-center">
                <div className="text-base font-bold text-foreground">{campaignCount}</div>
                <div>Campaigns</div>
              </div>
            </div>
          </div>

          {/* Budget cards */}
          {budgetCards.length > 0 && (
            <div className="flex gap-2.5 overflow-x-auto pb-2 mb-6 min-w-0 scrollbar-hide">
              {budgetCards.map((b) => {
                const pctColor = b.pct > 90 ? "bg-destructive" : b.pct > 60 ? "bg-orange-500" : "bg-emerald-500";
                return (
                  <div key={b.id} className="min-w-[140px] sm:min-w-[160px] rounded-lg border border-border p-3 shrink-0">
                    <div className="text-[11px] text-muted-foreground mb-1 truncate">{b.label}</div>
                    <div className="text-sm font-bold tabular-nums">
                      <span className="sm:hidden">
                        {formatMoneyAbbr(b.spent)}<span className="font-normal text-muted-foreground">/{formatMoneyAbbr(Number(b.amount))}</span>
                      </span>
                      <span className="hidden sm:inline">
                        {formatMoney(b.spent)}<span className="font-normal text-muted-foreground">/{formatMoney(Number(b.amount))}</span>
                      </span>
                    </div>
                    <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", pctColor)} style={{ width: `${b.pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <AgendaSection
            title="This Week"
            subtitle={<><span className="sm:hidden">{weekRangeShort}</span><span className="hidden sm:inline">{weekRangeFull}</span></>}
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
          </AgendaSection>

          {campaignSections.map((campaign) => (
            <AgendaSection
              key={campaign.id}
              title={campaign.name}
              open={!collapsed[campaign.id]}
              onToggle={() => toggle(campaign.id)}
            >
              <div className="space-y-0">
                {campaign.tasks.map((t) => (
                  <TaskRow key={t.id} task={t} initiatives={initiatives} profileMap={profileMap} />
                ))}
              </div>
            </AgendaSection>
          ))}

          <AgendaSection
            title="Milestones"
            subtitle={<><span className="sm:hidden">{weekRangeShort}</span><span className="hidden sm:inline">{weekRangeFull}</span></>}
            open={!collapsed["milestones"]}
            onToggle={() => toggle("milestones")}
          >
            {weeklyMilestones.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">No milestones this week.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-2">
                {weeklyMilestones.map((m: any) => (
                  <div key={m.id} className="rounded-lg border border-border p-3">
                    <div className="font-semibold text-sm">{m.title}</div>
                    {m.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.description}</div>}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2.5">
                      <CalendarDays className="h-3 w-3 shrink-0" />
                      {format(parse(m.date, "yyyy-MM-dd", new Date()), "MMM d, yyyy")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AgendaSection>
        </>
      )}
    </div>
  );
}
function AgendaSection({ title, subtitle, open, onToggle, children }: { title: string; subtitle?: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-t border-border py-4 mb-2">
      <button onClick={onToggle} className="flex items-center justify-between w-full text-left gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-snug">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function TaskRow({ task, initiatives, profileMap }: { task: any; initiatives: any[]; profileMap: Record<string, string> }) {
  const now = new Date();
  const isOverdue = task.due_date && new Date(task.due_date) < now;
  const initiative = task.initiative_id ? initiatives.find((i) => i.id === task.initiative_id) : null;
  const assigneeName = task.assigned_to ? profileMap[task.assigned_to] : null;
  const hasMeta = task.due_date || (task.expense_amount != null && task.expense_amount > 0) || assigneeName;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-b-0">
      <div className="h-4 w-4 rounded border-2 border-muted-foreground/30 mt-[3px] shrink-0" />
      <div className="flex-1 min-w-0">
        {/* Title + description */}
        <p className="font-medium text-sm leading-snug">{task.title}</p>
        {(initiative || task.description) && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {initiative && <strong>{initiative.name}</strong>}
            {initiative && task.description && " · "}
            {task.description}
          </p>
        )}
        {/* Meta row — date, cost, assignee */}
        {hasMeta && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {task.due_date && (
              <span className={cn(
                "text-[11px] font-medium px-1.5 py-0.5 rounded",
                isOverdue ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
              )}>
                {format(new Date(task.due_date), "MMM d")}
              </span>
            )}
            {task.expense_amount != null && task.expense_amount > 0 && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                <DollarSign className="h-2.5 w-2.5" />{Number(task.expense_amount).toLocaleString()}
              </span>
            )}
            {assigneeName && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <User className="h-2.5 w-2.5" />{assigneeName}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
