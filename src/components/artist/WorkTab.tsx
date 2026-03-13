import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Plus, Trash2, FolderPlus, ListPlus,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { cn } from "@/lib/utils";
import {
  DragDropContext, Droppable, Draggable, type DropResult,
} from "@hello-pangea/dnd";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WorkTaskItem as TaskItem, WorkTaskList as TaskList } from "@/components/work/WorkTaskItem";

interface WorkTabProps {
  artistId: string;
  teamId: string;
  showCompleted: boolean;
  showArchived: boolean;
}

export function WorkTab({ artistId, teamId, showCompleted, showArchived }: WorkTabProps) {
  const queryClient = useQueryClient();
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
  const [activeExpanded, setActiveExpanded] = useState(true);
  const [newCampaignId, setNewCampaignId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const { data: campaigns = [] } = useQuery({
    queryKey: ["initiatives", artistId],
    queryFn: async () => {
      const { data, error } = await supabase.from("initiatives").select("*").eq("artist_id", artistId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", artistId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("artist_id", artistId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members", teamId],
    queryFn: async () => {
      const { data: memberships, error } = await supabase.from("team_memberships").select("user_id, role").eq("team_id", teamId);
      if (error) throw error;
      if (!memberships || memberships.length === 0) return [];
      const userIds = memberships.map((m: any) => m.user_id);
      const { data: profiles, error: pErr } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
      if (pErr) throw pErr;
      return (profiles || []).map((p: any) => ({ ...p, role: memberships.find((m: any) => m.user_id === p.id)?.role }));
    },
    enabled: !!teamId,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets", artistId],
    queryFn: async () => {
      const { data, error } = await supabase.from("budgets").select("*").eq("artist_id", artistId).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: subBudgets = [] } = useQuery({
    queryKey: ["sub-budgets", artistId],
    queryFn: async () => {
      const budgetIds = budgets.map((b: any) => b.id);
      if (budgetIds.length === 0) return [];
      const { data, error } = await supabase.from("sub_budgets").select("*").in("budget_id", budgetIds).order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: budgets.length > 0,
  });

  const activeCampaigns = campaigns.filter((c: any) => !c.is_archived);
  const archivedCampaigns = campaigns.filter((c: any) => c.is_archived);
  const archivedCampaignIds = new Set(archivedCampaigns.map((c: any) => c.id));

  const activeTasks = tasks.filter((t: any) => !t.is_completed && !archivedCampaignIds.has(t.initiative_id));
  const completedTasks = tasks.filter((t: any) => t.is_completed);
  const unsortedTasks = activeTasks.filter((t: any) => !t.initiative_id);
  const campaignTasks = (campaignId: string) => tasks.filter((t: any) => t.initiative_id === campaignId && !t.is_completed);

  const toggleCampaign = (id: string) => {
    setExpandedCampaigns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    if (newCampaignId && campaigns.some((c: any) => c.id === newCampaignId)) {
      setExpandedCampaigns(prev => ({ ...prev, [newCampaignId]: true }));
      setTimeout(() => setNewCampaignId(null), 100);
    }
  }, [newCampaignId, campaigns]);

  const isEmpty = campaigns.length === 0 && tasks.length === 0;

  if (isEmpty) {
    return <EmptyWorkState artistId={artistId} teamId={teamId} onCampaignCreated={setNewCampaignId} />;
  }

  const sharedContext = { artistId, teamId, campaigns, teamMembers, budgets, subBudgets, editingTaskId, setEditingTaskId };

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-end mb-2">
        <NewCampaignInline artistId={artistId} onCreated={setNewCampaignId} />
      </div>

      {unsortedTasks.length > 0 && (
        <CollapsibleSection title="Unsorted" count={unsortedTasks.length} open={activeExpanded} onToggle={() => setActiveExpanded(!activeExpanded)}>
          <TaskItem key="__new_unsorted" isNew {...sharedContext} />
          <TaskList tasks={unsortedTasks} {...sharedContext} droppableId="unsorted" />
        </CollapsibleSection>
      )}

      {activeCampaigns.map((c: any) => {
        const cTasks = campaignTasks(c.id);
        const isExpanded = expandedCampaigns[c.id] ?? true;
        const isNewlyCreated = newCampaignId === c.id;
        return (
          <CollapsibleSection
            key={c.id} title={c.name} count={cTasks.length}
            open={isExpanded} onToggle={() => toggleCampaign(c.id)}
            titleSlot={<CampaignName campaign={c} artistId={artistId} />}
            actions={<CampaignActions campaign={c} artistId={artistId} taskCount={cTasks.length} />}
          >
            <TaskItem key={`__new_${c.id}`} isNew {...sharedContext} defaultCampaignId={c.id} autoFocus={isNewlyCreated} />
            <TaskList tasks={cTasks} {...sharedContext} droppableId={c.id} />
            {cTasks.length === 0 && !isNewlyCreated && <p className="caption text-muted-foreground py-3 pl-2">No work yet.</p>}
          </CollapsibleSection>
        );
      })}

      {/* If no unsorted but there's no campaigns, still show new task input */}
      {unsortedTasks.length === 0 && activeCampaigns.length === 0 && (
        <TaskItem isNew {...sharedContext} />
      )}

      {showArchived && archivedCampaigns.length > 0 && (
        <div className="mt-4 pt-2 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Archived</p>
          {archivedCampaigns.map((c: any) => {
            const cTasks = tasks.filter((t: any) => t.initiative_id === c.id);
            const isExpanded = expandedCampaigns[c.id] ?? false;
            return (
              <CollapsibleSection
                key={c.id} title={c.name} count={cTasks.length}
                open={isExpanded} onToggle={() => toggleCampaign(c.id)}
                titleSlot={<span className="text-base font-bold tracking-tight truncate text-muted-foreground">{c.name}</span>}
                actions={<CampaignActions campaign={c} artistId={artistId} taskCount={cTasks.length} />}
              >
                <TaskList tasks={cTasks} {...sharedContext} droppableId={`archived-${c.id}`} />
              </CollapsibleSection>
            );
          })}
        </div>
      )}

      {showCompleted && completedTasks.length > 0 && (
        <CollapsibleSection title="Completed" count={completedTasks.length} defaultOpen={false}>
          <TaskList tasks={completedTasks} {...sharedContext} droppableId="completed" />
        </CollapsibleSection>
      )}
    </div>
  );
}

/* ── Empty State ── */
function EmptyWorkState({ artistId, teamId, onCampaignCreated }: { artistId: string; teamId: string; onCampaignCreated: (id: string) => void }) {
  const queryClient = useQueryClient();
  const campaignInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"idle" | "campaign" | "task">("idle");

  const createCampaign = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from("initiatives").insert({ artist_id: artistId, name: name.trim() }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["initiatives", artistId] });
      onCampaignCreated(data.id);
      setMode("idle");
      toast.success("Campaign created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (mode === "campaign") {
    return (
      <div className="mt-4">
        <div className="bg-muted/30 rounded-lg px-4 py-3">
          <input
            ref={campaignInputRef} autoFocus placeholder="Campaign name"
            className="flex-1 bg-transparent text-base font-bold outline-none placeholder:text-muted-foreground/60 w-full"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) createCampaign.mutate((e.target as HTMLInputElement).value);
              if (e.key === "Escape") setMode("idle");
            }}
            onBlur={(e) => { if (!e.target.value.trim()) setMode("idle"); }}
          />
          <p className="text-xs text-muted-foreground mt-2">Press Enter to create campaign</p>
        </div>
      </div>
    );
  }

  if (mode === "task") {
    return (
      <div className="mt-4">
        <TaskItem isNew artistId={artistId} teamId={teamId} campaigns={[]} teamMembers={[]} budgets={[]} subBudgets={[]} autoFocus onCancel={() => setMode("idle")} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
      <p className="text-muted-foreground text-lg">No campaigns or tasks yet</p>
      <div className="flex items-center gap-3">
        <Button variant="default" size="default" className="gap-2" onClick={() => { setMode("campaign"); setTimeout(() => campaignInputRef.current?.focus(), 50); }}>
          <FolderPlus className="h-4 w-4" /> New Campaign
        </Button>
        <Button variant="outline" size="default" className="gap-2" onClick={() => setMode("task")}>
          <ListPlus className="h-4 w-4" /> New Task
        </Button>
      </div>
    </div>
  );
}

/* ── Campaign Actions ── */
function CampaignActions({ campaign, artistId, taskCount }: { campaign: any; artistId: string; taskCount: number }) {
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteCampaign = useMutation({
    mutationFn: async () => {
      const { error: tasksError } = await supabase.from("tasks").delete().eq("initiative_id", campaign.id);
      if (tasksError) throw tasksError;
      const { error } = await supabase.from("initiatives").delete().eq("id", campaign.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiatives", artistId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", artistId] });
      toast.success("Campaign and its tasks deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const archiveCampaign = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("initiatives")
        .update({ is_archived: true })
        .eq("id", campaign.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiatives", artistId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", artistId] });
      toast.success("Campaign archived");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => archiveCampaign.mutate()}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          title="Archive Campaign"
        >
          <Archive className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent transition-colors text-muted-foreground hover:text-destructive"
          title="Delete Campaign"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{campaign.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this campaign and {taskCount} task{taskCount !== 1 ? "s" : ""} within it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteCampaign.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ── Campaign Name ── */
function CampaignName({ campaign, artistId }: { campaign: any; artistId: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(campaign.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const update = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("initiatives").update({ name }).eq("id", campaign.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["initiatives", artistId] }),
  });

  const commit = () => {
    if (draft.trim() && draft.trim() !== campaign.name) {
      update.mutate(draft.trim());
    } else {
      setDraft(campaign.name);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setDraft(campaign.name); setEditing(false); }
        }}
        onClick={(e) => e.stopPropagation()}
        className="text-base font-bold tracking-tight bg-transparent outline-none border-b border-primary/40 w-full"
      />
    );
  }

  return (
    <span
      className="text-base font-bold tracking-tight truncate text-foreground"
      onDoubleClick={(e) => {
        e.stopPropagation();
        setDraft(campaign.name);
        setEditing(true);
      }}
    >
      {campaign.name}
    </span>
  );
}

/* ── New Campaign Inline ── */
function NewCampaignInline({ artistId, onCreated }: { artistId: string; onCreated: (id: string) => void }) {
  const queryClient = useQueryClient();
  const [show, setShow] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const create = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from("initiatives").insert({ artist_id: artistId, name: name.trim() }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["initiatives", artistId] });
      onCreated(data.id);
      setShow(false);
      toast.success("Campaign created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!show) {
    return <Button variant="ghost" size="sm" onClick={() => { setShow(true); setTimeout(() => inputRef.current?.focus(), 50); }}><Plus className="h-4 w-4 mr-1" /> New Campaign</Button>;
  }

  return (
    <input
      ref={inputRef} autoFocus placeholder="Campaign name, press Enter"
      className="bg-transparent border-b border-primary/40 outline-none text-sm py-1 w-48"
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) create.mutate((e.target as HTMLInputElement).value);
        if (e.key === "Escape") setShow(false);
      }}
      onBlur={() => setShow(false)}
    />
  );
}
