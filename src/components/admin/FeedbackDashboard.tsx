import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Bug, Lightbulb, AlertTriangle, CheckCircle2, Clock, Filter } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "All", "Roster", "Finance", "Distribution", "Splits", "A&R",
  "Tasks & Work", "Settings", "Rolly AI", "Onboarding", "Staff",
  "Overview", "UI/UX", "Performance", "Authentication", "Other",
];

const STATUSES = ["all", "new", "reviewed", "planned", "done", "wont_fix"] as const;
const PRIORITIES = ["all", "critical", "high", "medium", "low"] as const;

const priorityColor: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

const statusIcon: Record<string, React.ReactNode> = {
  new: <Clock className="h-3 w-3" />,
  reviewed: <MessageSquare className="h-3 w-3" />,
  planned: <AlertTriangle className="h-3 w-3" />,
  done: <CheckCircle2 className="h-3 w-3" />,
  wont_fix: <CheckCircle2 className="h-3 w-3" />,
};

export function FeedbackDashboard() {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadFeedback = async () => {
    setLoading(true);
    let query = supabase
      .from("feedback" as any)
      .select("*, teams(name), profiles(full_name)")
      .order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) console.error(error);
    setFeedback((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadFeedback(); }, []);

  const filtered = feedback.filter((f: any) => {
    if (filterCategory !== "All" && f.ai_category !== filterCategory) return false;
    if (filterStatus !== "all" && f.status !== filterStatus) return false;
    if (filterPriority !== "all" && f.ai_priority !== filterPriority) return false;
    if (filterType !== "all" && f.type !== filterType) return false;
    return true;
  });

  const counts = {
    total: feedback.length,
    bugs: feedback.filter((f: any) => f.type === "bug").length,
    features: feedback.filter((f: any) => f.type === "feature").length,
    critical: feedback.filter((f: any) => f.ai_priority === "critical").length,
    high: feedback.filter((f: any) => f.ai_priority === "high").length,
    new: feedback.filter((f: any) => f.status === "new").length,
  };

  const categoryCounts = feedback.reduce((acc: Record<string, number>, f: any) => {
    const cat = f.ai_category || "Uncategorized";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("feedback" as any)
      .update({ status } as any)
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
      toast.success("Status updated");
    }
  };

  const updateNotes = async (id: string, admin_notes: string) => {
    const { error } = await supabase
      .from("feedback" as any)
      .update({ admin_notes } as any)
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, admin_notes } : f)));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Feedback Dashboard
        </CardTitle>
        <CardDescription>AI-categorized user feedback from all teams</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <SummaryCard label="Total" value={counts.total} />
          <SummaryCard label="Bugs" value={counts.bugs} icon={<Bug className="h-3.5 w-3.5 text-destructive" />} />
          <SummaryCard label="Features" value={counts.features} icon={<Lightbulb className="h-3.5 w-3.5 text-primary" />} />
          <SummaryCard label="Critical" value={counts.critical} className="text-destructive" />
          <SummaryCard label="High" value={counts.high} className="text-orange-600" />
          <SummaryCard label="New" value={counts.new} className="text-primary" />
        </div>

        {/* Category breakdown */}
        {Object.keys(categoryCounts).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(categoryCounts)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([cat, count]) => (
                <Badge
                  key={cat}
                  variant="outline"
                  className="cursor-pointer text-xs"
                  onClick={() => setFilterCategory(cat === filterCategory ? "All" : cat)}
                >
                  {cat}: {count as number}
                </Badge>
              ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="bug">Bugs</SelectItem>
              <SelectItem value="feature">Features</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p === "all" ? "All Priority" : p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All Status" : s.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Feedback list */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No feedback found</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((f: any) => (
              <div
                key={f.id}
                className="rounded-lg border p-3 space-y-2 cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {f.type === "bug" ? (
                        <Bug className="h-3.5 w-3.5 text-destructive shrink-0" />
                      ) : (
                        <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">
                        {f.ai_summary || f.message.slice(0, 80)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {f.ai_category && (
                        <Badge variant="outline" className="text-[10px]">{f.ai_category}</Badge>
                      )}
                      {f.ai_priority && (
                        <Badge variant="outline" className={`text-[10px] ${priorityColor[f.ai_priority] || ""}`}>
                          {f.ai_priority}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px] gap-0.5">
                        {statusIcon[f.status]} {f.status?.replace("_", " ")}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {(f as any).teams?.name || "Unknown team"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {(f as any).profiles?.full_name || "Unknown user"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(f.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {expandedId === f.id && (
                  <div className="space-y-3 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Full Message</p>
                      <p className="text-sm bg-muted/50 rounded p-2">{f.message}</p>
                    </div>
                    {f.page_url && (
                      <p className="text-xs text-muted-foreground">Page: <code className="text-[10px]">{f.page_url}</code></p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">Status:</span>
                      <Select value={f.status} onValueChange={(v) => updateStatus(f.id, v)}>
                        <SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.filter((s) => s !== "all").map((s) => (
                            <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1">Admin Notes</p>
                      <Textarea
                        defaultValue={f.admin_notes || ""}
                        onBlur={(e) => {
                          if (e.target.value !== (f.admin_notes || "")) {
                            updateNotes(f.id, e.target.value);
                          }
                        }}
                        placeholder="Add notes…"
                        rows={2}
                        className="text-xs resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryCard({ label, value, icon, className }: { label: string; value: number; icon?: React.ReactNode; className?: string }) {
  return (
    <div className="rounded-lg border p-3 text-center space-y-1">
      <div className="flex items-center justify-center gap-1">
        {icon}
        <span className={`text-xl font-bold ${className || ""}`}>{value}</span>
      </div>
      <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
    </div>
  );
}
