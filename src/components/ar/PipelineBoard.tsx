import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Headphones, Trash2, Plus, Archive } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";

const STAGES = ["contacted", "internal_review", "offer_sent", "negotiating", "signed"] as const;

const stageLabel = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const stageDot = (s: string) => {
  if (s === "contacted") return "bg-blue-500";
  if (s === "internal_review") return "bg-destructive";
  if (s === "offer_sent") return "bg-amber-500";
  if (s === "negotiating") return "bg-purple-500";
  if (s === "signed") return "bg-emerald-500";
  return "bg-muted-foreground";
};

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

function followUpStatus(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, cls: "text-destructive bg-destructive/10" };
  if (diff <= 3) return { label: `${diff}d`, cls: "text-amber-600 bg-amber-500/10" };
  return { label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), cls: "text-muted-foreground bg-muted" };
}

interface PipelineBoardProps {
  prospects: any[];
  onSelect: (id: string) => void;
  onStageChange?: (id: string, newStage: string) => void;
  onDelete?: (id: string) => void;
  onAddToStage?: (stage: string) => void;
}

function ProspectCard({ p, onSelect, onDelete, dragProvided, dragSnapshot }: any) {
  const followUp = followUpStatus(p.next_follow_up);
  return (
    <div
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      {...dragProvided.dragHandleProps}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(p.id)}
      onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') onSelect(p.id); }}
      className={cn(
        "w-full text-left rounded-xl border border-border bg-card p-3 hover:shadow-sm transition-shadow group cursor-pointer select-none",
        dragSnapshot.isDragging && "shadow-lg ring-2 ring-primary/30"
      )}
    >
      <div className="flex items-center gap-2.5">
        <Avatar className="h-8 w-8 shrink-0 border border-border">
          {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.artist_name} />}
          <AvatarFallback className="text-xs font-bold">
            {p.artist_name?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", priorityDot(p.priority))} />
            <span className="font-semibold text-sm truncate">{p.artist_name}</span>
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {p.artist_name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove this prospect and all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(p.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
            {p.primary_genre && (
              <span className="truncate">{p.primary_genre}</span>
            )}
            {p.primary_genre && p.monthly_listeners > 0 && (
              <span className="text-border">·</span>
            )}
            {p.monthly_listeners > 0 && (
              <span className="flex items-center gap-0.5 shrink-0">
                <Headphones className="h-2.5 w-2.5" />
                {formatNum(p.monthly_listeners)}
              </span>
            )}
          </div>
        </div>
      </div>
      {followUp && (
        <div className={cn("text-[10px] font-medium mt-1.5 ml-[42px] inline-flex px-1.5 py-0.5 rounded-full", followUp.cls)}>
          Follow up {followUp.label}
        </div>
      )}
    </div>
  );
}

export function PipelineBoard({ prospects, onSelect, onStageChange, onDelete, onAddToStage }: PipelineBoardProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStage = result.destination.droppableId;
    const prospectId = result.draggableId;
    if (newStage !== result.source.droppableId && onStageChange) {
      onStageChange(prospectId, newStage);
    }
  };

  // Separate passed/declined prospects
  const passedProspects = prospects.filter((p: any) => p.stage === "passed");
  const activeProspects = prospects.filter((p: any) => p.stage !== "passed");

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="pb-4 overflow-x-auto">
        <div className="grid grid-cols-5 gap-4" style={{ minWidth: "850px" }}>
          {STAGES.map((stage) => {
            const items = activeProspects.filter((p: any) => p.stage === stage);
            return (
              <div key={stage} className="min-w-0">
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", stageDot(stage))} />
                  <span className="text-sm font-semibold text-foreground">
                    {stageLabel(stage)}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {items.length}
                  </span>
                </div>

                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "space-y-2 min-h-[120px] rounded-xl p-1.5 transition-colors",
                        snapshot.isDraggingOver && "bg-accent/40"
                      )}
                    >
                      {items.map((p: any, index: number) => (
                        <Draggable key={p.id} draggableId={p.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <ProspectCard
                              p={p}
                              onSelect={onSelect}
                              onDelete={onDelete}
                              dragProvided={dragProvided}
                              dragSnapshot={dragSnapshot}
                            />
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {items.length === 0 && !snapshot.isDraggingOver && (
                        <div className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border rounded-xl">
                          No prospects
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>

                {/* Add button at bottom */}
                {onAddToStage && (
                  <button
                    onClick={() => onAddToStage(stage)}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-2 px-1 w-full"
                  >
                    <Plus className="h-3 w-3" /> New
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Declined / Passed section */}
      {passedProspects.length > 0 && (
        <div className="mt-6 border-t border-border pt-5">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Archive className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">Declined</span>
            <span className="text-xs text-muted-foreground font-medium">{passedProspects.length}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {passedProspects.map((p: any) => (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(p.id)}
                onKeyDown={(e) => { if (e.key === 'Enter') onSelect(p.id); }}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-card/50 p-2.5 hover:bg-accent/30 cursor-pointer transition-colors group opacity-70 hover:opacity-100"
              >
                <Avatar className="h-7 w-7 shrink-0 border border-border">
                  {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.artist_name} />}
                  <AvatarFallback className="text-[10px] font-bold">{p.artist_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-xs text-muted-foreground truncate block">{p.artist_name}</span>
                  {p.monthly_listeners > 0 && (
                    <span className="text-[10px] text-muted-foreground/60">
                      <Headphones className="inline h-2.5 w-2.5 mr-0.5" />
                      {formatNum(p.monthly_listeners)}
                    </span>
                  )}
                </div>
                {onDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {p.artist_name}?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently remove this prospect.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(p.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </DragDropContext>
  );
}
