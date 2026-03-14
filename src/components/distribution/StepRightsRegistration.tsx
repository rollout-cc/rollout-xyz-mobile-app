import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Check, ExternalLink, Shield, FileText, Plus, X, Upload } from "lucide-react";
import { toast } from "sonner";
import type { ReleaseFormData } from "./ReleaseWizard";

interface Contributor {
  name: string;
  role: "artist" | "producer" | "writer" | "contributor";
  master_pct: number;
  publisher_pct: number;
}

interface TrackSplit {
  trackIndex: number;
  contributors: Contributor[];
}

interface Props {
  form: ReleaseFormData;
  updateForm: (patch: Partial<ReleaseFormData>) => void;
  teamId: string;
}

function makeContributor(): Contributor {
  return { name: "", role: "artist", master_pct: 0, publisher_pct: 0 };
}

export function StepRightsRegistration({ form, updateForm, teamId }: Props) {
  const [trackSplits, setTrackSplits] = useState<TrackSplit[]>(() =>
    form.tracks.map((_, i) => ({
      trackIndex: i,
      contributors: [],
    }))
  );

  // Keep trackSplits in sync with track count
  const syncedSplits = form.tracks.map((_, i) => {
    const existing = trackSplits.find((ts) => ts.trackIndex === i);
    return existing || { trackIndex: i, contributors: [] };
  });

  const updateSplits = (newSplits: TrackSplit[]) => {
    setTrackSplits(newSplits);
  };

  const addContributor = (trackIdx: number) => {
    const updated = syncedSplits.map((ts) =>
      ts.trackIndex === trackIdx
        ? { ...ts, contributors: [...ts.contributors, makeContributor()] }
        : ts
    );
    updateSplits(updated);
  };

  const removeContributor = (trackIdx: number, contribIdx: number) => {
    const updated = syncedSplits.map((ts) =>
      ts.trackIndex === trackIdx
        ? { ...ts, contributors: ts.contributors.filter((_, ci) => ci !== contribIdx) }
        : ts
    );
    updateSplits(updated);
  };

  const updateContributor = (trackIdx: number, contribIdx: number, patch: Partial<Contributor>) => {
    const updated = syncedSplits.map((ts) =>
      ts.trackIndex === trackIdx
        ? {
            ...ts,
            contributors: ts.contributors.map((c, ci) =>
              ci === contribIdx ? { ...c, ...patch } : c
            ),
          }
        : ts
    );
    updateSplits(updated);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length < 2) {
          toast.error("CSV must have a header row and at least one data row");
          return;
        }
        // Expected: track_number, name, role, master_pct, publisher_pct
        const dataLines = lines.slice(1);
        const newSplits = [...syncedSplits];
        for (const line of dataLines) {
          const cols = line.split(",").map((c) => c.trim());
          if (cols.length < 5) continue;
          const trackNum = parseInt(cols[0]) - 1;
          if (trackNum < 0 || trackNum >= form.tracks.length) continue;
          const contrib: Contributor = {
            name: cols[1],
            role: (["artist", "producer", "writer", "contributor"].includes(cols[2].toLowerCase())
              ? cols[2].toLowerCase()
              : "contributor") as Contributor["role"],
            master_pct: parseFloat(cols[3]) || 0,
            publisher_pct: parseFloat(cols[4]) || 0,
          };
          const ts = newSplits.find((s) => s.trackIndex === trackNum);
          if (ts) ts.contributors.push(contrib);
        }
        updateSplits(newSplits);
        toast.success("CSV imported successfully");
      } catch {
        toast.error("Failed to parse CSV");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const tracksWithTitle = form.tracks.filter((t) => t.title.trim());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-foreground mb-1">Rights & Splits</h3>
          <p className="text-sm text-muted-foreground">
            Add contributors and their ownership percentages for each track
          </p>
        </div>
        <label className="cursor-pointer">
          <Button variant="outline" size="sm" asChild>
            <span>
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Import CSV
            </span>
          </Button>
          <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
        </label>
      </div>

      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
        CSV format: <code className="text-[10px] bg-muted px-1 py-0.5 rounded">track_number, name, role, master_pct, publisher_pct</code> — one row per contributor
      </p>

      {tracksWithTitle.length === 0 ? (
        <Card className="p-6 text-center border-dashed">
          <p className="text-sm text-muted-foreground">Add tracks in Step 1 first</p>
        </Card>
      ) : (
        tracksWithTitle.map((track, trackIdx) => {
          const split = syncedSplits[trackIdx] || { trackIndex: trackIdx, contributors: [] };
          const masterTotal = split.contributors.reduce((s, c) => s + c.master_pct, 0);
          const pubTotal = split.contributors.reduce((s, c) => s + c.publisher_pct, 0);

          return (
            <Card key={trackIdx} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">
                  {trackIdx + 1}. {track.title}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addContributor(trackIdx)}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>

              {split.contributors.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  No contributors added yet
                </p>
              ) : (
                <>
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_100px_80px_80px_28px] gap-2 text-[10px] text-muted-foreground font-medium px-1">
                    <span>Name</span>
                    <span>Role</span>
                    <span className="text-right">Master %</span>
                    <span className="text-right">Publishing %</span>
                    <span />
                  </div>
                  {split.contributors.map((contrib, ci) => (
                    <div
                      key={ci}
                      className="grid grid-cols-[1fr_100px_80px_80px_28px] gap-2 items-center"
                    >
                      <Input
                        value={contrib.name}
                        onChange={(e) => updateContributor(trackIdx, ci, { name: e.target.value })}
                        placeholder="Contributor name"
                        className="h-8 text-sm"
                      />
                      <Select
                        value={contrib.role}
                        onValueChange={(v) => updateContributor(trackIdx, ci, { role: v as Contributor["role"] })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="artist">Artist</SelectItem>
                          <SelectItem value="producer">Producer</SelectItem>
                          <SelectItem value="writer">Writer</SelectItem>
                          <SelectItem value="contributor">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={contrib.master_pct || ""}
                        onChange={(e) => updateContributor(trackIdx, ci, { master_pct: parseFloat(e.target.value) || 0 })}
                        className="h-8 text-sm text-right"
                        placeholder="0"
                      />
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={contrib.publisher_pct || ""}
                        onChange={(e) => updateContributor(trackIdx, ci, { publisher_pct: parseFloat(e.target.value) || 0 })}
                        className="h-8 text-sm text-right"
                        placeholder="0"
                      />
                      <button
                        onClick={() => removeContributor(trackIdx, ci)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {/* Totals */}
                  <div className="grid grid-cols-[1fr_100px_80px_80px_28px] gap-2 items-center border-t border-border pt-2">
                    <span className="text-xs text-muted-foreground text-right col-span-2">
                      Total (must equal 100%)
                    </span>
                    <span className={`text-xs font-semibold text-right ${masterTotal === 100 ? "text-primary" : "text-destructive"}`}>
                      {masterTotal}%
                    </span>
                    <span className={`text-xs font-semibold text-right ${pubTotal === 100 ? "text-primary" : "text-destructive"}`}>
                      {pubTotal}%
                    </span>
                    <span />
                  </div>
                </>
              )}
            </Card>
          );
        })
      )}

      {/* MLC + Copyright */}
      <MlcCard form={form} updateForm={updateForm} />
      <CopyrightCard form={form} updateForm={updateForm} />
    </div>
  );
}

function MlcCard({ form, updateForm }: { form: ReleaseFormData; updateForm: (p: Partial<ReleaseFormData>) => void }) {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <h4 className="text-foreground">MLC Registration</h4>
      </div>
      <p className="text-xs text-muted-foreground">
        Songs must be registered with The Mechanical Licensing Collective (MLC) to collect
        mechanical royalties from streaming.
      </p>
      <div className="flex items-center gap-3 py-2">
        <Switch
          checked={form.mlc_registration_status === "completed"}
          onCheckedChange={(checked) =>
            updateForm({ mlc_registration_status: checked ? "completed" : "not_started" })
          }
        />
        <span className="text-sm">
          {form.mlc_registration_status === "completed"
            ? "Songs registered with The MLC"
            : "Mark as registered with The MLC"}
        </span>
      </div>
      <a
        href="https://www.themlc.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ExternalLink className="h-3 w-3" /> Visit The MLC
      </a>
    </Card>
  );
}

function CopyrightCard({ form, updateForm }: { form: ReleaseFormData; updateForm: (p: Partial<ReleaseFormData>) => void }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <h4 className="text-foreground">Copyright Registration</h4>
        <Badge variant="secondary" className="text-[10px]">Optional</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Register your sound recordings and compositions with the U.S. Copyright Office
        for additional legal protection.
      </p>
      <div className="flex items-center gap-3 py-2">
        <Switch
          checked={form.pro_registration_status === "completed"}
          onCheckedChange={(checked) =>
            updateForm({ pro_registration_status: checked ? "completed" : "not_started" })
          }
        />
        <span className="text-sm">
          {form.pro_registration_status === "completed"
            ? "Copyright registered"
            : "Mark copyright as registered"}
        </span>
      </div>
      <a
        href="https://www.copyright.gov/registration/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ExternalLink className="h-3 w-3" /> U.S. Copyright Office
      </a>
    </Card>
  );
}
