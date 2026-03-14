import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Check, Shield, FileText, Plus, X, Upload, Send, Mail, Clock } from "lucide-react";
import { toast } from "sonner";
import { useCreateSplitProject, useCreateSplitSong, useSplitSongs, useSplitContributors, useUpsertSplitContributor } from "@/hooks/useSplits";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ReleaseFormData } from "./ReleaseWizard";

const PRO_OPTIONS = ["BMI", "ASCAP", "SESAC", "GMR", "SOCAN", "PRS", "Other"] as const;

interface Contributor {
  name: string;
  role: "artist" | "producer" | "writer" | "contributor";
  master_pct: number;
  publisher_pct: number;
  pro_affiliation: string;
  ipi_number: string;
  email: string;
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
  return { name: "", role: "artist", master_pct: 0, publisher_pct: 0, pro_affiliation: "", ipi_number: "", email: "" };
}

export function StepRightsRegistration({ form, updateForm, teamId }: Props) {
  const [trackSplits, setTrackSplits] = useState<TrackSplit[]>(() =>
    form.tracks.map((_, i) => ({ trackIndex: i, contributors: [] }))
  );
  const [authorizeRegistration, setAuthorizeRegistration] = useState(false);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);

  const createSplitProject = useCreateSplitProject();
  const createSplitSong = useCreateSplitSong();

  // Split project data for approval section
  const { data: splitSongs = [] } = useSplitSongs(form.split_project_id || undefined);
  const songIds = splitSongs.map((s: any) => s.id);
  const { data: allEntries = [] } = useQuery({
    queryKey: ["split-entries-batch", form.split_project_id],
    queryFn: async () => {
      if (songIds.length === 0) return [];
      const { data, error } = await supabase
        .from("split_entries")
        .select("*, contributor:split_contributors(*)")
        .in("song_id", songIds);
      if (error) throw error;
      return data;
    },
    enabled: songIds.length > 0,
  });

  const uniqueContributors = new Map<string, any>();
  allEntries.forEach((entry: any) => {
    if (entry.contributor && !uniqueContributors.has(entry.contributor.id)) {
      uniqueContributors.set(entry.contributor.id, entry.contributor);
    }
  });
  const dbContribList = Array.from(uniqueContributors.values());

  const syncedSplits = form.tracks.map((_, i) => {
    const existing = trackSplits.find((ts) => ts.trackIndex === i);
    return existing || { trackIndex: i, contributors: [] };
  });

  const updateSplits = (newSplits: TrackSplit[]) => setTrackSplits(newSplits);

  const addContributor = (trackIdx: number) => {
    const updated = syncedSplits.map((ts) =>
      ts.trackIndex === trackIdx
        ? { ...ts, contributors: [...ts.contributors, makeContributor()] }
        : ts
    );
    updateSplits(updated);
    // Auto-create split project on first contributor
    if (!form.split_project_id && form.artist_id && !creating) {
      autoCreateSplitProject();
    }
  };

  const autoCreateSplitProject = async () => {
    if (!form.artist_id) return;
    setCreating(true);
    try {
      const project = await createSplitProject.mutateAsync({
        artist_id: form.artist_id,
        name: form.name || "Untitled Release",
        project_type: form.release_type,
      });
      for (const track of form.tracks.filter((t) => t.title.trim())) {
        await createSplitSong.mutateAsync({ project_id: project.id, title: track.title });
      }
      updateForm({ split_project_id: project.id });
      toast.success("Split project created");
    } catch {
      toast.error("Failed to create split project");
    } finally {
      setCreating(false);
    }
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
            pro_affiliation: cols[5] || "",
            ipi_number: cols[6] || "",
            email: cols[7] || "",
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

  // Approval sending
  const handleSendApprovals = async () => {
    const contribsWithEmail = dbContribList.filter((c) => c.email);
    if (contribsWithEmail.length === 0) {
      toast.error("No contributors have emails. Add emails to send approvals.");
      return;
    }
    setSending(true);
    try {
      const songsWithEntries = splitSongs.map((song: any) => ({
        ...song,
        entries: allEntries.filter((e: any) => e.song_id === song.id),
      }));
      for (const song of songsWithEntries) {
        if (song.entries.length > 0) {
          await supabase.functions.invoke("send-split-approval", { body: { songId: song.id } });
        }
      }
      toast.success(`Approval requests sent to ${contribsWithEmail.length} contributor(s)`);
    } catch {
      toast.error("Failed to send approval requests");
    } finally {
      setSending(false);
    }
  };

  const tracksWithTitle = form.tracks.filter((t) => t.title.trim());

  // Check if all splits total 100%
  const allSplitsComplete = tracksWithTitle.every((_, idx) => {
    const split = syncedSplits[idx];
    if (!split || split.contributors.length === 0) return false;
    const masterTotal = split.contributors.reduce((s, c) => s + c.master_pct, 0);
    const pubTotal = split.contributors.reduce((s, c) => s + c.publisher_pct, 0);
    return masterTotal === 100 && pubTotal === 100;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-foreground mb-1">Rights & Splits</h3>
          <p className="text-sm text-muted-foreground">
            Add contributors with ownership percentages, PRO info, and emails for approvals
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
        CSV format: <code className="text-[10px] bg-muted px-1 py-0.5 rounded">track_number, name, role, master_pct, publisher_pct, pro, ipi, email</code>
      </p>

      {/* Per-track contributor grid */}
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
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => addContributor(trackIdx)}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>

              {split.contributors.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">No contributors added yet</p>
              ) : (
                <>
                  {/* Desktop header */}
                  <div className="hidden sm:grid grid-cols-[1fr_90px_70px_70px_100px_80px_140px_28px] gap-2 text-[10px] text-muted-foreground font-medium px-1">
                    <span>Name</span>
                    <span>Role</span>
                    <span className="text-right">Master %</span>
                    <span className="text-right">Pub %</span>
                    <span>PRO</span>
                    <span>IPI #</span>
                    <span>Email</span>
                    <span />
                  </div>

                  {split.contributors.map((contrib, ci) => (
                    <div key={ci}>
                      {/* Desktop row */}
                      <div className="hidden sm:grid grid-cols-[1fr_90px_70px_70px_100px_80px_140px_28px] gap-2 items-center">
                        <Input
                          value={contrib.name}
                          onChange={(e) => updateContributor(trackIdx, ci, { name: e.target.value })}
                          placeholder="Name"
                          className="h-8 text-sm"
                        />
                        <Select
                          value={contrib.role}
                          onValueChange={(v) => updateContributor(trackIdx, ci, { role: v as Contributor["role"] })}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="artist">Artist</SelectItem>
                            <SelectItem value="producer">Producer</SelectItem>
                            <SelectItem value="writer">Writer</SelectItem>
                            <SelectItem value="contributor">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number" min={0} max={100}
                          value={contrib.master_pct || ""}
                          onChange={(e) => updateContributor(trackIdx, ci, { master_pct: parseFloat(e.target.value) || 0 })}
                          className="h-8 text-sm text-right" placeholder="0"
                        />
                        <Input
                          type="number" min={0} max={100}
                          value={contrib.publisher_pct || ""}
                          onChange={(e) => updateContributor(trackIdx, ci, { publisher_pct: parseFloat(e.target.value) || 0 })}
                          className="h-8 text-sm text-right" placeholder="0"
                        />
                        <Select
                          value={contrib.pro_affiliation || "none"}
                          onValueChange={(v) => updateContributor(trackIdx, ci, { pro_affiliation: v === "none" ? "" : v })}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="PRO" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            {PRO_OPTIONS.map((p) => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={contrib.ipi_number}
                          onChange={(e) => updateContributor(trackIdx, ci, { ipi_number: e.target.value })}
                          placeholder="IPI #"
                          className="h-8 text-xs"
                        />
                        <Input
                          type="email"
                          value={contrib.email}
                          onChange={(e) => updateContributor(trackIdx, ci, { email: e.target.value })}
                          placeholder="email@example.com"
                          className="h-8 text-xs"
                        />
                        <button onClick={() => removeContributor(trackIdx, ci)} className="text-muted-foreground hover:text-destructive">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Mobile card */}
                      <div className="sm:hidden border border-border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Input
                            value={contrib.name}
                            onChange={(e) => updateContributor(trackIdx, ci, { name: e.target.value })}
                            placeholder="Name"
                            className="h-8 text-sm flex-1 mr-2"
                          />
                          <button onClick={() => removeContributor(trackIdx, ci)} className="text-muted-foreground hover:text-destructive">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Select value={contrib.role} onValueChange={(v) => updateContributor(trackIdx, ci, { role: v as Contributor["role"] })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="artist">Artist</SelectItem>
                              <SelectItem value="producer">Producer</SelectItem>
                              <SelectItem value="writer">Writer</SelectItem>
                              <SelectItem value="contributor">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={contrib.pro_affiliation || "none"} onValueChange={(v) => updateContributor(trackIdx, ci, { pro_affiliation: v === "none" ? "" : v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="PRO" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              {PRO_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="number" min={0} max={100} value={contrib.master_pct || ""} onChange={(e) => updateContributor(trackIdx, ci, { master_pct: parseFloat(e.target.value) || 0 })} className="h-8 text-sm" placeholder="Master %" />
                          <Input type="number" min={0} max={100} value={contrib.publisher_pct || ""} onChange={(e) => updateContributor(trackIdx, ci, { publisher_pct: parseFloat(e.target.value) || 0 })} className="h-8 text-sm" placeholder="Pub %" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input value={contrib.ipi_number} onChange={(e) => updateContributor(trackIdx, ci, { ipi_number: e.target.value })} placeholder="IPI #" className="h-8 text-xs" />
                          <Input type="email" value={contrib.email} onChange={(e) => updateContributor(trackIdx, ci, { email: e.target.value })} placeholder="Email" className="h-8 text-xs" />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Totals */}
                  <div className="grid grid-cols-[1fr_90px_70px_70px_100px_80px_140px_28px] sm:grid hidden gap-2 items-center border-t border-border pt-2">
                    <span className="text-xs text-muted-foreground text-right col-span-2">Total (must = 100%)</span>
                    <span className={`text-xs font-semibold text-right ${masterTotal === 100 ? "text-primary" : "text-destructive"}`}>{masterTotal}%</span>
                    <span className={`text-xs font-semibold text-right ${pubTotal === 100 ? "text-primary" : "text-destructive"}`}>{pubTotal}%</span>
                    <span /><span /><span /><span />
                  </div>
                  {/* Mobile totals */}
                  <div className="sm:hidden flex justify-between border-t border-border pt-2 text-xs">
                    <span className="text-muted-foreground">Totals:</span>
                    <span className={masterTotal === 100 ? "text-primary" : "text-destructive"}>Master {masterTotal}%</span>
                    <span className={pubTotal === 100 ? "text-primary" : "text-destructive"}>Pub {pubTotal}%</span>
                  </div>
                </>
              )}
            </Card>
          );
        })
      )}

      {/* Approval section */}
      {form.split_project_id && dbContribList.length > 0 && (
        <Card className="p-4 space-y-3">
          <h4 className="text-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Send Approvals
          </h4>
          <p className="text-xs text-muted-foreground">
            Contributors with emails on file will receive approval requests for their split percentages.
          </p>
          <div className="space-y-1.5">
            {dbContribList.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 py-1.5 px-3 rounded-md bg-muted/50 text-sm">
                <span className="flex-1 truncate font-medium">{c.name}</span>
                {c.email ? (
                  <Badge variant="secondary" className="text-[10px]"><Clock className="h-2.5 w-2.5 mr-1" />Pending</Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-2.5 w-2.5 mr-1" />No Email</Badge>
                )}
              </div>
            ))}
          </div>
          <Button
            onClick={handleSendApprovals}
            disabled={sending || dbContribList.length === 0 || dbContribList.every((c) => !c.email)}
            variant="outline"
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Sending…" : "Send Approval Requests"}
          </Button>
        </Card>
      )}

      {/* Automated Rights Registration */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h4 className="text-foreground">Rights Registration</h4>
          {allSplitsComplete && (
            <Badge className="bg-primary/10 text-primary text-[10px]">
              <Check className="h-2.5 w-2.5 mr-1" /> Splits Complete
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Once splits are confirmed, Rollout will register these works with The MLC and your PRO on your behalf.
        </p>
        {allSplitsComplete ? (
          <>
            <div className="flex items-start gap-3 py-3 px-4 rounded-lg bg-muted/50">
              <Checkbox
                id="authorize-registration"
                checked={authorizeRegistration}
                onCheckedChange={(checked) => {
                  setAuthorizeRegistration(!!checked);
                  updateForm({
                    mlc_registration_status: checked ? "completed" : "not_started",
                    pro_registration_status: checked ? "completed" : "not_started",
                  });
                }}
              />
              <label htmlFor="authorize-registration" className="text-sm cursor-pointer leading-tight">
                I authorize Rollout to register these works with The MLC and my PRO for royalty collection
              </label>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                MLC: {authorizeRegistration ? "Pending Registration" : "Awaiting Authorization"}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                PRO: {authorizeRegistration ? "Pending Registration" : "Awaiting Authorization"}
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground italic py-2">
            Complete all track splits (each column must total 100%) to enable automatic registration.
          </p>
        )}
      </Card>
    </div>
  );
}
