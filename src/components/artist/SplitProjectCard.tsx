import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Plus, Trash2, Music, Send, Loader2, FileDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useSplitSongs, useCreateSplitSong, useDeleteSplitSong, useSplitEntries } from "@/hooks/useSplits";
import { SplitSongEditor } from "./SplitSongEditor";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateSplitSheetPdf } from "@/lib/splitSheetPdf";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  project: any;
  teamId: string;
  artistId?: string;
  onDelete: () => void;
}

export function SplitProjectCard({ project, teamId, artistId, onDelete }: Props) {
  const [open, setOpen] = useState(true);
  const { data: songs = [] } = useSplitSongs(project.id);
  const createSong = useCreateSplitSong();
  const deleteSong = useDeleteSplitSong();
  const [newSongTitle, setNewSongTitle] = useState("");
  const [expandedSong, setExpandedSong] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleAddSong = async () => {
    const title = newSongTitle.trim();
    if (!title) return;
    await createSong.mutateAsync({ project_id: project.id, title });
    setNewSongTitle("");
  };

  const handleSendApprovals = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-split-approval", {
        body: { project_id: project.id },
      });
      if (error) throw error;
      const results = data?.results || [];
      const sent = results.filter((r: any) => r.sent).length;
      const failed = results.filter((r: any) => !r.sent).length;
      if (sent > 0) toast.success(`Sent approval requests to ${sent} contributor${sent !== 1 ? "s" : ""}`);
      if (failed > 0) toast.warning(`${failed} contributor${failed !== 1 ? "s" : ""} could not be notified (missing email)`);
      if (sent === 0 && failed === 0) toast("No pending approvals to send");
    } catch (err: any) {
      toast.error(err.message || "Failed to send approvals");
    } finally {
      setSending(false);
      setShowConfirm(false);
    }
  };

  const typeLabel = project.project_type === "ep" ? "EP" : project.project_type === "album" ? "Album" : "Single";

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
              {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm">{project.name}</span>
                <Badge variant="secondary" className="ml-2 text-xs">{typeLabel}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">{songs.length} track{songs.length !== 1 ? "s" : ""}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-2">
              {songs.map((song: any) => (
                <div key={song.id} className="border border-border rounded-md">
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors text-left"
                    onClick={() => setExpandedSong(expandedSong === song.id ? null : song.id)}
                  >
                    <Music className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium flex-1">{song.title}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={(e) => { e.stopPropagation(); deleteSong.mutate({ id: song.id, projectId: project.id }); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    {expandedSong === song.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                  {expandedSong === song.id && (
                    <div className="px-3 pb-3">
                      <SplitSongEditor songId={song.id} teamId={teamId} artistId={artistId} />
                    </div>
                  )}
                </div>
              ))}

              {/* Add song */}
              <div className="flex items-center gap-2 pt-1">
                <Input
                  placeholder="New track title..."
                  value={newSongTitle}
                  onChange={(e) => setNewSongTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddSong(); }}
                  className="h-8 text-sm"
                />
                <Button size="sm" variant="outline" className="h-8 gap-1 shrink-0" onClick={handleAddSong}>
                  <Plus className="h-3 w-3" /> Track
                </Button>
              </div>

              {/* Send for Approval */}
              {songs.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1.5 w-full"
                    onClick={() => setShowConfirm(true)}
                    disabled={sending}
                  >
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Send for Approval
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send approval requests?</AlertDialogTitle>
            <AlertDialogDescription>
              This will email all contributors with pending approvals across {songs.length} track{songs.length !== 1 ? "s" : ""} in "{project.name}". Each contributor receives one consolidated email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendApprovals} disabled={sending}>
              {sending ? "Sending..." : "Send"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
