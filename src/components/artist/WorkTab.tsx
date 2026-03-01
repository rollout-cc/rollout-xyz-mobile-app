import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Trash2, FolderPlus, ListPlus, Calendar, DollarSign, User,
  MoreHorizontal, Archive, Trash, GripVertical, Hash, Link2, Bookmark,
  Star, Check,
} from "lucide-react";
import { toast } from "sonner";
import { InlineField } from "@/components/ui/InlineField";
import { CollapsibleSection, InlineAddTrigger } from "@/components/ui/CollapsibleSection";
import { ItemEditor, DescriptionEditor } from "@/components/ui/ItemEditor";
import { MetaBadge } from "@/components/ui/ItemCard";
import { ToolbarButton } from "@/components/ui/ItemPickers";
import { cn } from "@/lib/utils";
import {
  DragDropContext, Droppable, Draggable, type DropResult,
} from "@hello-pangea/dnd";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

  const sharedContext = { artistId, teamId, campaigns, teamMembers, budgets, editingTaskId, setEditingTaskId };

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
            {cTasks.length === 0 && !isNewlyCreated && <p className="caption text-muted-foreground py-3 pl-2">No tasks yet.</p>}
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

/* ── Task List with drag-and-drop ── */
function TaskList({ tasks, droppableId, ...ctx }: {
  tasks: any[]; droppableId: string;
  artistId: string; teamId: string; campaigns: any[]; teamMembers: any[]; budgets: any[];
  editingTaskId: string | null; setEditingTaskId: (id: string | null) => void;
}) {
  const queryClient = useQueryClient();

  const handleDragEnd = useCallback((result: DropResult) => {
    // For now, reorder is visual only within the section
    // Could persist order in the future with a sort_order column
  }, []);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId={droppableId}>
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="divide-y divide-border/30">
            {tasks.map((task: any, index: number) => (
              <Draggable key={task.id} draggableId={task.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={cn(snapshot.isDragging && "opacity-80 bg-background rounded-lg shadow-lg")}
                  >
                    <TaskItem
                      task={task}
                      dragHandleProps={provided.dragHandleProps}
                      {...ctx}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

/* ── Unified Task Item (new + existing) ── */
interface TaskItemProps {
  task?: any;
  isNew?: boolean;
  artistId: string;
  teamId: string;
  campaigns: any[];
  teamMembers: any[];
  budgets: any[];
  defaultCampaignId?: string;
  autoFocus?: boolean;
  dragHandleProps?: any;
  editingTaskId?: string | null;
  setEditingTaskId?: (id: string | null) => void;
}

function TaskItem({
  task, isNew, artistId, teamId, campaigns, teamMembers, budgets,
  defaultCampaignId, autoFocus, dragHandleProps, editingTaskId, setEditingTaskId,
}: TaskItemProps) {
  const queryClient = useQueryClient();
  const isEditing = isNew ? false : (editingTaskId === task?.id);
  const setEditing = (val: boolean) => {
    if (setEditingTaskId) {
      setEditingTaskId(val ? (task?.id ?? null) : null);
    }
  };
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [activeField, setActiveField] = useState<string | null>(null);

  // For new tasks: show "+ New Task" trigger when not editing
  const [showNew, setShowNew] = useState(false);

  const triggers = useMemo(() => [
    {
      char: "@",
      items: teamMembers.map((m: any) => ({
        id: m.id,
        label: m.full_name || "Unknown",
        icon: <User className="h-3.5 w-3.5 text-muted-foreground" />,
      })),
      onSelect: (item: any, current: string) => current.replace(/@\S*$/, `@${item.label} `),
    },
    {
      char: "#",
      items: campaigns.map((c: any) => ({ id: c.id, label: c.name })),
      onSelect: (item: any, current: string) => current.replace(/#\S*$/, `#${item.label} `),
    },
    {
      char: "$",
      items: budgets.map((b: any) => ({
        id: b.id,
        label: `$${b.amount.toLocaleString()} ${b.label}`,
        icon: <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />,
      })),
      onSelect: (item: any, current: string) => {
        const budget = budgets.find((b: any) => b.id === item.id);
        return current.replace(/\$\S*$/, `$${budget?.amount || 0} `);
      },
    },
  ], [teamMembers, campaigns, budgets]);

  // Fetch assignee name for existing tasks
  const { data: assignee } = useQuery({
    queryKey: ["profile", task?.assigned_to],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("full_name").eq("id", task.assigned_to).single();
      if (error) return null;
      return data;
    },
    enabled: !!task?.assigned_to,
  });

  const campaign = campaigns.find((c: any) => c.id === task?.initiative_id);

  /* ── Mutations ── */
  const addTask = useMutation({
    mutationFn: async (parsed: any) => {
      const { error } = await supabase.from("tasks").insert({
        artist_id: artistId, team_id: teamId, title: parsed.title,
        description: parsed.description || null,
        due_date: parsed.due_date || null, expense_amount: parsed.expense_amount || null,
        initiative_id: parsed.initiative_id || defaultCampaignId || null,
        assigned_to: parsed.assigned_to || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", artistId] });
      setTitle(""); setDescription(""); setShowNew(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateTask = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", artistId] });
      setEditing(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleTask = useMutation({
    mutationFn: async () => {
      const completed = !task.is_completed;
      const { error } = await supabase.from("tasks").update({ is_completed: completed, completed_at: completed ? new Date().toISOString() : null }).eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", artistId] }),
  });

  const deleteTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").delete().eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", artistId] }),
  });

  /* ── Parse shortcuts from title ── */
  const parseAndSubmit = useCallback(() => {
    if (!title.trim()) return;
    let parsed_title = title.trim();
    let due_date: string | undefined;
    let expense_amount: number | undefined;
    let initiative_id: string | undefined;
    let assigned_to: string | undefined;

    const atMatch = parsed_title.match(/@(\S+(?:\s\S+)?)/);
    if (atMatch) {
      const name = atMatch[1].toLowerCase();
      const found = teamMembers.find((m: any) => m.full_name?.toLowerCase().startsWith(name));
      if (found) assigned_to = found.id;
      parsed_title = parsed_title.replace(atMatch[0], "").trim();
    }

    const dollarMatch = parsed_title.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (dollarMatch) { expense_amount = parseFloat(dollarMatch[1].replace(/,/g, "")); parsed_title = parsed_title.replace(dollarMatch[0], "").trim(); }

    const hashMatch = parsed_title.match(/#(\S+)/);
    if (hashMatch) {
      const found = campaigns.find((c: any) => c.name.toLowerCase().startsWith(hashMatch[1].toLowerCase()));
      if (found) initiative_id = found.id;
      parsed_title = parsed_title.replace(hashMatch[0], "").trim();
    }

    const dateMatch = parsed_title.match(/\bdue\s+(\S+)/i);
    if (dateMatch) {
      const ds = dateMatch[1].toLowerCase(); const today = new Date();
      if (ds === "today") due_date = today.toISOString().split("T")[0];
      else if (ds === "tomorrow") { today.setDate(today.getDate() + 1); due_date = today.toISOString().split("T")[0]; }
      else if (/^\d{4}-\d{2}-\d{2}$/.test(ds)) due_date = ds;
      else if (/^\d{1,2}\/\d{1,2}$/.test(ds)) { const [m, d] = ds.split("/").map(Number); due_date = `${today.getFullYear()}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }
      parsed_title = parsed_title.replace(dateMatch[0], "").trim();
    }

    if (isNew) {
      addTask.mutate({ title: parsed_title, description: description.trim() || undefined, due_date, expense_amount, initiative_id, assigned_to });
    } else {
      updateTask.mutate({
        title: parsed_title,
        description: description.trim() || null,
        ...(due_date && { due_date }),
        ...(expense_amount != null && { expense_amount }),
        ...(initiative_id && { initiative_id }),
        ...(assigned_to && { assigned_to }),
      });
    }
  }, [title, description, campaigns, teamMembers, isNew, addTask, updateTask]);

  const handleCancel = () => {
    if (isNew) {
      setTitle(""); setDescription(""); setShowNew(false);
    } else {
      setTitle(task.title);
      setDescription(task.description || "");
      setEditing(false);
    }
  };

  const enterEdit = () => {
    if (task?.is_completed) return;
    setTitle(task?.title || "");
    setDescription(task?.description || "");
    setEditing(true);
  };

  /* ── New task trigger ── */
  if (isNew && !showNew && !autoFocus) {
    return <InlineAddTrigger label="New Task" onClick={() => setShowNew(true)} />;
  }

  /* ── Editing mode (shared for new and existing) ── */
  if (isEditing || (isNew && (showNew || autoFocus))) {
    return (
      <div className="mb-2 rounded-lg border border-border bg-card px-4 py-3 space-y-2">
        <div className="flex items-start gap-3">
          <Checkbox disabled className="opacity-20 mt-1" />
          <div className="flex-1 min-w-0">
            <ItemEditor
              value={title}
              onChange={setTitle}
              onSubmit={parseAndSubmit}
              onCancel={handleCancel}
              placeholder={`Task name (use @ to assign, # to pick initiative, $ to select budget and just type the date like "tomorrow" to set due date easily)`}
              autoFocus={autoFocus || showNew || isEditing}
              triggers={triggers}
              className="font-medium"
            />
            <DescriptionEditor
              value={description}
              onChange={setDescription}
              onSubmit={parseAndSubmit}
              onCancel={handleCancel}
              placeholder="Description"
              className="mt-1"
            />
          </div>
          {!isNew && (
            <button onClick={() => deleteTask.mutate()} className="p-1 text-muted-foreground hover:text-foreground shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Icon toolbar row */}
        <div className="flex items-center gap-0.5 pl-8">
          <ToolbarButton icon={<Star className="h-3.5 w-3.5" />} title="Priority" onClick={() => {}} />
          <ToolbarButton icon={<User className="h-3.5 w-3.5" />} title="Assign (@)" onClick={() => setTitle(prev => prev + "@")} />
          <ToolbarButton icon={<Calendar className="h-3.5 w-3.5" />} title="Due date" onClick={() => setTitle(prev => prev + " due ")} />
          <ToolbarButton icon={<Hash className="h-3.5 w-3.5" />} title="Initiative (#)" onClick={() => setTitle(prev => prev + "#")} />
          <ToolbarButton icon={<DollarSign className="h-3.5 w-3.5" />} title="Cost ($)" onClick={() => setTitle(prev => prev + "$")} />
          <ToolbarButton icon={<Link2 className="h-3.5 w-3.5" />} title="Link" onClick={() => {}} />
          <ToolbarButton icon={<Bookmark className="h-3.5 w-3.5" />} title="Timeline" onClick={() => {}} />
        </div>

        {/* Bottom bar: cancel/save */}
        <div className="flex items-center justify-end pt-1 gap-2">
          <Button variant="ghost" size="sm" className="h-8 text-sm" onClick={handleCancel}>Cancel</Button>
          <Button size="sm" className="h-8 text-sm gap-1.5" onClick={parseAndSubmit} disabled={!title.trim()}>
            <Check className="h-3.5 w-3.5" /> Save
          </Button>
        </div>
      </div>
    );
  }

  /* ── Read mode (existing task) ── */
  return (
    <div
      className={cn(
        "flex items-start gap-2 py-3 px-1 group cursor-pointer",
        task?.is_completed && "opacity-60",
      )}
      onClick={enterEdit}
    >
      {/* Grip handle */}
      <div
        {...dragHandleProps}
        className="touch-none p-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Checkbox */}
      <div className="shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={task.is_completed} onCheckedChange={() => toggleTask.mutate()} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium",
          task.is_completed && "line-through text-muted-foreground"
        )}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
        )}

        {/* Metadata badges row — filled values are "active" MetaBadges, empties are muted icons */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {assignee?.full_name ? (
            <MetaBadge icon={<User className="h-3 w-3" />} onClick={() => { enterEdit(); }}>
              {assignee.full_name}
            </MetaBadge>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); setTitle(task.title + " @"); enterEdit(); }} className="p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
              <User className="h-3.5 w-3.5" />
            </button>
          )}

          {task.due_date ? (
            <MetaBadge icon={<Calendar className="h-3 w-3" />} onClick={() => { enterEdit(); }}>
              {task.due_date}
            </MetaBadge>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); setTitle(task.title + " due "); enterEdit(); }} className="p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
              <Calendar className="h-3.5 w-3.5" />
            </button>
          )}

          {campaign ? (
            <MetaBadge onClick={() => { enterEdit(); }}># {campaign.name}</MetaBadge>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); setTitle(task.title + " #"); enterEdit(); }} className="p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
              <Hash className="h-3.5 w-3.5" />
            </button>
          )}

          {task.expense_amount != null && task.expense_amount > 0 ? (
            <MetaBadge icon={<DollarSign className="h-3 w-3" />} onClick={() => { enterEdit(); }}>
              {task.expense_amount.toLocaleString()}
            </MetaBadge>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); setTitle(task.title + " $"); enterEdit(); }} className="p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
              <DollarSign className="h-3.5 w-3.5" />
            </button>
          )}

          <button onClick={(e) => { e.stopPropagation(); }} className="p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
            <Link2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); }} className="p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
            <Bookmark className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Delete action on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); deleteTask.mutate(); }}
        className="p-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
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
        <TaskItem isNew artistId={artistId} teamId={teamId} campaigns={[]} teamMembers={[]} budgets={[]} autoFocus />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
      <p className="text-muted-foreground text-lg">No campaigns or tasks yet</p>
      <div className="flex items-center gap-3">
        <Button variant="default" size="lg" className="gap-2 text-base" onClick={() => { setMode("campaign"); setTimeout(() => campaignInputRef.current?.focus(), 50); }}>
          <FolderPlus className="h-5 w-5" /> New Campaign
        </Button>
        <Button variant="outline" size="lg" className="gap-2 text-base" onClick={() => setMode("task")}>
          <ListPlus className="h-5 w-5" /> New Task
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent transition-colors">
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-background z-50">
          <DropdownMenuItem onClick={() => archiveCampaign.mutate()}>
            <Archive className="h-4 w-4 mr-2" /> Archive Campaign
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteConfirm(true)}>
            <Trash className="h-4 w-4 mr-2" /> Delete Campaign
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
