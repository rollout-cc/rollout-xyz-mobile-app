import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Check, Clock, Mail, Send, Users, Plus } from "lucide-react";
import { useSplitSongs, useSplitContributors, useUpsertSplitContributor, useCreateSplitProject, useCreateSplitSong } from "@/hooks/useSplits";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import type { ReleaseFormData } from "./ReleaseWizard";

interface Props {
  form: ReleaseFormData;
  updateForm: (patch: Partial<ReleaseFormData>) => void;
  teamId: string;
}

export function StepSplitApproval({ form, updateForm, teamId }: Props) {
  const { data: splitSongs = [] } = useSplitSongs(form.split_project_id || undefined);
  const { data: contributors = [] } = useSplitContributors(teamId);
  const upsertContributor = useUpsertSplitContributor();
  const createSplitProject = useCreateSplitProject();
  const createSplitSong = useCreateSplitSong();
  const [editingEmails, setEditingEmails] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);

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
  const contribList = Array.from(uniqueContributors.values());

  const songsWithEntries = splitSongs.map((song: any) => ({
    ...song,
    entries: allEntries.filter((e: any) => e.song_id === song.id),
  }));

  const handleEmailUpdate = async (contributorId: string, email: string) => {
    const contributor = contribList.find((c) => c.id === contributorId);
    if (!contributor) return;
    try {
      await upsertContributor.mutateAsync({
        id: contributorId,
        team_id: teamId,
        name: contributor.name,
        email,
      });
      setEditingEmails((prev) => {
        const next = { ...prev };
        delete next[contributorId];
        return next;
      });
      toast.success(`Email updated for ${contributor.name}`);
    } catch {
      toast.error("Failed to update email");
    }
  };

  const handleCreateSplitProject = async () => {
    if (!form.artist_id) {
      toast.error("Select an artist first");
      return;
    }
    setCreating(true);
    try {
      const project = await createSplitProject.mutateAsync({
        artist_id: form.artist_id,
        name: form.name || "Untitled Release",
        project_type: form.release_type,
      });
      for (const track of form.tracks.filter((t) => t.title.trim())) {
        await createSplitSong.mutateAsync({
          project_id: project.id,
          title: track.title,
        });
      }
      updateForm({ split_project_id: project.id });
      toast.success("Split project created with tracks");
    } catch {
      toast.error("Failed to create split project");
    } finally {
      setCreating(false);
    }
  };

  const handleSendApprovals = async () => {
    const contribsWithEmail = contribList.filter((c) => c.email);
    if (contribsWithEmail.length === 0) {
      toast.error("No contributors have emails. Add emails before sending approvals.");
      return;
    }
    setSending(true);
    try {
      for (const song of songsWithEntries) {
        if (song.entries.length > 0) {
          await supabase.functions.invoke("send-split-approval", {
            body: { songId: song.id },
          });
        }
      }
      toast.success(`Approval requests sent to ${contribsWithEmail.length} contributor(s)`);
    } catch {
      toast.error("Failed to send approval requests");
    } finally {
      setSending(false);
    }
  };

  const missingEmails = contribList.filter((c) => !c.email);

  if (!form.split_project_id) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-foreground mb-1">Split Approvals</h3>
          <p className="text-sm text-muted-foreground">
            Contributors must approve their splits before distribution
          </p>
        </div>
        <Card className="p-6 text-center border-dashed space-y-4">
          <Users className="h-8 w-8 mx-auto text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground mb-1">
              No split project linked
            </p>
            <p className="text-xs text-muted-foreground">
              Create a split project to send approval requests to contributors
            </p>
          </div>
          <Button onClick={handleCreateSplitProject} disabled={creating || !form.artist_id}>
            <Plus className="h-4 w-4 mr-2" />
            {creating ? "Creating…" : "Create Split Project"}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-foreground mb-1">Split Approvals</h3>
        <p className="text-sm text-muted-foreground">
          Each contributor must have an email on file and approve their split percentage
        </p>
      </div>

      {missingEmails.length > 0 && (
        <Card className="p-3 border-destructive/50 bg-destructive/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">
                {missingEmails.length} contributor{missingEmails.length !== 1 ? "s" : ""} missing email
              </p>
              <p className="text-xs text-muted-foreground">
                All contributors need an email to receive approval requests
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4 space-y-3">
        <h4 className="text-foreground flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Contributors
        </h4>
        <div className="space-y-2">
          {contribList.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">
              No contributors yet — add them in the Rights step
            </p>
          ) : (
            contribList.map((c: any) => {
              const isEditing = editingEmails[c.id] !== undefined;
              return (
                <div key={c.id} className="flex items-center gap-3 py-2 px-3 rounded-md bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    {c.email && !isEditing ? (
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Input
                          value={editingEmails[c.id] ?? c.email ?? ""}
                          onChange={(e) =>
                            setEditingEmails((prev) => ({ ...prev, [c.id]: e.target.value }))
                          }
                          placeholder="contributor@email.com"
                          className="h-7 text-xs"
                          type="email"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => handleEmailUpdate(c.id, editingEmails[c.id] ?? "")}
                          disabled={upsertContributor.isPending}
                        >
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!c.email ? (
                      <Badge variant="destructive" className="text-[10px]">
                        <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                        No Email
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        <Clock className="h-2.5 w-2.5 mr-1" />
                        Pending
                      </Badge>
                    )}
                    {c.email && !isEditing && (
                      <button
                        onClick={() => setEditingEmails((prev) => ({ ...prev, [c.id]: c.email }))}
                        className="text-xs text-primary hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {songsWithEntries.length > 0 && (
        <Card className="p-4 space-y-3">
          <h4 className="text-foreground">Split Summary</h4>
          {songsWithEntries.map((song: any) => (
            <div key={song.id} className="border border-border rounded-lg p-3 space-y-1.5">
              <div className="text-sm font-medium">{song.title}</div>
              {song.entries.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">No splits defined</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {song.entries.map((e: any) => (
                    <span key={e.id} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                      {e.contributor?.name} · {e.role}
                      {e.master_pct ? ` · M:${e.master_pct}%` : ""}
                      {e.producer_pct ? ` · P:${e.producer_pct}%` : ""}
                      {e.writer_pct ? ` · W:${e.writer_pct}%` : ""}
                      {e.publisher_pct ? ` · Pub:${e.publisher_pct}%` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      <Button
        onClick={handleSendApprovals}
        disabled={sending || contribList.length === 0 || missingEmails.length === contribList.length}
        className="w-full"
      >
        <Send className="h-4 w-4 mr-2" />
        {sending ? "Sending…" : "Send Approval Requests"}
      </Button>
    </div>
  );
}
