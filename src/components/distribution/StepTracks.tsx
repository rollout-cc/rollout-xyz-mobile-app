import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, X, GripVertical, Disc, Music, Album, Upload, FileAudio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ReleaseFormData } from "./ReleaseWizard";

interface Props {
  form: ReleaseFormData;
  updateForm: (patch: Partial<ReleaseFormData>) => void;
  artists: any[];
  teamId: string;
}

const RELEASE_TYPES = [
  { value: "single", label: "Single", icon: Disc, sub: "1 track", minTracks: 1 },
  { value: "ep", label: "EP", icon: Music, sub: "2-6 tracks", minTracks: 3 },
  { value: "album", label: "Album", icon: Album, sub: "7+ tracks", minTracks: 7 },
];

function makeTrack(index: number): ReleaseFormData["tracks"][0] {
  return { title: "", isrc_code: "", sort_order: index, is_explicit: false };
}

export function StepTracks({ form, updateForm, artists, teamId }: Props) {
  // Auto-populate tracks when release type changes
  useEffect(() => {
    const type = RELEASE_TYPES.find((t) => t.value === form.release_type);
    if (!type) return;
    if (form.tracks.length < type.minTracks) {
      const newTracks = Array.from({ length: type.minTracks }, (_, i) =>
        i < form.tracks.length ? form.tracks[i] : makeTrack(i)
      );
      updateForm({ tracks: newTracks });
    }
  }, [form.release_type]);

  const handleArtistChange = (artistId: string) => {
    updateForm({ artist_id: artistId });
  };

  const addTrack = () => {
    updateForm({
      tracks: [
        ...form.tracks,
        makeTrack(form.tracks.length),
      ],
    });
  };

  const removeTrack = (idx: number) => {
    const type = RELEASE_TYPES.find((t) => t.value === form.release_type);
    if (type && form.tracks.length <= type.minTracks) return;
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

  const handleAudioUpload = async (idx: number, file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["mp3", "wav"].includes(ext || "")) {
      toast.error("Only .mp3 and .wav files are supported");
      return;
    }
    const path = `${teamId}/tracks/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("artist-assets").upload(path, file);
    if (error) {
      toast.error("Upload failed");
      return;
    }
    const { data: urlData } = supabase.storage.from("artist-assets").getPublicUrl(path);
    updateTrack(idx, { audio_url: urlData.publicUrl });
    toast.success(`Uploaded ${file.name}`);
  };

  const selectedArtist = artists.find((a) => a.id === form.artist_id);

  return (
    <div className="space-y-6">
      {/* Artist selection with avatar */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Artist</label>
        <Select value={form.artist_id} onValueChange={handleArtistChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select artist">
              {selectedArtist && (
                <div className="flex items-center gap-2">
                  {selectedArtist.avatar_url ? (
                    <img src={selectedArtist.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-muted" />
                  )}
                  <span>{selectedArtist.name}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {artists.map((a: any) => (
              <SelectItem key={a.id} value={a.id}>
                <div className="flex items-center gap-2">
                  {a.avatar_url ? (
                    <img src={a.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-muted" />
                  )}
                  <span>{a.name}</span>
                </div>
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

              {/* Audio upload */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label className="cursor-pointer shrink-0">
                      {track.audio_url ? (
                        <FileAudio className="h-4 w-4 text-primary" />
                      ) : (
                        <Upload className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                      )}
                      <input
                        type="file"
                        accept=".mp3,.wav"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAudioUpload(i, file);
                        }}
                      />
                    </label>
                  </TooltipTrigger>
                  <TooltipContent>
                    {track.audio_url ? "Audio uploaded — click to replace" : "Upload MP3 or WAV"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Explicit toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-muted-foreground font-bold">E</span>
                      <Switch
                        checked={track.is_explicit}
                        onCheckedChange={(checked) => updateTrack(i, { is_explicit: checked })}
                        className="scale-75"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Explicit Content</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {form.tracks.length > (RELEASE_TYPES.find((t) => t.value === form.release_type)?.minTracks ?? 1) && (
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
