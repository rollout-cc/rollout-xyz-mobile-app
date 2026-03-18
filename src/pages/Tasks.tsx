import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Calendar, DollarSign } from "lucide-react";
import { ItemCardRead } from "@/components/ui/ItemCard";
import { cn } from "@/lib/utils";

/** Rollout flag SVG for priority display */
function PriorityFlag({ priority, className }: { priority: number; className?: string }) {
  const fill = priority === 1 ? "#ef4444" : priority === 2 ? "#f59e0b" : "#10b981";
  return (
    <svg className={className} viewBox="0 0 72 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M49.9467 12.1212L49.435 15.3318C43.4592 10.8369 39.7737 11.6426 35.2538 13.9567C27.2677 18.0518 22.9427 12.9026 22.9427 12.9026L19.0745 30.6158C19.0745 30.6158 26.4697 37.8792 33.5725 32.3362C39.5666 27.6596 44.9577 26.7993 47.3578 28.4228L43.4774 52L46.2004 51.9455L52.9255 12L49.9589 12.1151L49.9467 12.1212Z"
        fill={fill}
      />
    </svg>
  );
}

export default function Tasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["my-tasks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, artists(id, name), initiatives(name)")
        .eq("assigned_to", user!.id)
        .eq("is_completed", false)
        .order("priority", { ascending: true, nullsFirst: false })
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
      return taskId;
    },
    onSuccess: (taskId) => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        import("@/lib/notifications").then(({ notifyTaskCompleted }) => {
          notifyTaskCompleted(task);
        });
      }
    },
  });

  const p1Tasks = tasks.filter((t: any) => t.priority === 1);
  const otherTasks = tasks.filter((t: any) => t.priority !== 1);

  const renderTask = (task: any) => (
    <ItemCardRead
      key={task.id}
      icon={
        <Checkbox
          checked={false}
          onCheckedChange={() => toggleComplete.mutate(task.id)}
          className="shrink-0"
        />
      }
      title={
        <div className="flex items-center gap-1.5">
          {task.priority != null && (
            <PriorityFlag priority={task.priority} className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="text-sm font-medium truncate">{task.title}</span>
        </div>
      }
      subtitle={
        (task.artists || task.initiatives) ? (
          <div className="flex items-center gap-2 mt-0.5">
            {task.artists && (
              <button
                onClick={() => navigate(`/roster/${task.artists.id}`)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {task.artists.name}
              </button>
            )}
            {task.initiatives && (
              <span className="text-sm text-muted-foreground">· {task.initiatives.name}</span>
            )}
          </div>
        ) : undefined
      }
      actions={
        <div className="flex items-center gap-2 shrink-0">
          {task.expense_amount != null && task.expense_amount > 0 && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <DollarSign className="h-3 w-3" />
              {task.expense_amount.toLocaleString()}
            </Badge>
          )}
          {task.due_date && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Calendar className="h-3 w-3" />
              {format(new Date(task.due_date), "MMM d")}
            </Badge>
          )}
        </div>
      }
      className={cn(
        "px-3 py-2.5 rounded-lg border border-border hover:bg-accent/50 transition-colors",
        task.priority === 1 && "border-l-2 border-l-red-500",
        task.priority === 2 && "border-l-2 border-l-amber-400",
        task.priority === 3 && "border-l-2 border-l-emerald-500",
      )}
    />
  );

  return (
    <AppLayout title="My Work">
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">Loading...</div>
      ) : tasks.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
          No work assigned to you
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {p1Tasks.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-1 pt-2 pb-1">
                <PriorityFlag priority={1} className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Priority</span>
              </div>
              {p1Tasks.map(renderTask)}
              {otherTasks.length > 0 && (
                <div className="px-1 pt-4 pb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Other Work</span>
                </div>
              )}
            </>
          )}
          {otherTasks.map(renderTask)}
        </div>
      )}
    </AppLayout>
  );
}
