import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DollarSign, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

interface RosterFolderCardProps {
  folder: { id: string; name: string };
  artists: any[];
  onOpenAddDialog?: () => void;
  onDelete: () => void;
  onClick: () => void;
  isDraggingOver?: boolean;
}

export function RosterFolderCard({ folder, artists, onOpenAddDialog, onDelete, onClick, isDraggingOver }: RosterFolderCardProps) {
  const displayArtists = artists.slice(0, 4);
  const totalSpent = artists.reduce((sum, a) => {
    const txns = a.transactions || [];
    return sum + txns
      .filter((t: any) => t.type === "expense")
      .reduce((s: number, t: any) => s + Math.abs(Number(t.amount || 0)), 0);
  }, 0);

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex flex-col rounded-xl overflow-hidden cursor-pointer group border bg-card hover:shadow-md transition-all",
        isDraggingOver
          ? "border-primary border-2 shadow-lg ring-2 ring-primary/20"
          : "border-border"
      )}
    >
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-1 mb-3">
          <h3 className="text-sm font-semibold truncate">{folder.name}</h3>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={(e) => { e.stopPropagation(); onOpenAddDialog?.(); }}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {[0, 1, 2, 3].map((i) => {
            const a = displayArtists[i];
            return (
              <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted">
                {a ? (
                  <Avatar className="h-full w-full rounded-lg">
                    <AvatarImage src={a.avatar_url ?? undefined} className="object-cover" />
                    <AvatarFallback className="text-lg font-bold rounded-lg">{a.name?.[0]}</AvatarFallback>
                  </Avatar>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{artists.length} artist{artists.length !== 1 ? "s" : ""}</span>
          <span className="flex items-center gap-0.5">
            <DollarSign className="h-3 w-3" />
            {formatNum(totalSpent)}
          </span>
        </div>
      </div>
    </div>
  );
}
