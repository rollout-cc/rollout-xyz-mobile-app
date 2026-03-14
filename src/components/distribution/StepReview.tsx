import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, AlertTriangle, Save, Rocket } from "lucide-react";
import type { ReleaseFormData } from "./ReleaseWizard";

interface Props {
  form: ReleaseFormData;
  onSaveDraft: () => void;
  onMarkReady: () => void;
  saving: boolean;
}

interface CheckItem {
  label: string;
  ok: boolean;
  detail: string;
}

export function StepReview({ form, onSaveDraft, onMarkReady, saving }: Props) {
  const checks: CheckItem[] = [
    {
      label: "Artist Selected",
      ok: !!form.artist_id,
      detail: form.artist_id ? "✓" : "Select an artist in Step 1",
    },
    {
      label: "Tracks Added",
      ok: form.tracks.some((t) => t.title.trim()),
      detail: `${form.tracks.filter((t) => t.title.trim()).length} track(s)`,
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
      label: "Split Project Linked",
      ok: !!form.split_project_id,
      detail: form.split_project_id ? "Linked" : "No split project linked",
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

      {/* Summary card */}
      <Card className="p-4 space-y-1">
        <div className="text-lg font-semibold text-foreground">
          {form.name || "Untitled Release"}
        </div>
        <div className="text-sm text-muted-foreground">
          {form.release_type.toUpperCase()} · {form.tracks.filter((t) => t.title.trim()).length} track(s)
          {form.genre && ` · ${form.genre}`}
          {form.release_date && ` · ${form.release_date}`}
        </div>
      </Card>

      {/* Checklist */}
      <div className="space-y-2">
        {checks.map((check) => (
          <div
            key={check.label}
            className="flex items-center gap-3 py-2 px-3 rounded-md bg-muted/50"
          >
            {check.ok ? (
              <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-green-600" />
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
