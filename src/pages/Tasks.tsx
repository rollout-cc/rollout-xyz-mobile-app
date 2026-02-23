import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, DollarSign } from "lucide-react";

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-tasks"] }),
  });

  return (
    <AppLayout title="My Tasks">
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">Loading...</div>
      ) : tasks.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
          No tasks assigned to you
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:bg-accent/50 transition-colors group"
            >
              <Checkbox
                checked={false}
                onCheckedChange={() => toggleComplete.mutate(task.id)}
                className="shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
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
                      · {task.initiatives.name}
                    </span>
                  )}
                </div>
              </div>
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
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
