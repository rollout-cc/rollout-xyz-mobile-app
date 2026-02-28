import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useProspects } from "@/hooks/useProspects";
import { useTeams } from "@/hooks/useTeams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, LayoutGrid, List, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { NewProspectDialog } from "@/components/ar/NewProspectDialog";
import { PipelineBoard } from "@/components/ar/PipelineBoard";
import { ProspectTable } from "@/components/ar/ProspectTable";

const STAGES = [
  "discovered", "contacted", "in_conversation", "materials_requested",
  "internal_review", "offer_sent", "negotiating", "signed", "passed", "on_hold",
] as const;

const stageLabel = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function ARList() {
  const { data: prospects = [], isLoading } = useProspects();
  const { data: teams = [] } = useTeams();
  const teamId = teams[0]?.id;
  const navigate = useNavigate();
  const [view, setView] = useState<"board" | "table">("board");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return prospects;
    const q = search.toLowerCase();
    return prospects.filter(
      (p: any) =>
        p.artist_name?.toLowerCase().includes(q) ||
        p.primary_genre?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q)
    );
  }, [prospects, search]);

  // Quick metrics
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));

  const byStage = useMemo(() => {
    const counts: Record<string, number> = {};
    STAGES.forEach((s) => (counts[s] = 0));
    prospects.forEach((p: any) => {
      counts[p.stage] = (counts[p.stage] || 0) + 1;
    });
    return counts;
  }, [prospects]);

  const offersSent = byStage["offer_sent"] + byStage["negotiating"];
  const signedCount = byStage["signed"];
  const followUpsDue = prospects.filter(
    (p: any) => p.next_follow_up && new Date(p.next_follow_up) <= endOfWeek && !["signed", "passed"].includes(p.stage)
  ).length;

  return (
    <AppLayout title="A&R">
      <div className="mb-6">
        <h1 className="text-foreground">A&R Research</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track and manage artist prospects
        </p>
      </div>

      {/* Quick metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Pipeline" value={prospects.length} />
        <MetricCard label="Offers Sent" value={offersSent} />
        <MetricCard label="Signed" value={signedCount} accent="text-emerald-600" />
        <MetricCard label="Follow-ups This Week" value={followUpsDue} accent={followUpsDue > 0 ? "text-amber-600" : undefined} />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prospects..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center border border-border rounded-md">
          <button
            onClick={() => setView("board")}
            className={cn(
              "px-3 py-1.5 text-sm transition-colors rounded-l-md",
              view === "board" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("table")}
            className={cn(
              "px-3 py-1.5 text-sm transition-colors rounded-r-md",
              view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)} className="gap-1">
          <Plus className="h-4 w-4" /> New Prospect
        </Button>
      </div>

      {/* Content */}
      {view === "board" ? (
        <PipelineBoard prospects={filtered} onSelect={(id) => navigate(`/ar/${id}`)} />
      ) : (
        <ProspectTable prospects={filtered} onSelect={(id) => navigate(`/ar/${id}`)} />
      )}

      <NewProspectDialog open={showNew} onOpenChange={setShowNew} teamId={teamId} />
    </AppLayout>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("text-2xl font-bold", accent)}>{value}</div>
    </div>
  );
}
