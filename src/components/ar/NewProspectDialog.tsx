import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateProspect } from "@/hooks/useProspects";
import { toast } from "sonner";

interface NewProspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string | undefined;
}

export function NewProspectDialog({ open, onOpenChange, teamId }: NewProspectDialogProps) {
  const create = useCreateProspect();
  const [form, setForm] = useState({
    artist_name: "",
    primary_genre: "",
    city: "",
    spotify_uri: "",
    instagram: "",
    tiktok: "",
    youtube: "",
    notes: "",
    stage: "discovered",
    priority: "medium",
  });

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.artist_name.trim() || !teamId) return;
    try {
      await create.mutateAsync({
        team_id: teamId,
        artist_name: form.artist_name.trim(),
        primary_genre: form.primary_genre || undefined,
        city: form.city || undefined,
        spotify_uri: form.spotify_uri || undefined,
        instagram: form.instagram || undefined,
        tiktok: form.tiktok || undefined,
        youtube: form.youtube || undefined,
        notes: form.notes || undefined,
        stage: form.stage,
        priority: form.priority,
      });
      toast.success("Prospect added!");
      onOpenChange(false);
      setForm({
        artist_name: "", primary_genre: "", city: "", spotify_uri: "",
        instagram: "", tiktok: "", youtube: "", notes: "", stage: "discovered", priority: "medium",
      });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Prospect</DialogTitle>
          <DialogDescription>Add a new artist prospect to your A&R pipeline.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Artist Name *</Label>
            <Input value={form.artist_name} onChange={(e) => set("artist_name", e.target.value)} placeholder="Artist name" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Genre</Label>
              <Input value={form.primary_genre} onChange={(e) => set("primary_genre", e.target.value)} placeholder="e.g. Hip Hop" />
            </div>
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Atlanta" />
            </div>
          </div>

          <div>
            <Label>Spotify URI</Label>
            <Input value={form.spotify_uri} onChange={(e) => set("spotify_uri", e.target.value)} placeholder="spotify:artist:... or URL" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Instagram</Label>
              <Input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@handle" />
            </div>
            <div>
              <Label>TikTok</Label>
              <Input value={form.tiktok} onChange={(e) => set("tiktok", e.target.value)} placeholder="@handle" />
            </div>
            <div>
              <Label>YouTube</Label>
              <Input value={form.youtube} onChange={(e) => set("youtube", e.target.value)} placeholder="Channel" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Stage</Label>
              <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["discovered", "contacted", "in_conversation", "materials_requested", "internal_review"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Initial notes..." rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={create.isPending || !form.artist_name.trim()}>
            Add Prospect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
