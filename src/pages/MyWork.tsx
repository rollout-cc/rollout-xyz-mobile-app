import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { Checkbox } from "@/components/ui/checkbox";
import { format, isToday, isTomorrow, isPast, isYesterday } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { cn, parseDateFromText } from "@/lib/utils";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useCallback, useState, useRef, useEffect } from "react";
import { toast } from "sonner";

export default function MyWork() {
  const { user } = useAuth();
  const { selectedTeamId: teamId } = useSelectedTeam();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["my-work", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, artists(id, name), initiatives(name)")
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-work"] }),
  });

  const createTask = useMutation({
    mutationFn: async ({ title, due_date }: { title: string; due_date?: string }) => {
      if (!teamId || !user?.id) throw new Error("Missing team or user");
      const { error } = await supabase.from("tasks").insert({
        title,
        team_id: teamId,
        assigned_to: user.id,
        ...(due_date ? { due_date } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-work"] });
      setNewTitle("");
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
    });
  };

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

  return (
    <AppLayout title="My Work">
      <div className="max-w-2xl mx-auto pb-20">
        <h1 className="text-foreground mb-6">My Work</h1>

        <PullToRefresh onRefresh={handleRefresh}>
          {/* Add task input — always visible, feels like a notes app */}
          <div className="flex items-center gap-3 mb-6">
            <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddSubmit();
                if (e.key === "Escape") { setNewTitle(""); inputRef.current?.blur(); }
              }}
              placeholder="Add a task…"
              className="w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="border-t border-border" />

          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading…</div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-1">
              <p className="text-base font-medium">All clear</p>
              <p className="text-sm">No tasks right now. Type above to add one.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-start gap-3 py-3 group"
                >
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => toggleComplete.mutate(task.id)}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {task.artists && (
                        <button
                          onClick={() => navigate(`/roster/${task.artists.id}`)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {task.artists.name}
                        </button>
                      )}
                      {task.initiatives && (
                        <span className="text-xs text-muted-foreground">
                          {task.artists ? "· " : ""}{task.initiatives.name}
                        </span>
                      )}
                      {task.due_date && (
                        <span className={cn(
                          "text-xs",
                          isDueOverdue(task.due_date) ? "text-destructive" : "text-muted-foreground"
                        )}>
                          {task.artists || task.initiatives ? "· " : ""}{formatDue(task.due_date)}
                        </span>
                      )}
                      {task.expense_amount != null && task.expense_amount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          · ${task.expense_amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PullToRefresh>
      </div>
    </AppLayout>
  );
}
