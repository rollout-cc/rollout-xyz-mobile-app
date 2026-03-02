import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import {
  useSplitEntries,
  useCreateSplitEntry,
  useUpdateSplitEntry,
  useDeleteSplitEntry,
  useSplitContributors,
  useUpsertSplitContributor,
} from "@/hooks/useSplits";

const ROLES = [
  "producer", "songwriter", "performer", "manager",
  "publisher", "engineer", "mixer", "featured_artist",
] as const;

interface Props {
  songId: string;
  teamId: string;
}

export function SplitSongEditor({ songId, teamId }: Props) {
  const { data: entries = [] } = useSplitEntries(songId);
  const { data: allContributors = [] } = useSplitContributors(teamId);
  const createEntry = useCreateSplitEntry();
  const updateEntry = useUpdateSplitEntry();
  const deleteEntry = useDeleteSplitEntry();
  const upsertContributor = useUpsertSplitContributor();

  const [newName, setNewName] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const masterTotal = entries.reduce((s: number, e: any) => s + (Number(e.master_pct) || 0), 0);
  const producerTotal = entries.reduce((s: number, e: any) => s + (Number(e.producer_pct) || 0), 0);
  const writerTotal = entries.reduce((s: number, e: any) => s + (Number(e.writer_pct) || 0), 0);

  const handleAddContributor = async () => {
    const name = newName.trim();
    if (!name) return;

    // Check if contributor already exists
    let contributor = allContributors.find((c: any) => c.name.toLowerCase() === name.toLowerCase());
    if (!contributor) {
      contributor = await upsertContributor.mutateAsync({ team_id: teamId, name });
    }
    await createEntry.mutateAsync({ song_id: songId, contributor_id: contributor.id });
    setNewName("");
    setSuggestions([]);
  };

  const handleNameChange = (val: string) => {
    setNewName(val);
    if (val.length > 0) {
      setSuggestions(
        allContributors.filter((c: any) => c.name.toLowerCase().includes(val.toLowerCase())).slice(0, 5)
      );
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = async (contributor: any) => {
    await createEntry.mutateAsync({ song_id: songId, contributor_id: contributor.id });
    setNewName("");
    setSuggestions([]);
  };

  const handlePctChange = (entryId: string, field: string, val: string) => {
    const num = val === "" ? null : parseFloat(val);
    updateEntry.mutate({ id: entryId, songId, [field]: num });
  };

  const handleRoleChange = (entryId: string, role: string) => {
    updateEntry.mutate({ id: entryId, songId, role });
  };

  const totalClass = (total: number) =>
    total > 100 ? "text-destructive font-bold" : total === 100 ? "text-emerald-500 font-semibold" : "text-muted-foreground";

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="grid grid-cols-[1fr_100px_80px_80px_80px_32px] gap-2 text-xs font-medium text-muted-foreground px-1">
        <span>Contributor</span>
        <span>Role</span>
        <span>Master %</span>
        <span>Prod %</span>
        <span>Writer %</span>
        <span />
      </div>

      {/* Entry rows */}
      {entries.map((entry: any) => (
        <div key={entry.id} className="grid grid-cols-[1fr_100px_80px_80px_80px_32px] gap-2 items-center">
          <div className="text-sm font-medium truncate">{entry.contributor?.name ?? "—"}</div>
          <Select value={entry.role} onValueChange={(v) => handleRoleChange(entry.id, v)}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r} className="text-xs capitalize">
                  {r.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={0}
            max={100}
            className="h-7 text-xs text-center"
            value={entry.master_pct ?? ""}
            onChange={(e) => handlePctChange(entry.id, "master_pct", e.target.value)}
            placeholder="-"
          />
          <Input
            type="number"
            min={0}
            max={100}
            className="h-7 text-xs text-center"
            value={entry.producer_pct ?? ""}
            onChange={(e) => handlePctChange(entry.id, "producer_pct", e.target.value)}
            placeholder="-"
          />
          <Input
            type="number"
            min={0}
            max={100}
            className="h-7 text-xs text-center"
            value={entry.writer_pct ?? ""}
            onChange={(e) => handlePctChange(entry.id, "writer_pct", e.target.value)}
            placeholder="-"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => deleteEntry.mutate({ id: entry.id, songId })}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}

      {/* Totals */}
      {entries.length > 0 && (
        <div className="grid grid-cols-[1fr_100px_80px_80px_80px_32px] gap-2 items-center text-xs px-1 border-t border-border pt-2">
          <span className="font-medium">Totals</span>
          <span />
          <span className={totalClass(masterTotal)}>{masterTotal}%</span>
          <span className={totalClass(producerTotal)}>{producerTotal}%</span>
          <span className={totalClass(writerTotal)}>{writerTotal}%</span>
          <span />
        </div>
      )}

      {/* Add contributor */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Add contributor..."
            value={newName}
            onChange={(e) => handleNameChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddContributor(); }}
            className="h-8 text-sm"
          />
          <Button size="sm" variant="outline" className="h-8 gap-1 shrink-0" onClick={handleAddContributor}>
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
        {suggestions.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-16 mt-1 bg-popover border border-border rounded-md shadow-md">
            {suggestions.map((c: any) => (
              <button
                key={c.id}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                onClick={() => handleSelectSuggestion(c)}
              >
                <span className="font-medium">{c.name}</span>
                {c.pro_affiliation && <span className="text-muted-foreground ml-2 text-xs">{c.pro_affiliation}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
