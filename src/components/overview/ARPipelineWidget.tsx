import { cn } from "@/lib/utils";

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  contacted: { label: "Contacted", color: "bg-blue-500" },
  internal_review: { label: "Internal Review", color: "bg-destructive" },
  offer_sent: { label: "Offer Sent", color: "bg-amber-500" },
  negotiating: { label: "Negotiating", color: "bg-purple-500" },
  signed: { label: "Signed", color: "bg-emerald-500" },
  passed: { label: "Declined", color: "bg-muted-foreground" },
};

interface ARPipelineWidgetProps {
  prospects: { id: string; stage: string; artist_name: string; avatar_url: string | null; priority: string }[];
}

export function ARPipelineWidget({ prospects }: ARPipelineWidgetProps) {
  if (prospects.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No prospects yet. Add prospects from the A&R page.
      </div>
    );
  }

  const activeStages = ["contacted", "internal_review", "offer_sent", "negotiating", "signed"];
  const stageCounts: { stage: string; count: number; config: { label: string; color: string } }[] = [];
  const total = prospects.length;

  for (const stage of activeStages) {
    const count = prospects.filter((p) => p.stage === stage).length;
    if (count > 0) {
      stageCounts.push({ stage, count, config: STAGE_CONFIG[stage] || { label: stage, color: "bg-muted" } });
    }
  }

  const passedCount = prospects.filter((p) => p.stage === "passed").length;

  return (
    <div>
      {/* Summary stats */}
      <div className="flex items-center gap-6 mb-4">
        <div>
          <div className="text-2xl font-bold text-foreground">{total}</div>
          <div className="caption text-muted-foreground">Total</div>
        </div>
        {stageCounts.slice(0, 4).map((s) => (
          <div key={s.stage}>
            <div className="text-2xl font-bold text-foreground">{s.count}</div>
            <div className="caption text-muted-foreground">{s.config.label}</div>
          </div>
        ))}
      </div>

      {/* Horizontal pipeline bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-muted">
        {stageCounts.map((s) => (
          <div
            key={s.stage}
            className={cn("h-full transition-all", s.config.color)}
            style={{ width: `${(s.count / total) * 100}%` }}
            title={`${s.config.label}: ${s.count}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {stageCounts.map((s) => (
          <div key={s.stage} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={cn("h-2 w-2 rounded-full", s.config.color)} />
            <span>{s.config.label}</span>
            <span className="font-semibold text-foreground">{s.count}</span>
          </div>
        ))}
        {passedCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-muted-foreground" />
            <span>Declined</span>
            <span className="font-semibold text-foreground">{passedCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
