import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamPlan } from "@/hooks/useTeamPlan";
import { UpgradeDialog } from "@/components/billing/UpgradeDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ItemEditor } from "@/components/ui/ItemEditor";
import { format } from "date-fns";
import { formatLocalDate } from "@/lib/utils";

interface TasksTabProps {
  artistId: string;
  teamId: string;
}

export function TasksTab({ artistId, teamId }: TasksTabProps) {
  const queryClient = useQueryClient();
  const { limits } = useTeamPlan();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Count tasks created this month across the team for gating
  const { data: monthlyTaskCount = 0 } = useQuery({
    queryKey: ["tasks-monthly-count", teamId],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count, error } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId)
        .gte("created_at", startOfMonth);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!teamId,
  });

  const [showAdd, setShowAdd] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState<Date | null>(null);

  const handleShowAdd = () => {
    if (limits.maxTasksPerMonth !== null && monthlyTaskCount >= limits.maxTasksPerMonth) {
      setUpgradeOpen(true);
      return;
    }
    setShowAdd(true);
  };

  const addTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        artist_id: artistId,
        team_id: teamId,
        title: taskTitle.trim(),
        due_date: taskDate ? formatLocalDate(taskDate) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", artistId] });
      queryClient.invalidateQueries({ queryKey: ["tasks-monthly-count", teamId] });
      setTaskTitle("");
      setTaskDate(null);
      setShowAdd(false);
      toast.success("Work item created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("tasks").update({
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", artistId] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", artistId] });
      queryClient.invalidateQueries({ queryKey: ["tasks-monthly-count", teamId] });
    },
  });

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Work</h3>
        <Button variant="ghost" size="sm" onClick={handleShowAdd}>
          <Plus className="h-4 w-4 mr-1" /> New Work
        </Button>
      </div>

      {showAdd && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg border border-border">
          <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
          <ItemEditor
            value={taskTitle}
            onChange={setTaskTitle}
            onSubmit={() => addTask.mutate()}
            onCancel={() => { setTaskTitle(""); setTaskDate(null); setShowAdd(false); }}
            placeholder="What needs to be done? (e.g. Submit mix tomorrow)"
            autoFocus
            singleLine
            enableDateDetection
            onDateParsed={setTaskDate}
            parsedDate={taskDate}
          />
          <Button size="sm" onClick={() => addTask.mutate()} disabled={!taskTitle.trim()}>Add</Button>
        </div>
      )}

      {tasks.length === 0 && !showAdd ? (
        <p className="text-sm text-muted-foreground">No work yet.</p>
      ) : (
        <div className="space-y-1">
          {tasks.map((t: any) => (
            <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <Checkbox
                checked={t.is_completed}
                onCheckedChange={(checked) => toggleTask.mutate({ id: t.id, completed: !!checked })}
              />
              <span className={`flex-1 text-sm ${t.is_completed ? "line-through text-muted-foreground" : ""}`}>
                {t.title}
              </span>
              {t.due_date && <span className="text-xs text-muted-foreground">{t.due_date}</span>}
              <Button variant="ghost" size="icon" onClick={() => deleteTask.mutate(t.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} feature="More than 10 tasks per month" />
    </div>
  );
}
