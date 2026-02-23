import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { InlineField } from "@/components/ui/InlineField";

interface TimelinesTabProps {
  artistId: string;
}

export function TimelinesTab({ artistId }: TimelinesTabProps) {
  const queryClient = useQueryClient();
  const { data: milestones = [] } = useQuery({
    queryKey: ["artist_milestones", artistId],
    queryFn: async () => {
      const { data, error } = await supabase.from("artist_milestones").select("*").eq("artist_id", artistId).order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addMilestone = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase.from("artist_milestones").insert({
        artist_id: artistId,
        title,
        date: new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist_milestones", artistId] });
      setAdding(false);
      toast.success("Milestone added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMilestone = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const { error } = await supabase.from("artist_milestones").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist_milestones", artistId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMilestone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("artist_milestones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist_milestones", artistId] }),
  });

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Timeline</h3>
        {adding ? (
          <input
            ref={inputRef}
            autoFocus
            placeholder="Milestone name, press Enter"
            className="bg-transparent border-b border-primary/40 outline-none text-sm py-1 w-48"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) addMilestone.mutate((e.target as HTMLInputElement).value.trim());
              if (e.key === "Escape") setAdding(false);
            }}
            onBlur={() => setAdding(false)}
          />
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Milestone
          </Button>
        )}
      </div>

      {milestones.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground">No milestones yet.</p>
      ) : (
        <div className="relative pl-6 border-l-2 border-border space-y-6 ml-2">
          {milestones.map((m: any) => (
            <div key={m.id} className="relative group">
              <div className="absolute -left-[calc(1.5rem+1px)] top-1 h-3 w-3 rounded-full bg-primary" />
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <InlineField value={m.title} onSave={(v) => updateMilestone.mutate({ id: m.id, patch: { title: v } })} className="font-medium" />
                  <div>
                    <InlineField value={m.date} onSave={(v) => updateMilestone.mutate({ id: m.id, patch: { date: v } })} className="text-xs text-muted-foreground" />
                  </div>
                  <InlineField
                    value={m.description ?? ""}
                    placeholder="Add description"
                    onSave={(v) => updateMilestone.mutate({ id: m.id, patch: { description: v || null } })}
                    className="text-sm text-muted-foreground"
                    as="textarea"
                  />
                </div>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => deleteMilestone.mutate(m.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
