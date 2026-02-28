import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Headphones, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";

const STAGES = ["contacted", "offer_sent", "negotiating", "signed"] as const;

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

interface PipelineBoardProps {
  prospects: any[];
  onSelect: (id: string) => void;
  onStageChange?: (id: string, newStage: string) => void;
}

export function PipelineBoard({ prospects, onSelect, onStageChange }: PipelineBoardProps) {
  const activeStages = STAGES;

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStage = result.destination.droppableId;
    const prospectId = result.draggableId;
    if (newStage !== result.source.droppableId && onStageChange) {
      onStageChange(prospectId, newStage);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
          {activeStages.map((stage, idx) => {
            const items = prospects.filter((p: any) => p.stage === stage);
            return (
              <div key={stage} className="flex">
                {idx > 0 && (
                  <Separator orientation="vertical" className="mx-2 h-auto self-stretch" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className="text-sm font-bold text-foreground tracking-wide">
                      {stageLabel(stage)}
                    </span>
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                      {items.length}
                    </Badge>
                  </div>
                  <Droppable droppableId={stage}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "space-y-2 min-h-[80px] rounded-lg p-1 transition-colors",
                          snapshot.isDraggingOver && "bg-accent/40"
                        )}
                      >
                        {items.map((p: any, index: number) => (
                          <Draggable key={p.id} draggableId={p.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <button
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                onClick={() => onSelect(p.id)}
                                className={cn(
                                  "w-full text-left rounded-xl border border-border bg-card p-3 hover:shadow-md transition-shadow group",
                                  dragSnapshot.isDragging && "shadow-lg ring-2 ring-primary/30"
                                )}
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
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {items.length === 0 && !snapshot.isDraggingOver && (
                          <div className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
                            No prospects
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}
