import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StaffEmploymentDrawer } from "@/components/staff/StaffEmploymentDrawer";
import { ArrowLeft, Plus, Trash2, Info, CheckCircle2, ListTodo } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export default function StaffDetail() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { selectedTeamId: teamId } = useSelectedTeam();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"tasks" | "info">("tasks");
  const [showAdd, setShowAdd] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [form, setForm] = useState({ title: "", due_date: "", artist_id: "none" });

  const { data: profile } = useQuery({
    queryKey: ["staff-detail-profile", memberId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", memberId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
  });

  const { data: membership } = useQuery({
    queryKey: ["staff-detail-membership", memberId, teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select("role")
        .eq("user_id", memberId!)
        .eq("team_id", teamId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!memberId && !!teamId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["staff-detail-tasks", memberId, teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("team_id", teamId!)
        .eq("assigned_to", memberId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!memberId && !!teamId,
  });

  const { data: artists = [] } = useQuery({
    queryKey: ["staff-detail-artists", teamId],
    queryFn: async () => {
      const { data, error } = await supabase.from("artists").select("id, name").eq("team_id", teamId!);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const addTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        team_id: teamId!,
        assigned_to: memberId!,
        title: form.title.trim(),
        due_date: form.due_date || null,
        artist_id: form.artist_id === "none" ? null : form.artist_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-detail-tasks"] });
      setForm({ title: "", due_date: "", artist_id: "none" });
      toast.success("Work item assigned");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("tasks").update({
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-detail-tasks"] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-detail-tasks"] }),
  });

  const artistMap = useMemo(() => {
    const m: Record<string, string> = {};
    artists.forEach((a) => { m[a.id] = a.name; });
    return m;
  }, [artists]);

  const openTasks = tasks.filter((t: any) => !t.is_completed).length;
  const completedTasks = tasks.filter((t: any) => t.is_completed).length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const name = profile?.full_name || "Staff Member";

  return (
    <AppLayout title={name}>
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-lg font-bold">{name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{name}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {membership && <span className="capitalize">{membership.role.replace("_", " ")}</span>}
              {profile?.job_role && <span>· {profile.job_role}</span>}
            </div>
          </div>
          {teamId && (
            <Button variant="outline" size="sm" onClick={() => setShowDrawer(true)}>
              <Info className="h-4 w-4 mr-1.5" /> Employment
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><ListTodo className="h-4 w-4" /> {openTasks} open</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {completedTasks} completed</span>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Task Completion</span>
            <span className="font-semibold">{completionRate}%</span>
          </div>
          <Progress
            value={completionRate}
            className={cn("h-1.5 [&>div]:transition-all",
              completionRate >= 80 ? "[&>div]:bg-emerald-500" : completionRate >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-destructive"
            )}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5">
        {(["tasks", "info"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              activeTab === tab ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {tab === "tasks" ? "Tasks" : "Info"}
          </button>
        ))}
      </div>

      {activeTab === "tasks" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Assigned Work</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(!showAdd)}>
              <Plus className="h-4 w-4 mr-1" /> Assign Work
            </Button>
          </div>

          {showAdd && (
            <div className="flex flex-wrap gap-3 mb-4 p-3 rounded-lg border border-border">
              <Input
                placeholder="Task title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="flex-1 min-w-[200px]"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter" && form.title.trim()) addTask.mutate(); }}
              />
              <Select value={form.artist_id} onValueChange={(v) => setForm({ ...form, artist_id: v })}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Artist (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Artist</SelectItem>
                  {artists.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-40" />
              <Button size="sm" onClick={() => addTask.mutate()} disabled={!form.title.trim()}>Add</Button>
            </div>
          )}

          {tasks.length === 0 && !showAdd ? (
            <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
          ) : (
            <div className="space-y-1">
              {tasks.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-border group">
                  <Checkbox
                    checked={t.is_completed}
                    onCheckedChange={(checked) => toggleTask.mutate({ id: t.id, completed: !!checked })}
                  />
                  <div className="flex-1 min-w-0">
                    <span className={cn("text-sm block", t.is_completed && "line-through text-muted-foreground")}>
                      {t.title}
                    </span>
                    {t.artist_id && artistMap[t.artist_id] && (
                      <span className="text-xs text-muted-foreground">
                        {artistMap[t.artist_id]}
                      </span>
                    )}
                  </div>
                  {t.due_date && <span className="text-xs text-muted-foreground">{t.due_date}</span>}
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => deleteTask.mutate(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "info" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4 space-y-3">
            <h4 className="font-semibold text-sm">Profile</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Name</span><p className="font-medium">{profile?.full_name || "—"}</p></div>
              <div><span className="text-muted-foreground">Role</span><p className="font-medium capitalize">{membership?.role?.replace("_", " ") || "—"}</p></div>
              <div><span className="text-muted-foreground">Job Title</span><p className="font-medium">{profile?.job_role || "—"}</p></div>
              <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{profile?.phone_number || "—"}</p></div>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={() => setShowDrawer(true)}>
            <Info className="h-4 w-4 mr-1.5" /> View Employment Details
          </Button>
        </div>
      )}

      {teamId && showDrawer && (
        <StaffEmploymentDrawer
          open={showDrawer}
          onOpenChange={setShowDrawer}
          userId={memberId!}
          teamId={teamId}
          staffName={name}
        />
      )}
    </AppLayout>
  );
}
