import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Upload, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import type { ReleaseFormData } from "./ReleaseWizard";

const GENRES = [
  "Pop", "Hip-Hop/Rap", "R&B/Soul", "Rock", "Electronic", "Country",
  "Latin", "Alternative", "Jazz", "Classical", "Reggae", "Gospel",
  "Folk", "Indie", "Metal", "Punk", "Afrobeats", "K-Pop",
];

interface Props {
  form: ReleaseFormData;
  updateForm: (patch: Partial<ReleaseFormData>) => void;
  teamId: string;
}

export function StepDetails({ form, updateForm, teamId }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleArtworkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${teamId}/release-artwork-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("artist-assets")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("artist-assets")
        .getPublicUrl(path);
      updateForm({ artwork_url: urlData.publicUrl });
      toast.success("Artwork uploaded");
    } catch {
      toast.error("Failed to upload artwork");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Artwork */}
      <div className="space-y-2">
        <Label>Artwork</Label>
        <div className="flex items-start gap-4">
          {form.artwork_url ? (
            <img
              src={form.artwork_url}
              alt="Artwork"
              className="h-32 w-32 rounded-lg object-cover border border-border"
            />
          ) : (
            <div className="h-32 w-32 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading…" : "Upload"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleArtworkUpload}
                disabled={uploading}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              3000×3000px recommended. JPG or PNG.
            </p>
          </div>
        </div>
      </div>

      {/* Release name */}
      <div className="space-y-2">
        <Label>Release Name</Label>
        <Input
          value={form.name}
          onChange={(e) => updateForm({ name: e.target.value })}
          placeholder="Album or single title"
        />
      </div>

      {/* Genre */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Genre</Label>
          <Select value={form.genre} onValueChange={(v) => updateForm({ genre: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select genre" />
            </SelectTrigger>
            <SelectContent>
              {GENRES.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Secondary Genre</Label>
          <Select value={form.secondary_genre} onValueChange={(v) => updateForm({ secondary_genre: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              {GENRES.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Record Label + Release Date */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Record Label</Label>
          <Input
            value={form.record_label}
            onChange={(e) => updateForm({ record_label: e.target.value })}
            placeholder="Label name"
          />
        </div>
        <div className="space-y-2">
          <Label>Release Date</Label>
          <Input
            type="date"
            value={form.release_date}
            onChange={(e) => updateForm({ release_date: e.target.value })}
          />
        </div>
      </div>

      {/* UPC + ISRC */}
      <div className="space-y-2">
        <Label>UPC Code <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input
          value={form.upc_code}
          onChange={(e) => updateForm({ upc_code: e.target.value })}
          placeholder="Universal Product Code"
        />
      </div>

      {/* Per-track ISRC */}
      <div className="space-y-2">
        <Label>ISRC Codes <span className="text-muted-foreground font-normal">(per track, optional)</span></Label>
        <div className="space-y-2">
          {form.tracks.map((track, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-24 truncate shrink-0">
                {track.title || `Track ${i + 1}`}
              </span>
              <Input
                value={track.isrc_code}
                onChange={(e) => {
                  const tracks = [...form.tracks];
                  tracks[i] = { ...tracks[i], isrc_code: e.target.value };
                  updateForm({ tracks });
                }}
                placeholder="ISRC code"
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
