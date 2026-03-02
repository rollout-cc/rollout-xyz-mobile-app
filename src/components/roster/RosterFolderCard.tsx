import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DollarSign, MoreVertical, Trash2, UserPlus, UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

interface RosterFolderCardProps {
  folder: { id: string; name: string };
  artists: any[];
  allArtists: any[];
  onAddArtist: (artistId: string) => void;
  onRemoveArtist: (artistId: string) => void;
  onDelete: () => void;
  onClick: () => void;
  isDraggingOver?: boolean;
}

export function RosterFolderCard({ folder, artists, allArtists, onAddArtist, onRemoveArtist, onDelete, onClick, isDraggingOver }: RosterFolderCardProps) {
  const displayArtists = artists.slice(0, 4);
  const totalSpent = artists.reduce((sum, a) => {
    const budgets = a.budgets || [];
    return sum + budgets.reduce((s: number, b: any) => s + Number(b.amount || 0), 0);
  }, 0);

  const availableArtists = allArtists.filter((a) => a.folder_id !== folder.id);

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {availableArtists.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2">
                    <UserPlus className="h-3.5 w-3.5" /> Add Artist
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
                    {availableArtists.map((a) => (
                      <DropdownMenuItem key={a.id} onClick={() => onAddArtist(a.id)} className="gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={a.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[9px]">{a.name?.[0]}</AvatarFallback>
                        </Avatar>
                        {a.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              {artists.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2">
                    <UserMinus className="h-3.5 w-3.5" /> Remove Artist
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
                    {artists.map((a) => (
                      <DropdownMenuItem key={a.id} onClick={() => onRemoveArtist(a.id)} className="gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={a.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[9px]">{a.name?.[0]}</AvatarFallback>
                        </Avatar>
                        {a.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive gap-2" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" /> Delete Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
