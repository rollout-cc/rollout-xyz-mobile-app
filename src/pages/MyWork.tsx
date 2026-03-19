import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { format, isToday, isPast } from "date-fns";
import { useNavigate, useLocation } from "react-router-dom";
import { Music2, Users, Wallet, CalendarDays, Clock, Inbox, ListChecks, StickyNote } from "lucide-react";
import { cn, formatLocalDate } from "@/lib/utils";
import { PullToRefresh } from "@/components/PullToRefresh";
import { toast } from "sonner";
import { useArtists } from "@/hooks/useArtists";
import { NotesPanel } from "@/components/notes/NotesPanel";
import { useTour } from "@/contexts/TourContext";
import { useNotes } from "@/hooks/useNotes";
import { WorkTaskItem } from "@/components/work/WorkTaskItem";
import { WorkItemCreator } from "@/components/work/WorkItemCreator";
import { parseRevenueIntent } from "@/lib/revenueParser";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";

type Tab = "tasks" | "notes";

type TaskArtist = { id: string; name: string; avatar_url: string | null };

function ArtistFilterAvatar({
  name,
  avatarUrl,
  className,
}: {
  name: string;
  avatarUrl: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0",
        className,
      )}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
          {name.trim().slice(0, 1).toUpperCase() || "?"}
        </span>
      )}
    </div>
  );
}

/** Single icon for “All artists” — avoids duplicating avatars (SelectValue already mirrors the selected row). */
function AllArtistsGlyph({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-full bg-muted ring-1 ring-border/35 shrink-0",
        className,
      )}
    >
      <Users className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );
}

function MyWorkArtistFilter({
  value,
  onChange,
  taskArtists,
}: {
  value: string;
  onChange: (v: string) => void;
  taskArtists: TaskArtist[];
}) {
  if (taskArtists.length === 0) return null;
  return (
    <span data-tour="mywork-filter" className="inline-flex min-w-0 max-w-[min(14rem,52vw)] shrink md:max-w-[220px]">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className={cn(
            "h-9 min-h-9 rounded-full border-border/40 bg-background/95 pl-2.5 pr-2 gap-2 shadow-sm",
            "hover:border-border/55 hover:shadow-md transition-[box-shadow,border-color,background-color] duration-200",
            "focus:ring-2 focus:ring-ring/25 focus:ring-offset-0",
            "w-full min-w-[7rem] [&>span]:flex [&>span]:min-w-0 [&>span]:flex-1 [&>span]:items-center [&>span]:gap-2",
          )}
        >
          <SelectValue placeholder="All artists" />
        </SelectTrigger>
        <SelectContent
          position="popper"
          sideOffset={6}
          className="rounded-xl border-border/50 bg-popover/95 shadow-xl backdrop-blur-md z-[200] min-w-[var(--radix-select-trigger-width)] max-h-[min(22rem,55dvh)] p-0"
        >
          <SelectItem
            value="all"
            textValue="All artists"
            className="py-1.5 pl-8 pr-2 rounded-none text-sm min-h-0 h-auto"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <AllArtistsGlyph className="h-6 w-6" />
              <span className="truncate font-medium">All artists</span>
            </span>
          </SelectItem>
          {taskArtists.map((a) => (
            <SelectItem
              key={a.id}
              value={a.id}
              textValue={a.name}
              className="py-1.5 pl-8 pr-2 rounded-none text-sm min-h-0 h-auto"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <ArtistFilterAvatar
                  name={a.name}
                  avatarUrl={a.avatar_url}
                  className="h-6 w-6 ring-1 ring-border/30"
                />
                <span className="truncate font-medium">{a.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  );
}

function WorkNotesTabs({
  tab,
  setTab,
  fill = false,
}: {
  tab: Tab;
  setTab: (value: Tab) => void;
  /** When true, grows to share horizontal space (mobile subnav, Rolly-style). */
  fill?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-1 rounded-[0.875rem] bg-muted/40 p-1 ring-1 ring-inset ring-border/30",
        fill ? "min-w-0 flex-1" : "w-max shrink-0",
      )}
      role="tablist"
      aria-label="My Work sections"
      data-tour="mywork-tabs"
    >
      <button
        type="button"
        role="tab"
        aria-selected={tab === "tasks"}
        onClick={() => setTab("tasks")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-[color,background-color,box-shadow]",
          tab === "tasks"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground/80",
        )}
      >
        <ListChecks className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        Work
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === "notes"}
        onClick={() => setTab("notes")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-[color,background-color,box-shadow]",
          tab === "notes"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground/80",
        )}
      >
        <StickyNote className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        Notes
      </button>
    </div>
  );
}

export default function MyWork() {
  const { user } = useAuth();
  const { selectedTeamId: teamId } = useSelectedTeam();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const tab: Tab = location.pathname === "/notes" ? "notes" : "tasks";
  const autoCreateNote = tab === "notes" && !!(location.state as Record<string, unknown> | null)?.createNote;

  const setTab = (value: Tab) => {
    navigate(value === "notes" ? "/notes" : "/my-work", { replace: true });
  };
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [expenseAmount, setExpenseAmount] = useState<number | null>(null);
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [filterArtistId, setFilterArtistId] = useState<string>("all");

  useEffect(() => {
    if (filterArtistId === "none") setFilterArtistId("all");
  }, [filterArtistId]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showFullAddForm, setShowFullAddForm] = useState(false);
  const [addFormInitialTitle, setAddFormInitialTitle] = useState("");
  const [revenueMode, setRevenueMode] = useState(false);
  const [revenueSource, setRevenueSource] = useState<string | null>(null);
  const [revenueAmount, setRevenueAmount] = useState<number | null>(null);
  const [titleForParsing, setTitleForParsing] = useState("");

  const { data: artists = [] } = useArtists(teamId);
  const isMobile = useIsMobile();
  const { tryStartPageTour } = useTour();
  useEffect(() => { tryStartPageTour("mywork-tour"); }, [tryStartPageTour]);
  useNotes(); // prefetch

  // Parse revenue intent whenever title changes
  useEffect(() => {
    const result = parseRevenueIntent(titleForParsing);
    if (result.isRevenue && result.amount) {
      setRevenueMode(true);
      setRevenueAmount(result.amount);
      setRevenueSource(result.source);
      // Clear expense state when revenue detected
      setExpenseAmount(null);
      setBudgetId(null);
    } else {
      setRevenueMode(false);
      setRevenueAmount(null);
      setRevenueSource(null);
    }
  }, [titleForParsing]);

  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets", selectedArtistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("artist_id", selectedArtistId!);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedArtistId,
  });

  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ["my-work", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, artists(id, name, avatar_url), initiatives(name)")
        .eq("assigned_to", user!.id)
        .eq("is_completed", false)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members", teamId],
    queryFn: async () => {
      const { data: memberships, error } = await supabase.from("team_memberships").select("user_id, role").eq("team_id", teamId!);
      if (error) throw error;
      if (!memberships?.length) return [];
      const userIds = memberships.map((m: any) => m.user_id);
      const { data: profiles, error: pErr } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
      if (pErr) throw pErr;
      return (profiles || []).map((p: any) => ({ ...p, role: memberships.find((m: any) => m.user_id === p.id)?.role }));
    },
    enabled: !!teamId,
  });

  const createTask = useMutation({
    mutationFn: async (params: {
      title: string;
      description: string;
      dueDate: Date | null;
    }) => {
      if (!teamId || !user?.id) throw new Error("Missing team or user");

      const revResult = parseRevenueIntent(params.title);
      const isRev = revResult.isRevenue && revResult.amount;

      const { error } = await supabase.from("tasks").insert({
        title: isRev ? revResult.cleanTitle : params.title,
        description: params.description || null,
        team_id: teamId,
        assigned_to: user.id,
        ...(params.dueDate ? { due_date: format(params.dueDate, "yyyy-MM-dd") } : {}),
        ...(selectedArtistId ? { artist_id: selectedArtistId } : {}),
        ...(!isRev && expenseAmount ? { expense_amount: expenseAmount } : {}),
      });
      if (error) throw error;

      // Create revenue transaction
      if (isRev && selectedArtistId) {
        await supabase.from("transactions").insert({
          artist_id: selectedArtistId,
          amount: revResult.amount,
          description: revResult.cleanTitle,
          type: "revenue",
          revenue_source: revResult.source,
          revenue_category: null,
          status: "pending",
          transaction_date: params.dueDate ? format(params.dueDate, "yyyy-MM-dd") : formatLocalDate(new Date()),
        } as any);
      }

      // Create expense transaction (existing logic)
      if (!isRev && expenseAmount && selectedArtistId && budgetId) {
        await supabase.from("transactions").insert({
          artist_id: selectedArtistId,
          budget_id: budgetId,
          amount: expenseAmount,
          description: params.title,
          type: "expense",
          status: "pending",
          transaction_date: params.dueDate ? format(params.dueDate, "yyyy-MM-dd") : formatLocalDate(new Date()),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-work"] });
      setSelectedArtistId(null);
      setExpenseAmount(null);
      setBudgetId(null);
      setRevenueMode(false);
      setRevenueAmount(null);
      setRevenueSource(null);
      setTitleForParsing("");
      toast.success("Work item added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const triggers = useMemo(() => {
    const artistTrigger = {
      char: "@",
      items: artists.map((a: any) => ({
        id: a.id,
        label: a.name,
        icon: a.avatar_url
          ? <img src={a.avatar_url} alt="" className="h-4 w-4 rounded-full object-cover" />
          : <Music2 className="h-3.5 w-3.5 text-muted-foreground" />,
      })),
      onSelect: (item: { id: string; label: string }, currentValue: string) => {
        setSelectedArtistId(item.id);
        return currentValue.replace(/@\S*$/, "").trim();
      },
    };
    const budgetTrigger = {
      char: "$",
      items: (selectedArtistId && !revenueMode)
        ? budgets.map((b: any) => ({
            id: b.id,
            label: `${b.label} — $${b.amount.toLocaleString()}`,
            icon: <Wallet className="h-3.5 w-3.5 text-muted-foreground" />,
          }))
        : [],
      onSelect: (item: { id: string; label: string }, currentValue: string) => {
        const dollarMatch = currentValue.match(/\$(\d[\d,]*\.?\d*)$/);
        if (dollarMatch) {
          const amount = parseFloat(dollarMatch[1].replace(/,/g, ""));
          setExpenseAmount(amount);
          setBudgetId(item.id);
          return currentValue.replace(/\$[\d,]*\.?\d*$/, "").trim();
        }
        setBudgetId(item.id);
        return currentValue.replace(/\$\S*$/, "").trim();
      },
    };
    return [artistTrigger, budgetTrigger];
  }, [artists, budgets, selectedArtistId, revenueMode]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["my-work"] });
  }, [queryClient]);

  const setEditingTaskIdAndCloseNew = useCallback((id: string | null) => {
    setEditingTaskId(id);
    if (id != null) setShowFullAddForm(false);
  }, []);

  const selectedArtist = artists.find((a: any) => a.id === selectedArtistId);
  const selectedBudget = budgets.find((b: any) => b.id === budgetId);

  const tasks =
    filterArtistId === "all"
      ? allTasks
      : allTasks.filter((t) => t.artist_id === filterArtistId);

  const taskArtists = useMemo(() => {
    const map = new Map<string, TaskArtist>();
    for (const t of allTasks as any[]) {
      const raw = t?.artists;
      if (!raw) continue;
      const rows = Array.isArray(raw) ? raw : [raw];
      for (const a of rows) {
        if (!a || typeof a.id !== "string" || map.has(a.id)) continue;
        const name =
          typeof a.name === "string" && a.name.trim() ? a.name.trim() : "Artist";
        map.set(a.id, {
          id: a.id,
          name,
          avatar_url: a.avatar_url ?? null,
        });
      }
    }
    const list = Array.from(map.values());
    const seenDisplay = new Set<string>();
    const deduped: TaskArtist[] = [];
    for (const a of list.sort((x, y) =>
      x.name.localeCompare(y.name, undefined, { sensitivity: "base" }),
    )) {
      const key = `${a.name.toLowerCase()}|${a.avatar_url ?? ""}`;
      if (seenDisplay.has(key)) continue;
      seenDisplay.add(key);
      deduped.push(a);
    }
    return deduped;
  }, [allTasks]);

  const grouped = useMemo(() => {
    const overdue: typeof tasks = [];
    const today: typeof tasks = [];
    const upcoming: typeof tasks = [];
    const anytime: typeof tasks = [];

    tasks.forEach((t) => {
      if (!t.due_date) {
        anytime.push(t);
      } else {
        const d = new Date(t.due_date + "T00:00:00");
        if (isToday(d)) today.push(t);
        else if (isPast(d)) overdue.push(t);
        else upcoming.push(t);
      }
    });

    return { overdue, today, upcoming, anytime };
  }, [tasks]);

  const nonEmptyGroupCount = [grouped.overdue, grouped.today, grouped.upcoming, grouped.anytime].filter(g => g.length > 0).length;
  const showGroupHeaders = nonEmptyGroupCount > 1;

  const metadataPills = (selectedArtist || expenseAmount != null || revenueMode) ? (
    <div className="flex items-center gap-1.5 flex-wrap">
      {selectedArtist && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-[3px] rounded-full bg-muted text-muted-foreground">
          <Music2 className="h-2.5 w-2.5" />
          {selectedArtist.name}
          <button onClick={() => { setSelectedArtistId(null); setBudgetId(null); setExpenseAmount(null); }} className="ml-0.5 hover:text-foreground">×</button>
        </span>
      )}
      {revenueMode && revenueAmount != null && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-[3px] rounded-full bg-emerald-500/10 text-emerald-600">
          +${revenueAmount.toLocaleString()}
          {revenueSource && <span className="opacity-70">· {revenueSource}</span>}
        </span>
      )}
      {!revenueMode && expenseAmount != null && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-[3px] rounded-full bg-muted text-muted-foreground">
          ${expenseAmount.toLocaleString()}
          {selectedBudget && <span className="opacity-60">· {selectedBudget.label}</span>}
          <button onClick={() => { setExpenseAmount(null); setBudgetId(null); }} className="ml-0.5 hover:text-foreground">×</button>
        </span>
      )}
    </div>
  ) : null;

  return (
    <AppLayout
      title="My Work"
      mobileSubnav={
        isMobile ? (
          <div className="flex w-full min-w-0 max-w-full items-center justify-between gap-3 pr-0.5">
            <WorkNotesTabs tab={tab} setTab={setTab} fill />
            {tab === "tasks" && (
              <div className="flex min-w-0 shrink justify-end">
                <MyWorkArtistFilter
                  value={filterArtistId}
                  onChange={setFilterArtistId}
                  taskArtists={taskArtists}
                />
              </div>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="mx-auto max-w-2xl pb-24">
        <div className="hidden md:flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="text-foreground text-xl font-bold tracking-tight shrink-0">My Work</h1>
            {!isMobile && <WorkNotesTabs tab={tab} setTab={setTab} />}
          </div>
          {tab === "tasks" && !isMobile && (
            <MyWorkArtistFilter
              value={filterArtistId}
              onChange={setFilterArtistId}
              taskArtists={taskArtists}
            />
          )}
        </div>

        <PullToRefresh onRefresh={handleRefresh}>
          {tab === "tasks" ? (
            !teamId ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm">
                Select a team to view your work.
              </div>
            ) : (
            <>
              {showFullAddForm ? (
                <div className="mb-2">
                  <WorkTaskItem
                    isNew
                    artistId={selectedArtistId ?? ""}
                    teamId={teamId}
                    teamMembers={teamMembers}
                    autoFocus
                    initialTitle={addFormInitialTitle}
                    defaultAssignedTo={user?.id ?? undefined}
                    onCancel={() => setShowFullAddForm(false)}
                    onMutateSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ["my-work"] });
                      setShowFullAddForm(false);
                      setAddFormInitialTitle("");
                    }}
                  />
                </div>
              ) : (
                <div data-tour="mywork-creator">
                  <WorkItemCreator
                    variant="inline"
                    placeholder="Add work… @ artist, $ expense, type a date"
                    placeholderMobile="Add work…"
                    triggers={triggers}
                    onSubmit={(data) => createTask.mutate(data)}
                    onTitleChange={setTitleForParsing}
                    metadataPills={metadataPills}
                    onOpenFullForm={(currentTitle) => {
                      setAddFormInitialTitle(currentTitle);
                      setShowFullAddForm(true);
                    }}
                  />
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading…</div>
              ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
                  <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-1">
                    <Inbox className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-semibold text-foreground/70">All clear</p>
                  <p className="text-xs text-muted-foreground/50">Nothing on your plate right now.</p>
                </div>
              ) : (
                <div className="mt-2">
                  <TaskGroup
                    tasks={grouped.overdue}
                    label="Overdue"
                    icon={<Clock className="h-3 w-3" />}
                    variant="overdue"
                    showHeader={showGroupHeaders}
                    teamId={teamId}
                    teamMembers={teamMembers}
                    editingTaskId={editingTaskId}
                    setEditingTaskId={setEditingTaskIdAndCloseNew}
                    onMutateSuccess={() => queryClient.invalidateQueries({ queryKey: ["my-work"] })}
                  />
                  <TaskGroup
                    tasks={grouped.today}
                    label="Today"
                    icon={<CalendarDays className="h-3 w-3" />}
                    variant="today"
                    showHeader={showGroupHeaders}
                    teamId={teamId}
                    teamMembers={teamMembers}
                    editingTaskId={editingTaskId}
                    setEditingTaskId={setEditingTaskIdAndCloseNew}
                    onMutateSuccess={() => queryClient.invalidateQueries({ queryKey: ["my-work"] })}
                  />
                  <TaskGroup
                    tasks={grouped.upcoming}
                    label="Upcoming"
                    icon={<CalendarDays className="h-3 w-3" />}
                    variant="default"
                    showHeader={showGroupHeaders}
                    teamId={teamId}
                    teamMembers={teamMembers}
                    editingTaskId={editingTaskId}
                    setEditingTaskId={setEditingTaskIdAndCloseNew}
                    onMutateSuccess={() => queryClient.invalidateQueries({ queryKey: ["my-work"] })}
                  />
                  <TaskGroup
                    tasks={grouped.anytime}
                    label="Anytime"
                    icon={<Inbox className="h-3 w-3" />}
                    variant="default"
                    showHeader={showGroupHeaders}
                    teamId={teamId}
                    teamMembers={teamMembers}
                    editingTaskId={editingTaskId}
                    setEditingTaskId={setEditingTaskIdAndCloseNew}
                    onMutateSuccess={() => queryClient.invalidateQueries({ queryKey: ["my-work"] })}
                  />
                </div>
              )}
            </>
            )
          ) : (
            <NotesPanel autoCreate={autoCreateNote} />
          )}
        </PullToRefresh>
      </div>
    </AppLayout>
  );
}

/* ── Date-grouped task section (reuses Work section task component) ── */

function TaskGroup({
  tasks,
  label,
  icon,
  variant,
  showHeader,
  teamId,
  teamMembers,
  editingTaskId,
  setEditingTaskId,
  onMutateSuccess,
}: {
  tasks: any[];
  label: string;
  icon: import("react").ReactNode;
  variant: "overdue" | "today" | "default";
  showHeader: boolean;
  teamId: string;
  teamMembers: any[];
  editingTaskId: string | null;
  setEditingTaskId: (id: string | null) => void;
  onMutateSuccess: () => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <div className="mb-1">
      {showHeader && (
        <div className="flex items-center gap-2 pt-3 pb-1.5 px-1 md:pt-5 md:pb-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest",
              variant === "overdue" && "text-destructive",
              variant === "today" && "text-primary",
              variant === "default" && "text-muted-foreground/50"
            )}
          >
            {icon}
            {label}
          </span>
          <span className="text-[10px] font-semibold text-muted-foreground/30 tabular-nums">
            {tasks.length}
          </span>
        </div>
      )}
      <div className="divide-y divide-border/20">
        {tasks.map((task) => (
          <WorkTaskItem
            key={task.id}
            task={task}
            artistId={task.artist_id ?? ""}
            teamId={teamId}
            teamMembers={teamMembers}
            editingTaskId={editingTaskId}
            setEditingTaskId={setEditingTaskId}
            onMutateSuccess={onMutateSuccess}
          />
        ))}
      </div>
    </div>
  );
}
