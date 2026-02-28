import { CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
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
      <div className="flex items-center justify-between mb-5">
        <span className="caption-bold">{artistCount} artists</span>
      </div>

      <div className="space-y-0">
        {artistBreakdown.map((artist) => (
          <div
            key={artist.id}
            className="border-b border-border last:border-b-0 py-4 hover:bg-accent/30 cursor-pointer transition-colors"
            onClick={() => navigate(`/roster/${artist.id}`)}
          >
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={artist.avatar_url ?? undefined} />
                <AvatarFallback className="text-sm font-bold">{artist.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate">{artist.name}</span>
                  <span className="caption whitespace-nowrap">{artist.campaignCount} campaigns</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {artist.completedTasks}/{artist.totalTasks} tasks
                  </span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 ml-0 sm:ml-14 mb-2">
              <div>
                <div className="caption-bold">Budget</div>
                <div className="font-bold text-sm">{fmt(artist.budget)}</div>
              </div>
              <div>
                <div className="caption-bold">Spent</div>
                <div className="font-bold text-sm text-destructive">{fmt(artist.expenses)}</div>
              </div>
              <div>
                <div className="caption-bold">Revenue</div>
                <div className="font-bold text-sm text-emerald-600">{fmt(artist.revenue)}</div>
              </div>
              <div>
                <div className="caption-bold">P&L</div>
                <div className={cn("font-bold text-sm", artist.gp >= 0 ? "text-emerald-600" : "text-destructive")}>{fmtSigned(artist.gp)}</div>
              </div>
            </div>

            {artist.categories.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 ml-0 sm:ml-14">
                {artist.categories.map((cat, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-muted-foreground truncate">{cat.label}</span>
                      <span className="font-medium ml-2">{fmt(cat.spent)} / {fmt(cat.budget)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", cat.pct > 90 ? "bg-destructive" : cat.pct > 70 ? "bg-amber-500" : "bg-emerald-500")}
                        style={{ width: `${Math.min(cat.pct, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="ml-0 sm:ml-14 mt-2">
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-muted-foreground">Overall Utilization</span>
                <span className="font-semibold">{artist.utilization.toFixed(0)}%</span>
              </div>
              <Progress
                value={artist.utilization}
                className={cn("h-1.5 [&>div]:transition-all", artist.utilization > 90 ? "[&>div]:bg-destructive" : artist.utilization > 70 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500")}
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

      <button
        onClick={() => navigate("/roster")}
        className="text-sm font-medium text-muted-foreground hover:text-foreground mt-4 block ml-auto transition-colors"
      >
        View Full Roster →
      </button>
    </div>
  );
}
