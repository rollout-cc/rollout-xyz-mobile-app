import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface ExtractedTask {
  id: string;
  title: string;
  assignee_hint?: string;
  due_date?: string;
  campaign_hint?: string;
  selected: boolean;
}

interface Props {
  tasks: ExtractedTask[];
  setTasks: React.Dispatch<React.SetStateAction<ExtractedTask[]>>;
  artistId: string;
  teamId: string;
  memberContext: { id: string; full_name: string }[];
  onDone: () => void;
}

export function TaskReviewList({ tasks, setTasks, artistId, teamId, memberContext, onDone }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [assignees, setAssignees] = useState<Record<string, string>>({});
  const [campaigns, setCampaigns] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data: initiatives = [] } = useQuery({
    queryKey: ["initiatives", artistId],
    queryFn: async () => {
      const { data } = await supabase
        .from("initiatives")
        .select("id, name")
        .eq("artist_id", artistId)
        .eq("is_archived", false);
      return data ?? [];
    },
  });

  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t)));
  };

  const updateTitle = (id: string, title: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
  };

  const selectedCount = tasks.filter((t) => t.selected).length;

  const handleCreate = async () => {
    const selected = tasks.filter((t) => t.selected);
    if (!selected.length) return;

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let nextSort = 0;

      const rows = selected.map((t) => {
        const assigneeId = assignees[t.id];
        const campaignId = campaigns[t.id];
        return {
          title: t.title,
          artist_id: artistId,
          team_id: teamId,
          created_by: user.id,
          assigned_to: assigneeId || null,
          initiative_id: campaignId || null,
          due_date: t.due_date || null,
          sort_order: nextSort++,
          is_completed: false,
        };
      });

      const { error } = await supabase.from("tasks").insert(rows);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["work-items"] });
      toast.success(`${rows.length} task${rows.length > 1 ? "s" : ""} created from transcript`);
      onDone();
    } catch (e: any) {
      toast.error(e.message || "Failed to create tasks");
    } finally {
      setIsCreating(false);
    }
  };

  if (!tasks.length) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No tasks were found in this transcript. Try a different one.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-start gap-2 rounded-lg border border-border p-2.5">
            <Checkbox
              checked={task.selected}
              onCheckedChange={() => toggleTask(task.id)}
              className="mt-1"
            />
            <div className="flex-1 min-w-0 space-y-1.5">
              <Input
                value={task.title}
                onChange={(e) => updateTitle(task.id, e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex gap-1.5 flex-wrap">
                {memberContext.length > 0 && (
                  <Select
                    value={assignees[task.id] ?? ""}
                    onValueChange={(v) => setAssignees((prev) => ({ ...prev, [task.id]: v }))}
                  >
                    <SelectTrigger className="h-7 text-xs w-[130px]">
                      <SelectValue placeholder={task.assignee_hint || "Assignee"} />
                    </SelectTrigger>
                    <SelectContent>
                      {memberContext.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {initiatives.length > 0 && (
                  <Select
                    value={campaigns[task.id] ?? ""}
                    onValueChange={(v) => setCampaigns((prev) => ({ ...prev, [task.id]: v }))}
                  >
                    <SelectTrigger className="h-7 text-xs w-[130px]">
                      <SelectValue placeholder={task.campaign_hint || "Campaign"} />
                    </SelectTrigger>
                    <SelectContent>
                      {initiatives.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button className="w-full" onClick={handleCreate} disabled={!selectedCount || isCreating}>
        {isCreating ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Check className="h-4 w-4 mr-2" />
        )}
        Create {selectedCount} Task{selectedCount !== 1 ? "s" : ""}
      </Button>
    </div>
  );
}
