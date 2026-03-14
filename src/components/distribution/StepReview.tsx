import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, AlertTriangle, Save, Rocket, FileAudio, Music } from "lucide-react";
import type { ReleaseFormData } from "./ReleaseWizard";

interface Props {
  form: ReleaseFormData;
  artists: any[];
  onSaveDraft: () => void;
  onMarkReady: () => void;
  saving: boolean;
}

interface CheckItem {
  label: string;
  ok: boolean;
  detail: string;
}

export function StepReview({ form, artists, onSaveDraft, onMarkReady, saving }: Props) {
  const selectedArtist = artists.find((a: any) => a.id === form.artist_id);
  const tracksWithTitle = form.tracks.filter((t) => t.title.trim());
  const tracksWithAudio = form.tracks.filter((t) => t.audio_url);

  const checks: CheckItem[] = [
    {
      label: "Artist Selected",
      ok: !!form.artist_id,
      detail: selectedArtist?.name || "Select an artist in Step 1",
    },
    {
      label: "Tracks Added",
      ok: tracksWithTitle.length > 0,
      detail: `${tracksWithTitle.length} track(s)`,
    },
    {
      label: "Audio Files",
      ok: tracksWithAudio.length === tracksWithTitle.length && tracksWithTitle.length > 0,
      detail: `${tracksWithAudio.length}/${tracksWithTitle.length} uploaded`,
    },
    {
      label: "Release Name",
      ok: !!form.name.trim(),
      detail: form.name || "Not set",
    },
    {
      label: "Genre",
      ok: !!form.genre,
      detail: form.genre || "Not set",
    },
    {
      label: "Release Date",
      ok: !!form.release_date,
      detail: form.release_date || "Not set",
    },
    {
      label: "Distribution Partners",
      ok: form.platforms.some((p) => p.enabled),
      detail: `${form.platforms.filter((p) => p.enabled).length} platform(s)`,
    },
    {
      label: "MLC Registration",
      ok: form.mlc_registration_status === "completed",
      detail: form.mlc_registration_status === "completed" ? "Registered" : "Not registered",
    },
    {
      label: "Split Project",
      ok: !!form.split_project_id,
      detail: form.split_project_id ? "Linked" : "Optional — not linked",
    },
  ];

  const requiredChecks = checks.filter((c) =>
    ["Artist Selected", "Tracks Added", "Release Name", "Distribution Partners"].includes(c.label)
  );
  const allRequiredOk = requiredChecks.every((c) => c.ok);
  const warnings = checks.filter((c) => !c.ok && !requiredChecks.includes(c));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-foreground mb-1">Review Release</h3>
        <p className="text-sm text-muted-foreground">
          Check all items below before submitting your release
        </p>
      </div>

      {/* Cover art + summary */}
      <Card className="p-4 space-y-3">
        <div className="flex gap-4">
          {form.artwork_url ? (
            <img
              src={form.artwork_url}
              alt="Cover art"
              className="h-24 w-24 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Music className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-lg font-semibold text-foreground truncate">
              {form.name || "Untitled Release"}
            </div>
            {selectedArtist && (
              <div className="flex items-center gap-2 mt-1">
                {selectedArtist.avatar_url && (
                  <img src={selectedArtist.avatar_url} alt="" className="h-4 w-4 rounded-full object-cover" />
                )}
                <span className="text-sm text-muted-foreground">{selectedArtist.name}</span>
              </div>
            )}
            <div className="text-sm text-muted-foreground mt-1">
              {form.release_type.toUpperCase()} · {tracksWithTitle.length} track(s)
              {form.genre && ` · ${form.genre}`}
              {form.release_date && ` · ${form.release_date}`}
            </div>
          </div>
        </div>

        {/* Track list with audio status */}
        {tracksWithTitle.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-border">
            {tracksWithTitle.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                <span className="flex-1 truncate">{t.title}</span>
                {t.is_explicit && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0">E</Badge>
                )}
                {t.audio_url ? (
                  <FileAudio className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <FileAudio className="h-3.5 w-3.5 text-muted-foreground/40" />
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Checklist */}
      <div className="space-y-2">
        {checks.map((check) => (
          <div
            key={check.label}
            className="flex items-center gap-3 py-2 px-3 rounded-md bg-muted/50"
          >
            {check.ok ? (
              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-primary" />
              </div>
            ) : (
              <div className="h-5 w-5 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                <X className="h-3 w-3 text-destructive" />
              </div>
            )}
            <div className="flex-1">
              <span className="text-sm font-medium">{check.label}</span>
            </div>
            <span className="text-xs text-muted-foreground">{check.detail}</span>
          </div>
        ))}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="p-3 border-warning/50 bg-warning/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">
                {warnings.length} optional item{warnings.length !== 1 ? "s" : ""} incomplete
              </p>
              <p className="text-xs text-muted-foreground">
                You can still save as draft, but these should be completed before distribution
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onSaveDraft}
          disabled={saving}
        >
          <Save className="h-4 w-4 mr-2" />
          Save as Draft
        </Button>
        <Button
          className="flex-1"
          onClick={onMarkReady}
          disabled={saving || !allRequiredOk}
        >
          <Rocket className="h-4 w-4 mr-2" />
          Mark Ready
        </Button>
      </div>
    </div>
  );
}
