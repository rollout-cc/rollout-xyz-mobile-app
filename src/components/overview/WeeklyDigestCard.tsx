import { useState, useMemo } from "react";
import { X, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, format, getDay } from "date-fns";

interface WeeklyDigestCardProps {
  tasksCompleted7d: number;
  totalTasks: number;
  milestonesHit7d: number;
  totalExpenses: number;
  totalRevenue: number;
}

function getMondayKey() {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  return `weekly-digest-dismissed-${format(monday, "yyyy-MM-dd")}`;
}

export function WeeklyDigestCard({
  tasksCompleted7d,
  totalTasks,
  milestonesHit7d,
  totalExpenses,
  totalRevenue,
}: WeeklyDigestCardProps) {
  const { user } = useAuth();
  const mondayKey = useMemo(() => getMondayKey(), []);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(mondayKey) === "true");

  const { data: prefs } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("weekly_summary_email")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Hide if preference disabled or dismissed this week
  if (!prefs?.weekly_summary_email || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(mondayKey, "true");
    setDismissed(true);
  };

  const fmt = (n: number) => `$${Math.abs(n).toLocaleString()}`;

  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-5 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Dismiss weekly digest"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Weekly Digest</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Tasks Completed</p>
          <p className="font-semibold text-foreground">{tasksCompleted7d} / {totalTasks}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Milestones Hit</p>
          <p className="font-semibold text-foreground">{milestonesHit7d}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Revenue (7d)</p>
          <p className="font-semibold text-foreground">{fmt(totalRevenue)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Expenses (7d)</p>
          <p className="font-semibold text-foreground">{fmt(totalExpenses)}</p>
        </div>
      </div>
    </div>
  );
}
