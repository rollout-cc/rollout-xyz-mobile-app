import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useTeams } from "@/hooks/useTeams";
import { ArrowLeft, CheckCircle2, AlertTriangle, Clock, Headphones, FolderOpen, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

export default function Overview() {
  const navigate = useNavigate();
  const { data: teams = [] } = useTeams();
  const teamId = teams[0]?.id;

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    },
  });

  // All artists for the team
  const { data: artists = [] } = useQuery({
    queryKey: ["overview-artists", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("id, name, avatar_url, monthly_listeners, genres")
        .eq("team_id", teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  // All budgets across artists
  const { data: budgets = [] } = useQuery({
    queryKey: ["overview-budgets", teamId],
    queryFn: async () => {
      const artistIds = artists.map((a) => a.id);
      if (artistIds.length === 0) return [];
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .in("artist_id", artistIds);
      if (error) throw error;
      return data;
    },
    enabled: artists.length > 0,
  });

  // All transactions across artists
  const { data: transactions = [] } = useQuery({
    queryKey: ["overview-transactions", teamId],
    queryFn: async () => {
      const artistIds = artists.map((a) => a.id);
      if (artistIds.length === 0) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .in("artist_id", artistIds);
      if (error) throw error;
      return data;
    },
    enabled: artists.length > 0,
  });

  // All tasks across team
  const { data: tasks = [] } = useQuery({
    queryKey: ["overview-tasks", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("team_id", teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  // All initiatives across artists
  const { data: initiatives = [] } = useQuery({
    queryKey: ["overview-initiatives", teamId],
    queryFn: async () => {
      const artistIds = artists.map((a) => a.id);
      if (artistIds.length === 0) return [];
      const { data, error } = await supabase
        .from("initiatives")
        .select("*")
        .in("artist_id", artistIds);
      if (error) throw error;
      return data;
    },
    enabled: artists.length > 0,
  });

  // Calculations
  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalSpent = transactions.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
  const remaining = totalBudget - totalSpent;
  const spentPercent = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  const openTasks = tasks.filter((t) => !t.is_completed).length;
  const now = new Date();
  const overdueTasks = tasks.filter((t) => !t.is_completed && t.due_date && new Date(t.due_date) < now).length;
  const dueSoonTasks = tasks.filter((t) => {
    if (t.is_completed || !t.due_date) return false;
    const due = new Date(t.due_date);
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return due >= now && due <= threeDays;
  }).length;

  const formatMoney = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k`;
    return `$${n.toLocaleString()}`;
  };

  const formatNum = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return n.toString();
  };

  // Per-artist stats
  const artistStats = artists.map((artist) => {
    const artistTasks = tasks.filter((t) => t.artist_id === artist.id);
    const completedCount = artistTasks.filter((t) => t.is_completed).length;
    const artistInitiatives = initiatives.filter((i) => i.artist_id === artist.id).length;
    const artistBudgets = budgets.filter((b) => b.artist_id === artist.id);
    const artistBudgetTotal = artistBudgets.reduce((s, b) => s + Number(b.amount), 0);
    const artistTxns = transactions.filter((t) => t.artist_id === artist.id);
    const artistSpent = artistTxns.reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

    return {
      ...artist,
      completedCount,
      initiativeCount: artistInitiatives,
      budgetTotal: artistBudgetTotal,
      spent: artistSpent,
      listeners: artist.monthly_listeners || 0,
    };
  });

  return (
    <AppLayout title="Overview">
      {/* Back + header */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Welcome + task counters */}
      <div className="flex items-start justify-between mb-8">
        <h1 className="text-3xl font-bold">
          Welcome, {profile?.full_name?.split(" ")[0] || "there"}
        </h1>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{openTasks}</div>
            <div className="text-xs text-muted-foreground">Open Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-500">{overdueTasks}</div>
            <div className="text-xs text-muted-foreground">Overdue Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-500">{dueSoonTasks}</div>
            <div className="text-xs text-muted-foreground">Due Soon</div>
          </div>
        </div>
      </div>

      {/* Budget Summary Card */}
      <div className="rounded-xl border border-border bg-card p-6 mb-8">
        <div className="flex items-start gap-12">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Total Budget</div>
            <div className="text-3xl font-bold">{formatMoney(totalBudget)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Total Spent</div>
            <div className="text-3xl font-bold">{formatMoney(totalSpent)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Remaining Total</div>
            <div className="text-3xl font-bold">{formatMoney(remaining)}</div>
          </div>
          <div className="ml-auto flex -space-x-2">
            {artists.slice(0, 4).map((a) => (
              <Avatar key={a.id} className="h-9 w-9 border-2 border-background">
                <AvatarImage src={a.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">{a.name[0]}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <Progress value={spentPercent} className="h-2 [&>div]:bg-emerald-500" />
        </div>
      </div>

      {/* Roster Performance */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Roster Performance</h2>
        </div>

        <div className="space-y-0">
          {artistStats.map((artist) => (
            <div
              key={artist.id}
              className="flex items-center gap-4 py-4 border-b border-border last:border-b-0 cursor-pointer hover:bg-accent/30 -mx-6 px-6 transition-colors"
              onClick={() => navigate(`/roster/${artist.id}`)}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={artist.avatar_url ?? undefined} />
                <AvatarFallback>{artist.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{artist.name}</div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  {artist.listeners > 0 && (
                    <span className="flex items-center gap-1">
                      <Headphones className="h-3 w-3" /> {formatNum(artist.listeners)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <FolderOpen className="h-3 w-3" /> {artist.initiativeCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> {formatMoney(artist.spent)}/{formatMoney(artist.budgetTotal)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="font-semibold text-foreground">{artist.completedCount}</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate("/roster")}
          className="text-sm font-medium text-muted-foreground hover:text-foreground mt-4 block ml-auto transition-colors"
        >
          View Roster
        </button>
      </div>
    </AppLayout>
  );
}
