import { CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { RadialProgress } from "@/components/overview/RadialProgress";
import { cn } from "@/lib/utils";

interface ArtistBreakdownItem {
  id: string;
  name: string;
  avatar_url: string | null;
  budget: number;
  revenue: number;
  expenses: number;
  gp: number;
  completedTasks: number;
  totalTasks: number;
  utilization: number;
  campaignCount: number;
  categories: { label: string; budget: number; spent: number; pct: number }[];
}

interface SpendingPerActSectionProps {
  artistBreakdown: ArtistBreakdownItem[];
  artistCount: number;
  fmt: (n: number) => string;
  fmtSigned: (n: number) => string;
}

export function SpendingPerActSection({ artistBreakdown, artistCount, fmt, fmtSigned }: SpendingPerActSectionProps) {
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="caption-bold">{artistCount} artists</span>
      </div>

      <div className="space-y-4">
        {artistBreakdown.map((artist) => (
          <div
            key={artist.id}
            className="rounded-xl border border-border bg-card p-4 cursor-pointer overflow-hidden"
            onClick={() => navigate(`/roster/${artist.id}`)}
          >
            {/* Header row */}
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-11 w-11 shrink-0 border border-border">
                <AvatarImage src={artist.avatar_url ?? undefined} />
                <AvatarFallback className="text-sm font-bold">{artist.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-base text-foreground truncate block">{artist.name}</span>
                <span className="caption text-muted-foreground">
                  {artist.campaignCount} campaigns · <CheckCircle2 className="inline h-3 w-3 text-emerald-500 -mt-px" /> {artist.completedTasks}/{artist.totalTasks} tasks
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>

            {/* Financial metrics */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <div className="caption text-muted-foreground mb-0.5">Budget</div>
                <div className="text-sm font-bold text-foreground truncate">{fmt(artist.budget)}</div>
              </div>
              <div>
                <div className="caption text-muted-foreground mb-0.5">Spent</div>
                <div className="text-sm font-bold text-destructive truncate">{fmt(artist.expenses)}</div>
              </div>
              <div>
                <div className="caption text-muted-foreground mb-0.5">Revenue</div>
                <div className="text-sm font-bold text-emerald-500 truncate">{fmt(artist.revenue)}</div>
              </div>
              <div>
                <div className="caption text-muted-foreground mb-0.5">P&L</div>
                <div className={cn("text-sm font-bold truncate", artist.gp >= 0 ? "text-emerald-500" : "text-destructive")}>{fmtSigned(artist.gp)}</div>
              </div>
            </div>

            {/* Category radial progress */}
            {artist.categories.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 mb-4">
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                  {artist.categories.map((cat, i) => (
                    <RadialProgress
                      key={i}
                      value={cat.pct}
                      label={cat.label}
                      detail={`${fmt(cat.spent)} / ${fmt(cat.budget)}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Overall utilization */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">Overall Utilization</span>
                <span className="text-lg font-bold text-foreground">{artist.utilization.toFixed(0)}%</span>
              </div>
              <Progress
                value={artist.utilization}
                className={cn("h-3 [&>div]:transition-all", artist.utilization > 90 ? "[&>div]:bg-destructive" : artist.utilization > 70 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500")}
              />
            </div>
          </div>
        ))}

        {artistBreakdown.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No artists yet. Add artists from the Roster page.
          </div>
        )}
      </div>
    </div>
  );
}
