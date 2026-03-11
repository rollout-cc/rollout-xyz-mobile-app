import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, AlertTriangle, Info, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  useSplitEntries,
  useCreateSplitEntry,
  useUpdateSplitEntry,
  useDeleteSplitEntry,
  useSplitContributors,
  useUpsertSplitContributor,
} from "@/hooks/useSplits";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ROLES = [
  "producer", "songwriter", "performer", "manager",
  "publisher", "engineer", "mixer", "featured_artist",
] as const;

interface Props {
  songId: string;
  teamId: string;
  artistId?: string;
}

export function SplitSongEditor({ songId, teamId, artistId }: Props) {
  const { data: entries = [] } = useSplitEntries(songId);
  const { data: allContributors = [] } = useSplitContributors(teamId);
  const createEntry = useCreateSplitEntry();
  const updateEntry = useUpdateSplitEntry();
  const deleteEntry = useDeleteSplitEntry();
  const upsertContributor = useUpsertSplitContributor();

  // Feature 3: Load band members from artist_travel_info
  const { data: bandMembers = [] } = useQuery({
    queryKey: ["artist-travel-info", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_travel_info")
        .select("member_name, pro_name, ipi_number, publisher_name")
        .eq("artist_id", artistId!);
      if (error) throw error;
      return data;
    },
    enabled: !!artistId,
  });

  const [newName, setNewName] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const masterTotal = entries.reduce((s: number, e: any) => s + (Number(e.master_pct) || 0), 0);
  const producerTotal = entries.reduce((s: number, e: any) => s + (Number(e.producer_pct) || 0), 0);
  const writerTotal = entries.reduce((s: number, e: any) => s + (Number(e.writer_pct) || 0), 0);
  const publisherTotal = entries.reduce((s: number, e: any) => s + (Number(e.publisher_pct) || 0), 0);

  // Feature 1: Contextual warnings
  const warnings = useMemo(() => {
    if (entries.length === 0) return [];
    const w: { type: "amber" | "red" | "info"; text: string }[] = [];

    if (masterTotal > 0 && masterTotal !== 100) {
      w.push({ type: masterTotal > 100 ? "red" : "amber", text: `Master % totals ${masterTotal}% — must equal 100%` });
    }
    if (writerTotal > 0 && writerTotal !== 100) {
      w.push({ type: writerTotal > 100 ? "red" : "amber", text: `Writer % totals ${writerTotal}% — must equal 100% for PRO registration` });
    }
    if (publisherTotal > 0 && publisherTotal !== 100) {
      w.push({ type: publisherTotal > 100 ? "red" : "amber", text: `Publisher % totals ${publisherTotal}% — must equal 100%` });
    }

    const missingPro = entries.filter((e: any) => !e.contributor?.pro_affiliation).length;
    if (missingPro > 0) {
      w.push({ type: "red", text: `${missingPro} contributor${missingPro > 1 ? "s" : ""} missing PRO affiliation — required for royalty collection` });
    }

    const hasPublisher = entries.some((e: any) => e.contributor?.publisher_name || (Number(e.publisher_pct) || 0) > 0);
    if (!hasPublisher) {
      w.push({ type: "info", text: "No publisher listed — consider registering a publishing entity" });
    }

    return w;
  }, [entries, masterTotal, writerTotal, publisherTotal]);

  const handleAddContributor = async () => {
    const name = newName.trim();
    if (!name) return;

    let contributor = allContributors.find((c: any) => c.name.toLowerCase() === name.toLowerCase());

    if (!contributor) {
      // Feature 3: Check if name matches a band member and pre-fill data
      const bandMatch = bandMembers.find((m: any) =>
        m.member_name?.toLowerCase() === name.toLowerCase()
      );
      const insertData: any = { team_id: teamId, name };
      if (bandMatch) {
        if (bandMatch.pro_name) insertData.pro_affiliation = bandMatch.pro_name;
        if (bandMatch.ipi_number) insertData.ipi_number = bandMatch.ipi_number;
        if (bandMatch.publisher_name) insertData.publisher_name = bandMatch.publisher_name;
      }
      contributor = await upsertContributor.mutateAsync(insertData);
    }
    await createEntry.mutateAsync({ song_id: songId, contributor_id: contributor.id });
    setNewName("");
    setSuggestions([]);
  };

  const handleNameChange = (val: string) => {
    setNewName(val);
    if (val.length > 0) {
      const lower = val.toLowerCase();
      // Merge contributors + band members
      const contribSuggestions = allContributors
        .filter((c: any) => c.name.toLowerCase().includes(lower))
        .slice(0, 3)
        .map((c: any) => ({ ...c, source: "contributor" }));
      const bandSuggestions = bandMembers
        .filter((m: any) =>
          m.member_name?.toLowerCase().includes(lower) &&
          !contribSuggestions.some((c: any) => c.name.toLowerCase() === m.member_name?.toLowerCase())
        )
        .slice(0, 2)
        .map((m: any) => ({
          id: `band-${m.member_name}`,
          name: m.member_name,
          pro_affiliation: m.pro_name,
          ipi_number: m.ipi_number,
          publisher_name: m.publisher_name,
          source: "band",
        }));
      setSuggestions([...contribSuggestions, ...bandSuggestions]);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = async (suggestion: any) => {
    if (suggestion.source === "band") {
      // Create new contributor from band member data
      const insertData: any = { team_id: teamId, name: suggestion.name };
      if (suggestion.pro_affiliation) insertData.pro_affiliation = suggestion.pro_affiliation;
      if (suggestion.ipi_number) insertData.ipi_number = suggestion.ipi_number;
      if (suggestion.publisher_name) insertData.publisher_name = suggestion.publisher_name;
      const newContrib = await upsertContributor.mutateAsync(insertData);
      await createEntry.mutateAsync({ song_id: songId, contributor_id: newContrib.id });
    } else {
      await createEntry.mutateAsync({ song_id: songId, contributor_id: suggestion.id });
    }
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

  // Feature 2: Mirror writer % to publisher %
  const handleMirrorPublisher = () => {
    entries.forEach((entry: any) => {
      if (entry.writer_pct != null && entry.writer_pct !== entry.publisher_pct) {
        updateEntry.mutate({ id: entry.id, songId, publisher_pct: entry.writer_pct });
      }
    });
    toast.success("Publisher % mirrored from Writer %");
  };

  const totalClass = (total: number) =>
    total > 100 ? "text-destructive font-bold" : total === 100 ? "text-emerald-500 font-semibold" : "text-muted-foreground";

  return (
    <div className="space-y-3">
      {/* Header row — 7 columns with publisher */}
      <div className="grid grid-cols-[1fr_100px_70px_70px_70px_70px_32px] gap-2 text-xs font-medium text-muted-foreground px-1">
        <span>Contributor</span>
        <span>Role</span>
        <span>Master %</span>
        <span>Prod %</span>
        <span>Writer %</span>
        <span>Pub %</span>
        <span />
      </div>

      {/* Entry rows */}
      {entries.map((entry: any) => (
        <div key={entry.id} className="grid grid-cols-[1fr_100px_70px_70px_70px_70px_32px] gap-2 items-center">
          <div className="text-sm font-medium truncate">{entry.contributor?.name ?? "—"}</div>
          <Select value={entry.role} onValueChange={(v) => handleRoleChange(entry.id, v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r} className="text-sm capitalize">
                  {r.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number" min={0} max={100}
            className="h-8 text-sm text-center"
            value={entry.master_pct ?? ""}
            onChange={(e) => handlePctChange(entry.id, "master_pct", e.target.value)}
            placeholder="-"
          />
          <Input
            type="number" min={0} max={100}
            className="h-8 text-sm text-center"
            value={entry.producer_pct ?? ""}
            onChange={(e) => handlePctChange(entry.id, "producer_pct", e.target.value)}
            placeholder="-"
          />
          <Input
            type="number" min={0} max={100}
            className="h-8 text-sm text-center"
            value={entry.writer_pct ?? ""}
            onChange={(e) => handlePctChange(entry.id, "writer_pct", e.target.value)}
            placeholder="-"
          />
          <Input
            type="number" min={0} max={100}
            className="h-8 text-sm text-center"
            value={entry.publisher_pct ?? ""}
            onChange={(e) => handlePctChange(entry.id, "publisher_pct", e.target.value)}
            placeholder="-"
          />
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => deleteEntry.mutate({ id: entry.id, songId })}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}

      {/* Totals */}
      {entries.length > 0 && (
        <div className="grid grid-cols-[1fr_100px_70px_70px_70px_70px_32px] gap-2 items-center text-xs px-1 border-t border-border pt-2">
          <span className="font-medium">Totals</span>
          <span />
          <span className={totalClass(masterTotal)}>{masterTotal}%</span>
          <span className={totalClass(producerTotal)}>{producerTotal}%</span>
          <span className={totalClass(writerTotal)}>{writerTotal}%</span>
          <span className={totalClass(publisherTotal)}>{publisherTotal}%</span>
          <span />
        </div>
      )}

      {/* Mirror publisher button */}
      {entries.length > 0 && entries.some((e: any) => e.writer_pct != null) && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground"
          onClick={handleMirrorPublisher}
        >
          <Copy className="h-3 w-3" /> Mirror Writer % → Publisher %
        </Button>
      )}

      {/* Feature 1: Contextual warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {warnings.map((w, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 text-xs px-2.5 py-1.5 rounded-md ${
                w.type === "red"
                  ? "bg-destructive/10 text-destructive"
                  : w.type === "amber"
                  ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {w.type === "info" ? (
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              )}
              <span>{w.text}</span>
            </div>
          ))}
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
                {c.source === "band" && <span className="text-primary ml-2 text-xs">Band member</span>}
                {c.pro_affiliation && <span className="text-muted-foreground ml-2 text-xs">{c.pro_affiliation}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
