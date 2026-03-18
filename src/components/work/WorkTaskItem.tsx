import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Trash2, Calendar, DollarSign, User,
  GripVertical, Hash, Link2, Bookmark,
  Star, Check,
} from "lucide-react";
import { toast } from "sonner";
import { InlineAddTrigger } from "@/components/ui/CollapsibleSection";
import { ItemEditor, DescriptionEditor } from "@/components/ui/ItemEditor";
import { MetaBadge } from "@/components/ui/ItemCard";
import { ToolbarButton } from "@/components/ui/ItemPickers";
import { cn, formatLocalDate, parseDateFromText } from "@/lib/utils";
import {
  DragDropContext, Droppable, Draggable, type DropResult,
} from "@hello-pangea/dnd";

/* ── Task List with drag-and-drop (optional) ── */

export interface WorkTaskListProps {
  tasks: any[];
  droppableId: string;
  artistId: string;
  teamId: string;
  campaigns?: any[];
  teamMembers: any[];
  budgets?: any[];
  subBudgets?: any[];
  editingTaskId: string | null;
  setEditingTaskId: (id: string | null) => void;
  onMutateSuccess?: () => void;
}

export function WorkTaskList({
  tasks,
  droppableId,
  ...ctx
}: WorkTaskListProps) {
  const handleDragEnd = useCallback((_result: DropResult) => {}, []);

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
                    <WorkTaskItem
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

/* ── Unified Task Item (new + existing) – shared by Artist Work tab and My Work ── */

export interface WorkTaskItemProps {
  task?: any;
  isNew?: boolean;
  artistId: string;
  teamId: string;
  campaigns?: any[];
  teamMembers: any[];
  budgets?: any[];
  subBudgets?: any[];
  defaultCampaignId?: string;
  autoFocus?: boolean;
  dragHandleProps?: any;
  editingTaskId?: string | null;
  setEditingTaskId?: (id: string | null) => void;
  onMutateSuccess?: () => void;
  defaultAssignedTo?: string;
  initialTitle?: string;
  onCancel?: () => void;
}

export function WorkTaskItem({
  task,
  isNew,
  artistId,
  teamId,
  campaigns: campaignsProp,
  teamMembers,
  budgets: budgetsProp,
  subBudgets: subBudgetsProp,
  defaultCampaignId,
  autoFocus,
  dragHandleProps,
  editingTaskId,
  setEditingTaskId,
  onMutateSuccess,
  defaultAssignedTo,
  initialTitle,
  onCancel,
}: WorkTaskItemProps) {
  const queryClient = useQueryClient();

  const { data: fetchedCampaigns = [] } = useQuery({
    queryKey: ["initiatives", artistId],
    queryFn: async () => {
      const { data, error } = await supabase.from("initiatives").select("*").eq("artist_id", artistId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!artistId && campaignsProp === undefined,
  });

  const { data: fetchedBudgets = [] } = useQuery({
    queryKey: ["budgets", artistId],
    queryFn: async () => {
      const { data, error } = await supabase.from("budgets").select("*").eq("artist_id", artistId).order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!artistId && budgetsProp === undefined,
  });

  const { data: fetchedSubBudgets = [] } = useQuery({
    queryKey: ["sub-budgets", artistId],
    queryFn: async () => {
      if (fetchedBudgets.length === 0) return [];
      const budgetIds = fetchedBudgets.map((b: any) => b.id);
      const { data, error } = await supabase.from("sub_budgets").select("*").in("budget_id", budgetIds).order("created_at");
      if (error) throw error;
      return data || [];
    },
    enabled: !!artistId && subBudgetsProp === undefined && fetchedBudgets.length > 0,
  });

  const campaigns = campaignsProp ?? (artistId ? fetchedCampaigns : []);
  const budgets = budgetsProp ?? (artistId ? fetchedBudgets : []);
  const subBudgets = subBudgetsProp ?? (artistId ? fetchedSubBudgets : []);

  const isEditing = isNew ? false : (editingTaskId === task?.id);
  const setEditing = (val: boolean) => {
    if (setEditingTaskId) {
      setEditingTaskId(val ? (task?.id ?? null) : null);
    }
  };
  const [title, setTitle] = useState(task?.title ?? initialTitle ?? "");
  const [description, setDescription] = useState(task?.description || "");
  const [showNew, setShowNew] = useState(false);
  const [parsedDate, setParsedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (task?.title !== undefined) setTitle(task.title);
    if (task?.description !== undefined) setDescription(task.description || "");
  }, [task?.id, task?.title, task?.description]);

  useEffect(() => {
    if (isNew && initialTitle !== undefined) setTitle(initialTitle);
  }, [isNew, initialTitle]);

  const triggers = useMemo(() => [
    {
      char: "@",
      items: teamMembers.map((m: any) => ({
        id: m.id,
        label: m.full_name || "Unknown",
        icon: m.avatar_url
          ? <img src={m.avatar_url} alt="" className="h-4 w-4 rounded-full object-cover" />
          : <User className="h-3.5 w-3.5 text-muted-foreground" />,
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
      items: (() => {
        const items: any[] = [];
        budgets.forEach((b: any) => {
          const subs = subBudgets.filter((sb: any) => sb.budget_id === b.id);
          items.push({
            id: b.id,
            label: subs.length > 0
              ? `$${b.amount.toLocaleString()} ${b.label} ›`
              : `$${b.amount.toLocaleString()} ${b.label}`,
            icon: <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />,
          });
          subs.forEach((sb: any) => {
            items.push({
              id: `sub:${sb.id}:${b.id}`,
              label: `    ↳ ${sb.label} ($${Number(sb.amount).toLocaleString()})`,
              icon: <DollarSign className="h-3.5 w-3.5 text-muted-foreground/50" />,
            });
          });
        });
        return items;
      })(),
      onSelect: (item: any, current: string) => {
        // Extract the user's typed amount after $
        const amountMatch = current.match(/\$(\d[\d,.]*)$/);
        const userAmount = amountMatch ? amountMatch[1] : "";
        const label = String(item.id).startsWith("sub:")
          ? subBudgets.find((sb: any) => sb.id === String(item.id).split(":")[1])?.label || ""
          : budgets.find((b: any) => b.id === item.id)?.label || "";
        return current.replace(/\$\S*$/, userAmount ? `$${userAmount} [${label}] ` : `[${label}] `);
      },
    },
  ], [teamMembers, campaigns, budgets, subBudgets]);

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

  const addTask = useMutation({
    mutationFn: async (parsed: any) => {
      const { data, error } = await supabase.from("tasks").insert({
        artist_id: artistId || null,
        team_id: teamId,
        title: parsed.title,
        description: parsed.description || null,
        due_date: parsed.due_date || null,
        expense_amount: parsed.expense_amount || null,
        initiative_id: parsed.initiative_id || defaultCampaignId || null,
        assigned_to: parsed.assigned_to || defaultAssignedTo || null,
      }).select("id").single();
      if (error) throw error;

      if (parsed.expense_amount && artistId) {
        await supabase.from("transactions").insert({
          artist_id: artistId,
          amount: parsed.expense_amount,
          description: parsed.title,
          type: "expense",
          task_id: data.id,
          ...(parsed.budget_id ? { budget_id: parsed.budget_id } : {}),
          ...(parsed.sub_budget_id ? { sub_budget_id: parsed.sub_budget_id } : {}),
          ...(parsed.initiative_id ? { initiative_id: parsed.initiative_id } : {}),
        } as any);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", artistId] });
      queryClient.invalidateQueries({ queryKey: ["transactions", artistId] });
      queryClient.invalidateQueries({ queryKey: ["artists-summary"] });
      onMutateSuccess?.();
      setTitle("");
      setDescription("");
      setParsedDate(null);
      setShowNew(false);
      import("@/lib/notifications").then(({ notifyTaskAssigned, checkBudgetThreshold }) => {
        if (variables.assigned_to) {
          notifyTaskAssigned({ id: "", title: variables.title, assigned_to: variables.assigned_to, due_date: variables.due_date, artist_id: artistId });
        }
        if (variables.expense_amount && variables.budget_id) {
          checkBudgetThreshold(artistId, variables.budget_id);
        }
      });
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
      onMutateSuccess?.();
      setEditing(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleTask = useMutation({
    mutationFn: async () => {
      const completed = !task.is_completed;
      const { error } = await supabase.from("tasks").update({ is_completed: completed, completed_at: completed ? new Date().toISOString() : null }).eq("id", task.id);
      if (error) throw error;
      return completed;
    },
    onSuccess: (completed) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", artistId] });
      queryClient.invalidateQueries({ queryKey: ["tasks-completed-count", artistId] });
      onMutateSuccess?.();
      if (completed && task) {
        import("@/lib/notifications").then(({ notifyTaskCompleted }) => {
          notifyTaskCompleted(task);
        });
      }
    },
  });

  const deleteTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").delete().eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", artistId] });
      onMutateSuccess?.();
    },
  });

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
    let budget_id: string | undefined;
    let sub_budget_id: string | undefined;
    if (dollarMatch) {
      expense_amount = parseFloat(dollarMatch[1].replace(/,/g, ""));
      parsed_title = parsed_title.replace(dollarMatch[0], "").trim();
    }

    // Extract [BudgetName] bracket pattern
    const bracketMatch = parsed_title.match(/\[([^\]]+)\]/);
    if (bracketMatch) {
      const budgetLabel = bracketMatch[1].trim();
      parsed_title = parsed_title.replace(bracketMatch[0], "").trim();
      const matchedBudget = budgets.find((b: any) => b.label.toLowerCase() === budgetLabel.toLowerCase());
      if (matchedBudget) budget_id = matchedBudget.id;
      if (!budget_id) {
        const matchedSub = subBudgets.find((sb: any) => sb.label?.toLowerCase() === budgetLabel.toLowerCase());
        if (matchedSub) {
          sub_budget_id = matchedSub.id;
          budget_id = matchedSub.budget_id;
        }
      }
    } else if (expense_amount) {
      // Fallback: match by amount
      const matchedSub = subBudgets.find((sb: any) => Number(sb.amount) === expense_amount);
      if (matchedSub) {
        sub_budget_id = matchedSub.id;
        budget_id = matchedSub.budget_id;
      } else {
        const matchedBudget = budgets.find((b: any) => Number(b.amount) === expense_amount);
        if (matchedBudget) budget_id = matchedBudget.id;
      }
    }

    const hashMatch = parsed_title.match(/#(\S+)/);
    if (hashMatch) {
      const found = campaigns.find((c: any) => c.name.toLowerCase().startsWith(hashMatch[1].toLowerCase()));
      if (found) initiative_id = found.id;
      parsed_title = parsed_title.replace(hashMatch[0], "").trim();
    }

    const dateMatch = parsed_title.match(/\bdue\s+(\S+)/i);
    if (dateMatch) {
      const ds = dateMatch[1].toLowerCase();
      const today = new Date();
      if (ds === "today") due_date = formatLocalDate(today);
      else if (ds === "tomorrow") {
        today.setDate(today.getDate() + 1);
        due_date = formatLocalDate(today);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(ds)) due_date = ds;
      else if (/^\d{1,2}\/\d{1,2}$/.test(ds)) {
        const [m, d] = ds.split("/").map(Number);
        due_date = `${today.getFullYear()}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
      parsed_title = parsed_title.replace(dateMatch[0], "").trim();
    }

    // Use inline-detected date from ItemEditor if no date was parsed above
    if (!due_date && parsedDate) {
      due_date = formatLocalDate(parsedDate);
    }

    if (isNew) {
      addTask.mutate({ title: parsed_title, description: description.trim() || undefined, due_date, expense_amount, initiative_id, assigned_to, budget_id, sub_budget_id });
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
  }, [title, description, campaigns, teamMembers, budgets, subBudgets, isNew, addTask, updateTask]);

  const handleCancel = () => {
    if (isNew) {
      setTitle("");
      setDescription("");
      setParsedDate(null);
      setShowNew(false);
    } else {
      setTitle(task.title);
      setDescription(task.description || "");
      setParsedDate(null);
      setEditing(false);
    }
    onCancel?.();
  };

  const enterEdit = () => {
    if (task?.is_completed) return;
    setTitle(task?.title || "");
    setDescription(task?.description || "");
    setEditing(true);
  };

  if (isNew && !showNew && !autoFocus) {
    return <InlineAddTrigger label="New Work" onClick={() => setShowNew(true)} />;
  }

  /* ── Edit / New form ── */
  if (isEditing || (isNew && (showNew || autoFocus))) {
    return (
      <div className="mb-2 rounded-xl border border-border bg-card px-3 py-3.5 space-y-3 min-w-0 sm:px-4">
        <div className="flex items-start gap-3 min-w-0">
          <Checkbox disabled className="opacity-20 mt-[3px] shrink-0" />
          <div className="flex-1 min-w-0">
            <ItemEditor
              value={title}
              onChange={setTitle}
              onSubmit={parseAndSubmit}
              onCancel={handleCancel}
              placeholder="Task title… @ assign, # campaign, $ budget"
              autoFocus={autoFocus || showNew || isEditing}
              triggers={triggers}
              className="text-[15px] font-medium leading-snug"
              enableDateDetection
              onDateParsed={setParsedDate}
              parsedDate={parsedDate}
            />
            <DescriptionEditor
              value={description}
              onChange={setDescription}
              onSubmit={parseAndSubmit}
              onCancel={handleCancel}
              placeholder="Add notes…"
              className="mt-1.5 text-sm"
            />
          </div>
          {!isNew && (
            <button
              onClick={() => deleteTask.mutate()}
              className="p-2 -mr-1 text-muted-foreground/40 hover:text-destructive active:text-destructive transition-colors shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-0.5 sm:flex-row sm:items-center sm:justify-between">
          {/* Quick-add toolbar: scroll horizontally on narrow screens */}
          <div className="flex items-center gap-0.5 -mx-1 px-1 min-w-0 overflow-x-auto overflow-y-hidden scrollbar-hide">
            <ToolbarButton icon={<Star className="h-4 w-4" />} title="Priority" onClick={() => {}} />
            <ToolbarButton icon={<User className="h-4 w-4" />} title="Assign (@)" onClick={() => setTitle((prev) => prev + " @")} />
            <ToolbarButton icon={<Calendar className="h-4 w-4" />} title="Due date" onClick={() => setTitle((prev) => prev + " due ")} />
            <ToolbarButton icon={<Hash className="h-4 w-4" />} title="Campaign (#)" onClick={() => setTitle((prev) => prev + " #")} />
            <ToolbarButton icon={<DollarSign className="h-4 w-4" />} title="Cost ($)" onClick={() => setTitle((prev) => prev + " $")} />
            <ToolbarButton icon={<Link2 className="h-4 w-4" />} title="Link" onClick={() => {}} />
            <ToolbarButton icon={<Bookmark className="h-4 w-4" />} title="Timeline" onClick={() => {}} />
          </div>
          <div className="flex items-center justify-end gap-2 shrink-0">
            <Button variant="ghost" size="sm" className="h-9 px-3 text-sm sm:px-4" onClick={handleCancel}>Cancel</Button>
            <Button size="sm" className="h-9 px-3 text-sm gap-1.5 sm:px-4" onClick={parseAndSubmit} disabled={!title.trim()}>
              <Check className="h-3.5 w-3.5 shrink-0" /> Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Read mode ── */
  if (!task) return null;

  const hasFilledMeta = assignee?.full_name || task.due_date || campaign || (task.expense_amount != null && task.expense_amount > 0);

  return (
    <div
      className={cn(
        "flex items-start gap-3 py-3.5 group cursor-pointer",
        task?.is_completed && "opacity-50",
      )}
      onClick={enterEdit}
    >
      {dragHandleProps != null && (
        <div
          {...dragHandleProps}
          className="touch-none p-1 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0 -ml-1"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Checkbox — larger touch target on mobile */}
      <div
        className="shrink-0 mt-[2px] flex items-center justify-center"
        style={{ minWidth: 28, minHeight: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox checked={task.is_completed} onCheckedChange={() => toggleTask.mutate()} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-[15px] font-medium leading-snug",
          task.is_completed ? "line-through text-muted-foreground" : "text-foreground"
        )}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-sm text-muted-foreground mt-0.5 leading-snug line-clamp-2">{task.description}</p>
        )}

        {/* Only show meta row when there is actual data */}
        {hasFilledMeta && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {assignee?.full_name && (
              <MetaBadge icon={<User className="h-3 w-3" />} onClick={() => enterEdit()}>
                {assignee.full_name}
              </MetaBadge>
            )}
            {task.due_date && (
              <MetaBadge icon={<Calendar className="h-3 w-3" />} onClick={() => enterEdit()}>
                {task.due_date}
              </MetaBadge>
            )}
            {campaign && (
              <MetaBadge onClick={() => enterEdit()}># {campaign.name}</MetaBadge>
            )}
            {task.expense_amount != null && task.expense_amount > 0 && (
              <MetaBadge icon={<DollarSign className="h-3 w-3" />} onClick={() => enterEdit()}>
                ${task.expense_amount.toLocaleString()}
              </MetaBadge>
            )}
          </div>
        )}
      </div>

      {/* Delete — always slightly visible so mobile users can tap it */}
      <button
        onClick={(e) => { e.stopPropagation(); deleteTask.mutate(); }}
        className="shrink-0 flex items-center justify-center w-8 h-8 -mr-1 mt-0.5 rounded-lg text-muted-foreground/25 hover:text-destructive hover:bg-destructive/5 active:text-destructive active:bg-destructive/5 transition-colors"
        aria-label="Delete task"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
