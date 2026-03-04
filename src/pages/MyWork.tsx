import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Music2, Wallet } from "lucide-react";
import { cn, formatLocalDate } from "@/lib/utils";
import { PullToRefresh } from "@/components/PullToRefresh";
import { toast } from "sonner";
import { useArtists } from "@/hooks/useArtists";
import { NotesPanel } from "@/components/notes/NotesPanel";
import { useNotes } from "@/hooks/useNotes";
import { WorkItemRow } from "@/components/work/WorkItemRow";
import { WorkItemCreator } from "@/components/work/WorkItemCreator";
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
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [expenseAmount, setExpenseAmount] = useState<number | null>(null);
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [filterArtistId, setFilterArtistId] = useState<string>("all");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const { data: artists = [] } = useArtists(teamId);
  useNotes(); // prefetch

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

  const toggleComplete = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("id", taskId);
      if (error) throw error;
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ["my-work"] });
      const prev = queryClient.getQueryData<any[]>(["my-work", user?.id]);
      queryClient.setQueryData<any[]>(["my-work", user?.id], (old) =>
        old?.filter((t) => t.id !== taskId) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(["my-work", user?.id], context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["my-work"] }),
  });

  const updateDescription = useMutation({
    mutationFn: async ({ id, description }: { id: string; description: string }) => {
      const { error } = await supabase.from("tasks").update({ description }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, description }) => {
      await queryClient.cancelQueries({ queryKey: ["my-work"] });
      queryClient.setQueriesData<any[]>({ queryKey: ["my-work"] }, (old) =>
        old?.map((t) => (t.id === id ? { ...t, description } : t)) ?? []
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["my-work"] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-work"] }),
  });

  const createTask = useMutation({
    mutationFn: async (params: {
      title: string;
      description: string;
      dueDate: Date | null;
    }) => {
      if (!teamId || !user?.id) throw new Error("Missing team or user");
      const { error } = await supabase.from("tasks").insert({
        title: params.title,
        description: params.description || null,
        team_id: teamId,
        assigned_to: user.id,
        ...(params.dueDate ? { due_date: format(params.dueDate, "yyyy-MM-dd") } : {}),
        ...(selectedArtistId ? { artist_id: selectedArtistId } : {}),
        ...(expenseAmount ? { expense_amount: expenseAmount } : {}),
      });
      if (error) throw error;

      if (expenseAmount && selectedArtistId && budgetId) {
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

  const metadataPills = (selectedArtist || expenseAmount != null) ? (
    <div className="flex items-center gap-1.5 ml-7 flex-wrap">
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
  ) : null;

  return (
    <AppLayout title="My Work">
      <div className="mx-auto max-w-2xl pb-20">
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
                Work
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
              <WorkItemCreator
                variant="inline"
                placeholder="Add work… @ artist, $ expense, type a date"
                triggers={triggers}
                onSubmit={(data) => createTask.mutate(data)}
                metadataPills={metadataPills}
              />

              <div className="border-t border-border" />

              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading…</div>
              ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-1">
                  <p className="text-sm font-medium">All clear</p>
                  <p className="text-xs">No work right now.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {tasks.map((task) => (
                    <WorkItemRow
                      key={task.id}
                      task={task as any}
                      isExpanded={expandedTaskId === task.id}
                      onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                      onToggleComplete={() => toggleComplete.mutate(task.id)}
                      onDelete={() => deleteTask.mutate(task.id)}
                      onDescriptionChange={(desc) => updateDescription.mutate({ id: task.id, description: desc })}
                      onNavigateToArtist={(id) => navigate(`/roster/${id}`)}
                      showArtist={true}
                    />
                  ))}
                </ul>
              )}
            </>
          ) : (
            <NotesPanel />
          )}
        </PullToRefresh>
      </div>
    </AppLayout>
  );
}
