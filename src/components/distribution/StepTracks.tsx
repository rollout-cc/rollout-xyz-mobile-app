import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, X, GripVertical, Disc, Music, Album } from "lucide-react";
import { useSplitProjects, useSplitSongs } from "@/hooks/useSplits";
import type { ReleaseFormData } from "./ReleaseWizard";

interface Props {
  form: ReleaseFormData;
  updateForm: (patch: Partial<ReleaseFormData>) => void;
  artists: any[];
  teamId: string;
}

const RELEASE_TYPES = [
  { value: "single", label: "Single", icon: Disc, sub: "1 track" },
  { value: "ep", label: "EP", icon: Music, sub: "2-6 tracks" },
  { value: "album", label: "Album", icon: Album, sub: "7+ tracks" },
];

export function StepTracks({ form, updateForm, artists, teamId }: Props) {
  const { data: splitProjects = [] } = useSplitProjects(form.artist_id || undefined);
  const { data: splitSongs = [] } = useSplitSongs(form.split_project_id || undefined);

  const handleArtistChange = (artistId: string) => {
    updateForm({ artist_id: artistId, split_project_id: "" });
  };

  const handleSplitProjectChange = (projectId: string) => {
    updateForm({ split_project_id: projectId === "none" ? "" : projectId });
  };

  // Auto-populate tracks from split project songs
  const handleImportFromSplits = () => {
    if (splitSongs.length > 0) {
      updateForm({
        tracks: splitSongs.map((s: any, i: number) => ({
          title: s.title,
          isrc_code: "",
          sort_order: i,
          is_explicit: false,
          song_id: s.id,
        })),
      });
    }
  };

  const addTrack = () => {
    updateForm({
      tracks: [
        ...form.tracks,
        { title: "", isrc_code: "", sort_order: form.tracks.length, is_explicit: false },
      ],
    });
  };

  const removeTrack = (idx: number) => {
    if (form.tracks.length <= 1) return;
    updateForm({
      tracks: form.tracks
        .filter((_, i) => i !== idx)
        .map((t, i) => ({ ...t, sort_order: i })),
    });
  };

  const updateTrack = (idx: number, patch: Partial<ReleaseFormData["tracks"][0]>) => {
    updateForm({
      tracks: form.tracks.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    });
  };

  return (
    <div className="space-y-6">
      {/* Artist selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Artist</label>
        <Select value={form.artist_id} onValueChange={handleArtistChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select artist" />
          </SelectTrigger>
          <SelectContent>
            {artists.map((a: any) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Release type */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Release Type</label>
        <div className="grid grid-cols-3 gap-3">
          {RELEASE_TYPES.map(({ value, label, icon: Icon, sub }) => (
            <button
              key={value}
              onClick={() => updateForm({ release_type: value })}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all text-center group ${
                form.release_type === value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-accent"
              }`}
            >
              <Icon className={`h-5 w-5 ${form.release_type === value ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">{sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Link split project */}
      {form.artist_id && splitProjects.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Link Split Project <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <div className="flex gap-2">
            <Select
              value={form.split_project_id || "none"}
              onValueChange={handleSplitProjectChange}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select split project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {splitProjects.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.split_project_id && splitSongs.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleImportFromSplits}>
                Import tracks
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Track list */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Tracks</label>
        <div className="space-y-2">
          {form.tracks.map((track, i) => (
            <div key={i} className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                {i + 1}.
              </span>
              <Input
                value={track.title}
                onChange={(e) => updateTrack(i, { title: e.target.value })}
                placeholder={`Track ${i + 1}`}
                className="h-9 text-sm flex-1"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-muted-foreground">E</span>
                <Switch
                  checked={track.is_explicit}
                  onCheckedChange={(checked) => updateTrack(i, { is_explicit: checked })}
                  className="scale-75"
                />
              </div>
              {form.tracks.length > 1 && (
                <button
                  onClick={() => removeTrack(i)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addTrack}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> Add track
        </button>
      </div>
    </div>
  );
}
