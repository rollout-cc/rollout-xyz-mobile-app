import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CampaignsTabProps {
  artistId: string;
  teamId: string;
}

export function CampaignsTab({ artistId, teamId }: CampaignsTabProps) {
  const queryClient = useQueryClient();
  const { data: campaigns = [] } = useQuery({
    queryKey: ["initiatives", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("initiatives")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", start_date: "", end_date: "" });

  const addCampaign = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("initiatives").insert({
        artist_id: artistId,
        name: form.name,
        description: form.description || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiatives", artistId] });
      setForm({ name: "", description: "", start_date: "", end_date: "" });
      setShowAdd(false);
      toast.success("Campaign created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("initiatives").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["initiatives", artistId] }),
  });

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Campaigns</h3>
        <Button variant="ghost" size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" /> New Campaign
        </Button>
      </div>

      {showAdd && (
        <div className="space-y-3 p-4 rounded-lg border border-border mb-4">
          <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Description</Label><RichTextEditor value={form.description} onChange={(v) => setForm({ ...form, description: v })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div className="space-y-1"><Label>End Date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" onClick={() => addCampaign.mutate()} disabled={!form.name.trim()}>Create</Button>
          </div>
        </div>
      )}

      {campaigns.length === 0 && !showAdd ? (
        <p className="text-sm text-muted-foreground">No campaigns yet.</p>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c: any) => (
            <div key={c.id} className="flex items-start justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-medium">{c.name}</p>
                {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {c.start_date ?? "—"} → {c.end_date ?? "—"}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteCampaign.mutate(c.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
