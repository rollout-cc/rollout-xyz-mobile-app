import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeamPlan } from "@/hooks/useTeamPlan";
import { UpgradeDialog } from "@/components/billing/UpgradeDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { formatLocalDate } from "@/lib/utils";
import { format } from "date-fns";
import { WorkItemRow } from "@/components/work/WorkItemRow";
import { WorkItemCreator } from "@/components/work/WorkItemCreator";

interface TasksTabProps {
  artistId: string;
  teamId: string;
}

export function TasksTab({ artistId, teamId }: TasksTabProps) {
  const queryClient = useQueryClient();
  const { limits } = useTeamPlan();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

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

  const handleShowAdd = () => {
    if (limits.maxTasksPerMonth !== null && monthlyTaskCount >= limits.maxTasksPerMonth) {
      setUpgradeOpen(true);
      return;
    }
    setShowAdd(true);
  };

  const addTask = useMutation({
    mutationFn: async ({ title, description, dueDate }: { title: string; description: string; dueDate: Date | null }) => {
      const { error } = await supabase.from("tasks").insert({
        artist_id: artistId,
        team_id: teamId,
        title,
        description: description || null,
        due_date: dueDate ? formatLocalDate(dueDate) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", artistId] });
      queryClient.invalidateQueries({ queryKey: ["tasks-monthly-count", teamId] });
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
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", artistId] });
      const prev = queryClient.getQueryData<any[]>(["tasks", artistId]);
      queryClient.setQueryData<any[]>(["tasks", artistId], (old) =>
        old?.map((t) => (t.id === id ? { ...t, is_completed: completed, completed_at: completed ? new Date().toISOString() : null } : t)) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(["tasks", artistId], context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks", artistId] }),
  });

  const updateDescription = useMutation({
    mutationFn: async ({ id, description }: { id: string; description: string }) => {
      const { error } = await supabase.from("tasks").update({ description }).eq("id", id);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks", artistId] }),
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
        {!showAdd && (
          <Button variant="ghost" size="sm" onClick={handleShowAdd}>
            <Plus className="h-4 w-4 mr-1" /> New Work
          </Button>
        )}
      </div>

      {showAdd && (
        <div className="mb-4">
          <WorkItemCreator
            variant="card"
            placeholder="What needs to be done? (e.g. Submit mix tomorrow)"
            onSubmit={(data) => addTask.mutate(data)}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      )}

      {tasks.length === 0 && !showAdd ? (
        <p className="text-sm text-muted-foreground">No work yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {tasks.map((t: any) => (
            <WorkItemRow
              key={t.id}
              task={t}
              isExpanded={expandedTaskId === t.id}
              onToggleExpand={() => setExpandedTaskId(expandedTaskId === t.id ? null : t.id)}
              onToggleComplete={() => toggleTask.mutate({ id: t.id, completed: !t.is_completed })}
              onDelete={() => deleteTask.mutate(t.id)}
              onDescriptionChange={(desc) => updateDescription.mutate({ id: t.id, description: desc })}
              showArtist={false}
            />
          ))}
        </ul>
      )}
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} feature="More than 10 tasks per month" />
    </div>
  );
}
