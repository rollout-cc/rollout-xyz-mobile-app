import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Headphones, MapPin } from "lucide-react";

const STAGES = [
  "discovered", "contacted", "in_conversation", "materials_requested",
  "internal_review", "offer_sent", "negotiating", "signed", "passed", "on_hold",
] as const;

const stageLabel = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const priorityDot = (p: string) => {
  if (p === "high") return "bg-destructive";
  if (p === "medium") return "bg-amber-500";
  return "bg-muted-foreground/40";
};

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

function getSpotifyAvatar(spotifyUri: string | null): string | undefined {
  if (!spotifyUri) return undefined;
  const match = spotifyUri.match(/spotify:artist:(\w+)/);
  if (!match) return undefined;
  // We don't have the image URL stored, return undefined
  return undefined;
}

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
            <div key={stage} className="w-60 shrink-0">
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
                    className="w-full text-left rounded-xl border border-border bg-card p-3 hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0 border border-border">
                        <AvatarFallback className="text-sm font-bold">
                          {p.artist_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className={cn("h-2 w-2 rounded-full shrink-0", priorityDot(p.priority))} />
                          <span className="font-semibold text-sm truncate">{p.artist_name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                          {p.primary_genre && (
                            <span className="truncate">{p.primary_genre}</span>
                          )}
                          {p.city && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" />
                              {p.city}
                            </span>
                          )}
                        </div>
                        {p.monthly_listeners && p.monthly_listeners > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Headphones className="h-3 w-3" />
                            {formatNum(p.monthly_listeners)}
                          </div>
                        )}
                      </div>
                    </div>
                    {p.next_follow_up && (
                      <div className="text-[10px] text-muted-foreground mt-2 pl-[52px]">
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
