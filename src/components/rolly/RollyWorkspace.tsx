import { useState } from "react";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, Circle, Clock, DollarSign, ListTodo, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export function RollyWorkspace() {
  const { selectedTeamId } = useSelectedTeam();
  const { user } = useAuth();

  // Fetch tasks assigned to user
  const { data: tasks = [] } = useQuery({
    queryKey: ["rolly-workspace-tasks", selectedTeamId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*, artists(name)")
        .eq("team_id", selectedTeamId!)
        .eq("is_completed", false)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!selectedTeamId && !!user,
  });

  // Fetch artists for the team
  const { data: artists = [] } = useQuery({
    queryKey: ["rolly-workspace-artists", selectedTeamId],
    queryFn: async () => {
      const { data } = await supabase
        .from("artists")
        .select("id, name, avatar_url, monthly_listeners")
        .eq("team_id", selectedTeamId!)
        .order("name");
      return data ?? [];
    },
    enabled: !!selectedTeamId,
  });

  // Fetch budgets
  const { data: budgets = [] } = useQuery({
    queryKey: ["rolly-workspace-budgets", selectedTeamId],
    queryFn: async () => {
      const artistIds = artists.map((a) => a.id);
      if (artistIds.length === 0) return [];
      const { data } = await supabase
        .from("budgets")
        .select("*, artists(name)")
        .in("artist_id", artistIds)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: artists.length > 0,
  });

  const myTasks = tasks.filter((t: any) => t.assigned_to === user?.id);
  const overdueTasks = myTasks.filter((t: any) => t.due_date && new Date(t.due_date) < new Date());
  const totalBudget = budgets.reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Workspace</h2>
        <p className="text-sm text-muted-foreground">
          Ask Rolly for help with any of these — finances, tasks, strategy, and more.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ListTodo className="h-4 w-4" />
              <span className="text-xs font-medium">My Tasks</span>
            </div>
            <p className="text-2xl font-bold">{myTasks.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Overdue</span>
            </div>
            <p className={cn("text-2xl font-bold", overdueTasks.length > 0 && "text-destructive")}>
              {overdueTasks.length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Artists</span>
            </div>
            <p className="text-2xl font-bold">{artists.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">Total Budget</span>
            </div>
            <p className="text-2xl font-bold">
              {totalBudget >= 1_000_000
                ? `$${(totalBudget / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
                : totalBudget >= 1_000
                ? `$${(totalBudget / 1_000).toFixed(0)}k`
                : `$${totalBudget.toLocaleString()}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active tasks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            Open Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {myTasks.length === 0 ? (
            <p className="px-6 pb-4 text-sm text-muted-foreground">
              No open tasks. Ask Rolly to help you plan what's next.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {myTasks.slice(0, 10).map((task: any) => (
                <div key={task.id} className="flex items-start gap-3 px-6 py-3">
                  <Circle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.artists?.name && (
                        <span className="text-xs text-muted-foreground">{task.artists.name}</span>
                      )}
                      {task.due_date && (
                        <span
                          className={cn(
                            "text-xs",
                            new Date(task.due_date) < new Date()
                              ? "text-destructive"
                              : "text-muted-foreground"
                          )}
                        >
                          {format(new Date(task.due_date), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Artists overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Your Roster
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {artists.length === 0 ? (
            <p className="px-6 pb-4 text-sm text-muted-foreground">
              No artists yet. Ask Rolly about building your roster strategy.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {artists.slice(0, 8).map((artist: any) => (
                <div key={artist.id} className="flex items-center gap-3 px-6 py-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold overflow-hidden shrink-0">
                    {artist.avatar_url ? (
                      <img src={artist.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      artist.name?.[0]
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{artist.name}</p>
                  </div>
                  {artist.monthly_listeners != null && artist.monthly_listeners > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      {(artist.monthly_listeners / 1000).toFixed(0)}k
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget summary */}
      {budgets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Budget Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {budgets.slice(0, 8).map((budget: any) => (
                <div key={budget.id} className="flex items-center justify-between px-6 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{budget.label}</p>
                    <span className="text-xs text-muted-foreground">{budget.artists?.name}</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    ${Number(budget.amount || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
