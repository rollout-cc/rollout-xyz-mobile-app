import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { Checkbox } from "@/components/ui/checkbox";
import { format, isToday, isTomorrow, isPast, isYesterday } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Plus, Music2, Wallet } from "lucide-react";
import { cn, parseDateFromText } from "@/lib/utils";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useCallback, useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { ItemEditor } from "@/components/ui/ItemEditor";
import { useArtists } from "@/hooks/useArtists";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotesPanel } from "@/components/notes/NotesPanel";
import { useNotes } from "@/hooks/useNotes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Tab = "tasks" | "notes";

export default function MyWork() {
  const { user } = useAuth();
  const { selectedTeamId: teamId } = useSelectedTeam();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("tasks");
  const [newTitle, setNewTitle] = useState("");
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [expenseAmount, setExpenseAmount] = useState<number | null>(null);
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [filterArtistId, setFilterArtistId] = useState<string>("all");

  const { data: artists = [] } = useArtists(teamId);

  // Prefetch notes so they're instant when switching to Notes tab
  useNotes();

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

  // ── Tasks ──
  const toggleComplete = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-work"] }),
  });

  const createTask = useMutation({
    mutationFn: async (params: {
      title: string;
      due_date?: string;
      artist_id?: string;
      expense_amount?: number;
      budget_id?: string;
    }) => {
      if (!teamId || !user?.id) throw new Error("Missing team or user");
      const { error } = await supabase.from("tasks").insert({
        title: params.title,
        team_id: teamId,
        assigned_to: user.id,
        ...(params.due_date ? { due_date: params.due_date } : {}),
        ...(params.artist_id ? { artist_id: params.artist_id } : {}),
        ...(params.expense_amount ? { expense_amount: params.expense_amount } : {}),
      });
      if (error) throw error;

      if (params.expense_amount && params.artist_id && params.budget_id) {
        await supabase.from("transactions").insert({
          artist_id: params.artist_id,
          budget_id: params.budget_id,
          amount: params.expense_amount,
          description: params.title,
          type: "expense",
          status: "pending",
          transaction_date: params.due_date || new Date().toISOString().split("T")[0],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-work"] });
      setNewTitle("");
      setSelectedArtistId(null);
      setExpenseAmount(null);
      setBudgetId(null);
      toast.success("Task added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleAddSubmit = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const parsed = parseDateFromText(trimmed);
    createTask.mutate({
      title: parsed.title,
      due_date: parsed.date ? format(parsed.date, "yyyy-MM-dd") : undefined,
      artist_id: selectedArtistId || undefined,
      expense_amount: expenseAmount || undefined,
      budget_id: budgetId || undefined,
    });
  };

  const triggers = useMemo(() => {
    const artistTrigger = {
      char: "@",
      items: artists.map((a: any) => ({
        id: a.id,
        label: a.name,
        icon: <Music2 className="h-3.5 w-3.5 text-muted-foreground" />,
      })),
      onSelect: (item: { id: string; label: string }, currentValue: string) => {
        setSelectedArtistId(item.id);
        return currentValue.replace(/@\S*$/, "").trim();
      },
    };
    const budgetTrigger = {
      char: "$",
      items: selectedArtistId
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
  }, [artists, budgets, selectedArtistId]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["my-work"] });
  }, [queryClient]);

  const formatDue = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMM d");
  };

  const isDueOverdue = (date: string) => {
    const d = new Date(date);
    return isPast(d) && !isToday(d);
  };

  const selectedArtist = artists.find((a: any) => a.id === selectedArtistId);
  const selectedBudget = budgets.find((b: any) => b.id === budgetId);

  const tasks = filterArtistId === "all"
    ? allTasks
    : filterArtistId === "none"
      ? allTasks.filter((t) => !t.artist_id)
      : allTasks.filter((t) => t.artist_id === filterArtistId);

  const taskArtists = useMemo(() => {
    const map = new Map<string, { id: string; name: string; avatar_url: string | null }>();
    allTasks.forEach((t: any) => {
      if (t.artists) map.set(t.artists.id, t.artists);
    });
    return Array.from(map.values());
  }, [allTasks]);

  return (
    <AppLayout title="My Work">
      <div className={cn("mx-auto pb-20", tab === "notes" ? "max-w-4xl" : "max-w-2xl")}>
        {/* Header row: title + tab toggle + filter */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-foreground text-lg font-bold">My Work</h1>
            <div className="flex items-center rounded-lg bg-muted p-0.5">
              <button
                onClick={() => setTab("tasks")}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  tab === "tasks" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Tasks
              </button>
              <button
                onClick={() => setTab("notes")}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  tab === "notes" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Notes
              </button>
            </div>
          </div>
          {tab === "tasks" && taskArtists.length > 0 && (
            <Select value={filterArtistId} onValueChange={setFilterArtistId}>
              <SelectTrigger className="w-[140px] h-7 text-xs">
                <SelectValue placeholder="All Artists" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Artists</SelectItem>
                <SelectItem value="none">Me</SelectItem>
                {taskArtists.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <PullToRefresh onRefresh={handleRefresh}>
          {tab === "tasks" ? (
            <>
              {/* Add task input */}
              <div className="flex items-center gap-2 py-2">
                <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                <ItemEditor
                  value={newTitle}
                  onChange={setNewTitle}
                  onSubmit={handleAddSubmit}
                  onCancel={() => { setNewTitle(""); setSelectedArtistId(null); setExpenseAmount(null); setBudgetId(null); }}
                  placeholder="Add a task… @ artist, $ expense"
                  autoFocus={false}
                  triggers={triggers}
                  singleLine
                />
              </div>

              {/* Metadata pills */}
              {(selectedArtist || expenseAmount != null) && (
                <div className="flex items-center gap-1.5 ml-6 mb-1 flex-wrap">
                  {selectedArtist && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      <Music2 className="h-2.5 w-2.5" />
                      {selectedArtist.name}
                      <button onClick={() => { setSelectedArtistId(null); setBudgetId(null); setExpenseAmount(null); }} className="ml-0.5 hover:text-foreground">×</button>
                    </span>
                  )}
                  {expenseAmount != null && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      ${expenseAmount.toLocaleString()}
                      {selectedBudget && <span className="opacity-60">· {selectedBudget.label}</span>}
                      <button onClick={() => { setExpenseAmount(null); setBudgetId(null); }} className="ml-0.5 hover:text-foreground">×</button>
                    </span>
                  )}
                </div>
              )}

              <div className="border-t border-border" />

              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading…</div>
              ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-1">
                  <p className="text-sm font-medium">All clear</p>
                  <p className="text-xs">No tasks right now.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {tasks.map((task) => (
                    <li key={task.id} className="flex items-center gap-2.5 py-2.5 group">
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => toggleComplete.mutate(task.id)}
                        className="shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug">{task.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-xs text-muted-foreground">
                          {task.artists && (
                            <button
                              onClick={() => navigate(`/roster/${task.artists.id}`)}
                              className="hover:text-foreground transition-colors"
                            >
                              {task.artists.name}
                            </button>
                          )}
                          {task.initiatives && (
                            <span>{task.artists ? "· " : ""}{task.initiatives.name}</span>
                          )}
                          {task.due_date && (
                            <span className={isDueOverdue(task.due_date) ? "text-destructive" : ""}>
                              {task.artists || task.initiatives ? "· " : ""}{formatDue(task.due_date)}
                            </span>
                          )}
                          {task.expense_amount != null && task.expense_amount > 0 && (
                            <span>· ${task.expense_amount.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      {task.artists && (
                        <Avatar
                          className="h-6 w-6 shrink-0 cursor-pointer"
                          onClick={() => navigate(`/roster/${task.artists.id}`)}
                        >
                          {task.artists.avatar_url && <AvatarImage src={task.artists.avatar_url} alt={task.artists.name} />}
                          <AvatarFallback className="text-[9px] font-bold bg-muted">{task.artists.name?.[0]}</AvatarFallback>
                        </Avatar>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            /* ── Notes tab ── */
            <NotesPanel />
          )}
        </PullToRefresh>
      </div>
    </AppLayout>
  );
}
