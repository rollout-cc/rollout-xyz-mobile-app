import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const STAGES = [
  "discovered", "contacted", "in_conversation", "materials_requested",
  "internal_review", "offer_sent", "negotiating", "signed", "passed", "on_hold",
] as const;

const stageLabel = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const stageColor = (s: string) => {
  const map: Record<string, string> = {
    discovered: "bg-muted text-muted-foreground",
    contacted: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    in_conversation: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
    materials_requested: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    internal_review: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    offer_sent: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    negotiating: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
    signed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    passed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    on_hold: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  return map[s] || "bg-muted text-muted-foreground";
};

const priorityDot = (p: string) => {
  if (p === "high") return "bg-destructive";
  if (p === "medium") return "bg-amber-500";
  return "bg-muted-foreground/40";
};

interface PipelineBoardProps {
  prospects: any[];
  onSelect: (id: string) => void;
}

export function PipelineBoard({ prospects, onSelect }: PipelineBoardProps) {
  const activeStages = STAGES.filter((s) => s !== "signed" && s !== "passed");

  return (
    <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-3 min-w-max">
        {activeStages.map((stage) => {
          const items = prospects.filter((p: any) => p.stage === stage);
          return (
            <div key={stage} className="w-56 shrink-0">
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {stageLabel(stage)}
                </span>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {items.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {items.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => onSelect(p.id)}
                    className="w-full text-left rounded-lg border border-border p-3 hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn("h-2 w-2 rounded-full shrink-0", priorityDot(p.priority))} />
                      <span className="font-medium text-sm truncate">{p.artist_name}</span>
                    </div>
                    {p.primary_genre && (
                      <div className="text-xs text-muted-foreground truncate">{p.primary_genre}</div>
                    )}
                    {p.city && (
                      <div className="text-xs text-muted-foreground truncate">{p.city}</div>
                    )}
                    {p.next_follow_up && (
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Follow up: {new Date(p.next_follow_up).toLocaleDateString()}
                      </div>
                    )}
                  </button>
                ))}
                {items.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
                    No prospects
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
