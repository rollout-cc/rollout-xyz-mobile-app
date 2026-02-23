import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TasksTabProps {
  artistId: string;
  teamId: string;
}

export function TasksTab({ artistId, teamId }: TasksTabProps) {
  const queryClient = useQueryClient();
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

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", due_date: "" });

  const addTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        artist_id: artistId,
        team_id: teamId,
        title: form.title,
        due_date: form.due_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", artistId] });
      setForm({ title: "", due_date: "" });
      setShowAdd(false);
      toast.success("Task created");
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", artistId] }),
  });

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Tasks</h3>
        <Button variant="ghost" size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" /> New Task
        </Button>
      </div>

      {showAdd && (
        <div className="flex gap-3 mb-4 p-3 rounded-lg border border-border">
          <Input placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="flex-1" />
          <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-40" />
          <Button size="sm" onClick={() => addTask.mutate()} disabled={!form.title.trim()}>Add</Button>
        </div>
      )}

      {tasks.length === 0 && !showAdd ? (
        <p className="text-sm text-muted-foreground">No tasks yet.</p>
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
    </div>
  );
}
