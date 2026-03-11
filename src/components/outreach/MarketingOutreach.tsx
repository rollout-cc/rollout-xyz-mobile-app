import { useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Upload, Plus, Search, Sparkles, RefreshCw, Users,
  Globe, Music, MapPin, Phone, ExternalLink, Filter,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const PLATFORM_OPTIONS = [
  { value: "all", label: "All Platforms" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "spotify_playlist", label: "Spotify Playlist" },
  { value: "youtube", label: "YouTube" },
  { value: "contact", label: "Industry Contact" },
  { value: "venue", label: "Venue" },
];

const SOURCE_LABELS: Record<string, string> = {
  creatorcore: "CreatorCore",
  manual: "Manual Entry",
  csv_import: "CSV Import",
  web_enrichment: "AI Enriched",
  user_submission: "User Submission",
  screenshot_ocr: "Screenshot/OCR",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  "High Confidence": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  "Medium Confidence": "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  "Experimental": "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
};

export function MarketingOutreach() {
  const { selectedTeamId } = useSelectedTeam();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pastePlatform, setPastePlatform] = useState("instagram");
  const [importing, setImporting] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: creators = [], isLoading } = useQuery({
    queryKey: ["creator-intelligence", selectedTeamId, search, platformFilter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_creator_intelligence", {
        search_query: search || "",
        platform_filter: platformFilter === "all" ? null : platformFilter,
        category_filter: null,
        genre_filter: null,
        min_confidence: 0,
        match_limit: 100,
        p_team_id: selectedTeamId,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedTeamId,
  });

  const handlePasteImport = useCallback(async () => {
    if (!pasteText.trim() || !selectedTeamId) return;
    setImporting(true);
    try {
      const lines = pasteText.split("\n").map(l => l.trim()).filter(Boolean);
      const creators = lines.map(line => ({
        handle: line.replace(/^@/, ""),
        platform: pastePlatform,
        source: "manual",
      }));

      const { data: session } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("enrich-creators", {
        body: { creators, team_id: selectedTeamId, mode: "paste" },
      });

      if (res.error) throw new Error(res.error.message);
      const result = res.data;
      toast.success(`Added ${result.inserted} creator(s), ${result.duplicates} updated`);
      setPasteText("");
      setShowAddDialog(false);
      queryClient.invalidateQueries({ queryKey: ["creator-intelligence"] });
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  }, [pasteText, pastePlatform, selectedTeamId, queryClient]);

  const handleCSVUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTeamId) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n");
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));

      const creators = lines.slice(1).filter(l => l.trim()).map(line => {
        const values = line.split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
        const row: any = {};
        headers.forEach((h, i) => { row[h] = values[i] || ""; });

        return {
          handle: row.handle || row.name || row.username || row.account || "",
          platform: row.platform || "instagram",
          category: row.category || row.type || "",
          follower_count: parseInt(row.followers || row.follower_count || "0") || null,
          rate: row.rate || row.price || "",
          contact_info: row.email || row.contact || row.contact_info || "",
          genre_fit: row.genre ? row.genre.split(/[;|]/).map((g: string) => g.trim()) : null,
          notes: row.notes || "",
          url: row.url || row.link || "",
          source: "csv_import",
        };
      }).filter(c => c.handle);

      const res = await supabase.functions.invoke("enrich-creators", {
        body: { creators, team_id: selectedTeamId, mode: "csv" },
      });

      if (res.error) throw new Error(res.error.message);
      const result = res.data;
      toast.success(`CSV imported: ${result.inserted} added, ${result.duplicates} updated, ${result.errors} errors`);
      queryClient.invalidateQueries({ queryKey: ["creator-intelligence"] });
    } catch (err: any) {
      toast.error(err.message || "CSV import failed");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [selectedTeamId, queryClient]);

  const handleEnrich = useCallback(async () => {
    if (!selectedTeamId) return;
    setEnriching(true);
    try {
      const res = await supabase.functions.invoke("enrich-creators", {
        body: { team_id: selectedTeamId, mode: "enrich_existing" },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success(res.data.message);
      queryClient.invalidateQueries({ queryKey: ["creator-intelligence"] });
    } catch (err: any) {
      toast.error(err.message || "Enrichment failed");
    } finally {
      setEnriching(false);
    }
  }, [selectedTeamId, queryClient]);

  const platformIcon = (p: string) => {
    switch (p) {
      case "instagram": return <Globe className="h-3.5 w-3.5" />;
      case "tiktok": return <Globe className="h-3.5 w-3.5" />;
      case "spotify_playlist": return <Music className="h-3.5 w-3.5" />;
      case "venue": return <MapPin className="h-3.5 w-3.5" />;
      case "contact": return <Phone className="h-3.5 w-3.5" />;
      default: return <Users className="h-3.5 w-3.5" />;
    }
  };

  const formatNumber = (n: number | null) => {
    if (!n) return "—";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search creators..."
            className="pl-9"
          />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLATFORM_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={handleEnrich} disabled={enriching}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {enriching ? "Enriching..." : "AI Enrich"}
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            CSV
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>{creators.length} creators</span>
        <span>{creators.filter((c: any) => c.platform === "instagram").length} IG</span>
        <span>{creators.filter((c: any) => c.platform === "tiktok").length} TikTok</span>
        <span>{creators.filter((c: any) => c.platform === "spotify_playlist").length} Playlists</span>
      </div>

      {/* Creator list */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : creators.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No creators found. Add handles or upload a CSV to get started.</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {creators.map((c: any) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center justify-center h-9 w-9 rounded-full bg-muted text-muted-foreground shrink-0">
                {platformIcon(c.platform)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{c.handle}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                    {c.platform.replace("_", " ")}
                  </Badge>
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  {c.category && <span>{c.category}</span>}
                  {c.follower_count && <span>{formatNumber(c.follower_count)} followers</span>}
                  {c.average_views && <span>{formatNumber(c.average_views)} avg views</span>}
                  {c.engagement_rate && <span>{Number(c.engagement_rate).toFixed(1)}% eng</span>}
                  {c.rate && <span>{c.rate}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", CONFIDENCE_COLORS[c.confidence_label] || "")}>
                  {c.confidence_label}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Creator Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Creators</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste handles (one per line). They'll be normalized, deduped, and stored with provenance tracking.
            </p>
            <Select value={pastePlatform} onValueChange={setPastePlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="spotify_playlist">Spotify Playlist</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="contact">Industry Contact</SelectItem>
                <SelectItem value="venue">Venue</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder={"@handle1\n@handle2\nhandle3"}
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {pasteText.split("\n").filter(l => l.trim()).length} handle(s) detected
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handlePasteImport} disabled={importing || !pasteText.trim()}>
              {importing ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
