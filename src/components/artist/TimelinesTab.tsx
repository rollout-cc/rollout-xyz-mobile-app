import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TimelinesTabProps {
  artistId: string;
}

export function TimelinesTab({ artistId }: TimelinesTabProps) {
  const queryClient = useQueryClient();
  const { data: milestones = [] } = useQuery({
    queryKey: ["artist_milestones", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_milestones")
        .select("*")
        .eq("artist_id", artistId)
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", description: "" });

  const addMilestone = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("artist_milestones").insert({
        artist_id: artistId,
        title: form.title,
        date: form.date,
        description: form.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist_milestones", artistId] });
      setForm({ title: "", date: "", description: "" });
      setShowAdd(false);
      toast.success("Milestone added");
    },
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
        <Button variant="ghost" size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" /> Add Milestone
        </Button>
      </div>

      {showAdd && (
        <div className="space-y-3 p-4 rounded-lg border border-border mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          </div>
          <div className="space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" onClick={() => addMilestone.mutate()} disabled={!form.title.trim() || !form.date}>Create</Button>
          </div>
        </div>
      )}

      {milestones.length === 0 && !showAdd ? (
        <p className="text-sm text-muted-foreground">No milestones yet.</p>
      ) : (
        <div className="relative pl-6 border-l-2 border-border space-y-6 ml-2">
          {milestones.map((m: any) => (
            <div key={m.id} className="relative">
              <div className="absolute -left-[calc(1.5rem+1px)] top-1 h-3 w-3 rounded-full bg-primary" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.date}</p>
                  {m.description && <p className="text-sm text-muted-foreground mt-1">{m.description}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteMilestone.mutate(m.id)}>
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
