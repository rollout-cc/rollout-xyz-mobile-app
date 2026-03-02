import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Plus, Trash2, Music } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useSplitSongs, useCreateSplitSong, useDeleteSplitSong } from "@/hooks/useSplits";
import { SplitSongEditor } from "./SplitSongEditor";
import { Badge } from "@/components/ui/badge";

interface Props {
  project: any;
  teamId: string;
  onDelete: () => void;
}

export function SplitProjectCard({ project, teamId, onDelete }: Props) {
  const [open, setOpen] = useState(true);
  const { data: songs = [] } = useSplitSongs(project.id);
  const createSong = useCreateSplitSong();
  const deleteSong = useDeleteSplitSong();
  const [newSongTitle, setNewSongTitle] = useState("");
  const [expandedSong, setExpandedSong] = useState<string | null>(null);

  const handleAddSong = async () => {
    const title = newSongTitle.trim();
    if (!title) return;
    await createSong.mutateAsync({ project_id: project.id, title });
    setNewSongTitle("");
  };

  const typeLabel = project.project_type === "ep" ? "EP" : project.project_type === "album" ? "Album" : "Single";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
            {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-sm">{project.name}</span>
              <Badge variant="secondary" className="ml-2 text-[10px]">{typeLabel}</Badge>
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
                    <SplitSongEditor songId={song.id} teamId={teamId} />
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
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
