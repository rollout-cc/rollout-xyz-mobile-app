import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BarChart3, Users, FolderOpen, CheckCircle2, MoreVertical, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ArtistCardProps {
  artist: any;
  onClick: () => void;
}

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

export function ArtistCard({ artist, onClick }: ArtistCardProps) {
  const initiativeCount = artist.initiatives?.[0]?.count ?? 0;
  const taskCount = artist.tasks?.[0]?.count ?? 0;
  const listeners = artist.monthly_listeners ?? 0;

  // Budget progress bars
  const budgets: { label: string; amount: number }[] = (artist.budgets || []).slice(0, 3);
  const totalBudget = budgets.reduce((s: number, b: any) => s + Number(b.amount || 0), 0);

  return (
    <div
      onClick={onClick}
      className="relative flex flex-col rounded-xl overflow-hidden cursor-pointer group border border-border bg-card hover:shadow-md transition-shadow"
    >
      {/* Top section: avatar + stats */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <Avatar className="h-24 w-24 shrink-0 border-2 border-border">
          <AvatarImage src={artist.avatar_url ?? undefined} className="object-cover" />
          <AvatarFallback className="text-2xl font-bold">{artist.name?.[0]}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-start justify-between gap-1">
            <h3 className="text-base font-bold truncate">{artist.name}</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem>Edit</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {formatNum(totalBudget)}
            </span>
            <span className="flex items-center gap-1" title="Spotify Followers">
              <Users className="h-3 w-3" />
              {listeners > 0 ? formatNum(listeners) : "—"}
            </span>
            <span className="flex items-center gap-1">
              <FolderOpen className="h-3 w-3" />
              {initiativeCount}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {taskCount}
            </span>
          </div>
        </div>
      </div>

      {/* Budget progress bars */}
      {budgets.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          {budgets.map((b: any, i: number) => {
            // Use a simple visual bar (no spent data here, just show allocation)
            const pct = totalBudget > 0 ? (Number(b.amount) / totalBudget) * 100 : 0;
            return (
              <div key={i}>
                <div className="text-xs font-medium mb-0.5">{b.label}</div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
