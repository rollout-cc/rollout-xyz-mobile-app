import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ChevronDown, ChevronUp, FolderPlus, ListPlus, Calendar, DollarSign, User, MoreHorizontal, Archive, Trash } from "lucide-react";
import { toast } from "sonner";
import { InlineField } from "@/components/ui/InlineField";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WorkTabProps {
  artistId: string;
  teamId: string;
}

export function WorkTab({ artistId, teamId }: WorkTabProps) {
  const queryClient = useQueryClient();
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
  const [activeExpanded, setActiveExpanded] = useState(true);
  const [newCampaignId, setNewCampaignId] = useState<string | null>(null);

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

  const activeTasks = tasks.filter((t: any) => !t.is_completed);
  const completedTasks = tasks.filter((t: any) => t.is_completed);
  const unsortedTasks = activeTasks.filter((t: any) => !t.initiative_id);
  const campaignTasks = (campaignId: string) => activeTasks.filter((t: any) => t.initiative_id === campaignId);

  const toggleCampaign = (id: string) => {
    setExpandedCampaigns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // When a new campaign is created, expand it and focus its task input
  useEffect(() => {
    if (newCampaignId && campaigns.some((c: any) => c.id === newCampaignId)) {
      setExpandedCampaigns(prev => ({ ...prev, [newCampaignId]: true }));
      // Clear after a tick so the task input can auto-focus
      setTimeout(() => setNewCampaignId(null), 100);
    }
  }, [newCampaignId, campaigns]);

  const isEmpty = campaigns.length === 0 && tasks.length === 0;

  if (isEmpty) {
    return <EmptyWorkState artistId={artistId} teamId={teamId} onCampaignCreated={setNewCampaignId} />;
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
          <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} className="rounded" />
          Show Completed
        </label>
        <NewCampaignInline artistId={artistId} onCreated={setNewCampaignId} />
      </div>

      {/* Active Tasks - only show if there are unsorted tasks */}
      {unsortedTasks.length > 0 && (
        <div className="border border-border rounded-lg mb-3 overflow-hidden">
          <button onClick={() => setActiveExpanded(!activeExpanded)} className="flex items-center justify-between w-full px-4 py-3 text-left bg-muted/50 hover:bg-muted transition-colors">
            <span className="text-lg font-bold">Active Tasks <span className="text-muted-foreground font-normal text-sm ml-2 bg-muted px-2 py-0.5 rounded-full">{activeTasks.length}</span></span>
            {activeExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </button>
          {activeExpanded && (
            <div className="p-4">
              <InlineTaskInput artistId={artistId} teamId={teamId} campaigns={campaigns} />
              {unsortedTasks.map((t: any) => (
                <TaskRow key={t.id} task={t} artistId={artistId} campaigns={campaigns} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Campaign sections */}
      {campaigns.map((c: any) => {
        const cTasks = campaignTasks(c.id);
        const isExpanded = expandedCampaigns[c.id] ?? true;
        const isNewlyCreated = newCampaignId === c.id;
        return (
          <div key={c.id} className="border border-border rounded-lg mb-3 overflow-hidden">
            <div className="flex items-center justify-between w-full px-4 py-3 bg-muted/50 hover:bg-muted transition-colors">
              <button onClick={() => toggleCampaign(c.id)} className="flex items-center gap-2 flex-1 text-left">
                <span className="text-lg font-bold flex items-center gap-2">
                  <CampaignName campaign={c} artistId={artistId} />
                  <span className="text-muted-foreground font-normal text-sm bg-muted px-2 py-0.5 rounded-full">{cTasks.length}</span>
                </span>
              </button>
              <div className="flex items-center gap-1">
                <CampaignActions campaign={c} artistId={artistId} taskCount={cTasks.length} />
                {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </div>
            </div>
            {isExpanded && (
              <div className="p-4">
                <InlineTaskInput artistId={artistId} teamId={teamId} campaigns={campaigns} defaultCampaignId={c.id} autoFocus={isNewlyCreated} />
                {cTasks.map((t: any) => <TaskRow key={t.id} task={t} artistId={artistId} campaigns={campaigns} />)}
                {cTasks.length === 0 && !isNewlyCreated && <p className="text-sm text-muted-foreground py-2">No tasks yet.</p>}
              </div>
            )}
          </div>
        );
      })}

      {/* Completed */}
      {showCompleted && completedTasks.length > 0 && (
        <div className="border border-border rounded-lg mb-3 overflow-hidden">
          <div className="px-4 py-3 bg-muted/50"><span className="text-lg font-bold text-muted-foreground">Completed <span className="font-normal text-sm ml-2 bg-muted px-2 py-0.5 rounded-full">{completedTasks.length}</span></span></div>
          <div className="p-4">
            {completedTasks.map((t: any) => <TaskRow key={t.id} task={t} artistId={artistId} campaigns={campaigns} />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* Empty state */
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
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-muted/50">
            <input
              ref={campaignInputRef}
              autoFocus
              placeholder="Campaign name"
              className="flex-1 bg-transparent text-lg font-bold outline-none placeholder:text-muted-foreground/60"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) createCampaign.mutate((e.target as HTMLInputElement).value);
                if (e.key === "Escape") setMode("idle");
              }}
              onBlur={(e) => { if (!e.target.value.trim()) setMode("idle"); }}
            />
          </div>
          <div className="p-4">
            <p className="text-sm text-muted-foreground">Press Enter to create campaign</p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "task") {
    return (
      <div className="mt-4">
        <InlineTaskInput artistId={artistId} teamId={teamId} campaigns={[]} autoFocus />
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

function CampaignActions({ campaign, artistId, taskCount }: { campaign: any; artistId: string; taskCount: number }) {
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteCampaign = useMutation({
    mutationFn: async () => {
      // Delete all tasks in this campaign first
      const { error: tasksError } = await supabase.from("tasks").delete().eq("initiative_id", campaign.id);
      if (tasksError) throw tasksError;
      // Then delete the campaign
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
      // Mark all tasks in this campaign as completed
      const { error: tasksError } = await supabase
        .from("tasks")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("initiative_id", campaign.id)
        .eq("is_completed", false);
      if (tasksError) throw tasksError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", artistId] });
      toast.success("Campaign archived — all tasks marked complete");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent transition-colors" onClick={(e) => e.stopPropagation()}>
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

function CampaignName({ campaign, artistId }: { campaign: any; artistId: string }) {
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("initiatives").update({ name }).eq("id", campaign.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["initiatives", artistId] }),
  });

  return (
    <InlineField
      value={campaign.name}
      onSave={(v) => update.mutate(v)}
      className="text-lg font-bold"
    />
  );
}

function InlineTaskInput({ artistId, teamId, campaigns, defaultCampaignId, autoFocus }: {
  artistId: string; teamId: string; campaigns: any[]; defaultCampaignId?: string; autoFocus?: boolean;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(!!autoFocus);

  // Dropdown state
  const [showAtDropdown, setShowAtDropdown] = useState(false);
  const [showDollarDropdown, setShowDollarDropdown] = useState(false);
  const [atQuery, setAtQuery] = useState("");
  const [dollarAmount, setDollarAmount] = useState("");

  // Fetch team members for @ mentions
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members", teamId],
    queryFn: async () => {
      const { data: memberships, error } = await supabase
        .from("team_memberships")
        .select("user_id, role")
        .eq("team_id", teamId);
      if (error) throw error;
      if (!memberships || memberships.length === 0) return [];
      const userIds = memberships.map((m: any) => m.user_id);
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      if (pErr) throw pErr;
      return (profiles || []).map((p: any) => ({
        ...p,
        role: memberships.find((m: any) => m.user_id === p.id)?.role,
      }));
    },
    enabled: !!teamId,
  });

  // Fetch budgets for $ dropdown
  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets", artistId],
    queryFn: async () => {
      const { data, error } = await supabase.from("budgets").select("*").eq("artist_id", artistId).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Detect @ and $ triggers in input
  useEffect(() => {
    const atMatch = value.match(/@(\w*)$/);
    if (atMatch) {
      setShowAtDropdown(true);
      setAtQuery(atMatch[1].toLowerCase());
      setShowDollarDropdown(false);
    } else {
      setShowAtDropdown(false);
      setAtQuery("");
    }

    const dollarMatch = value.match(/\$(\d*(?:,\d{3})*(?:\.\d{0,2})?)$/);
    if (dollarMatch) {
      setShowDollarDropdown(true);
      setDollarAmount(dollarMatch[1]);
      setShowAtDropdown(false);
    } else {
      setShowDollarDropdown(false);
      setDollarAmount("");
    }
  }, [value]);

  const filteredMembers = useMemo(() => {
    if (!atQuery) return teamMembers;
    return teamMembers.filter((m: any) => m.full_name?.toLowerCase().includes(atQuery));
  }, [teamMembers, atQuery]);

  const selectMember = (member: any) => {
    const name = member.full_name || "Unknown";
    setValue(prev => prev.replace(/@\w*$/, `@${name} `));
    setShowAtDropdown(false);
    inputRef.current?.focus();
  };

  const selectBudget = (budget: any, amount: string) => {
    const amountStr = amount || "0";
    setValue(prev => prev.replace(/\$[\d,]*\.?\d*$/, `$${amountStr} `));
    setShowDollarDropdown(false);
    inputRef.current?.focus();
  };

  const addTask = useMutation({
    mutationFn: async (parsed: { title: string; description?: string; due_date?: string; expense_amount?: number; initiative_id?: string; assigned_to?: string }) => {
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
      setValue("");
      setDescription("");
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const parseAndSubmit = useCallback(() => {
    if (!value.trim()) return;
    let title = value.trim();
    let due_date: string | undefined;
    let expense_amount: number | undefined;
    let initiative_id: string | undefined;
    let assigned_to: string | undefined;

    // Parse @mention -> assigned_to
    const atMentionMatch = title.match(/@(\S+(?:\s\S+)?)/);
    if (atMentionMatch) {
      const mentionName = atMentionMatch[1].toLowerCase();
      const found = teamMembers.find((m: any) => m.full_name?.toLowerCase().startsWith(mentionName));
      if (found) assigned_to = found.id;
      title = title.replace(atMentionMatch[0], "").trim();
    }

    const dollarMatchParse = title.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (dollarMatchParse) { expense_amount = parseFloat(dollarMatchParse[1].replace(/,/g, "")); title = title.replace(dollarMatchParse[0], "").trim(); }

    const hashMatch = title.match(/#(\S+)/);
    if (hashMatch) {
      const found = campaigns.find((c: any) => c.name.toLowerCase().startsWith(hashMatch[1].toLowerCase()));
      if (found) initiative_id = found.id;
      title = title.replace(hashMatch[0], "").trim();
    }

    const dateMatch = title.match(/\bdue\s+(\S+)/i);
    if (dateMatch) {
      const ds = dateMatch[1].toLowerCase(); const today = new Date();
      if (ds === "today") due_date = today.toISOString().split("T")[0];
      else if (ds === "tomorrow") { today.setDate(today.getDate() + 1); due_date = today.toISOString().split("T")[0]; }
      else if (/^\d{4}-\d{2}-\d{2}$/.test(ds)) due_date = ds;
      else if (/^\d{1,2}\/\d{1,2}$/.test(ds)) { const [m, d] = ds.split("/").map(Number); due_date = `${today.getFullYear()}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }
      title = title.replace(dateMatch[0], "").trim();
    }

    addTask.mutate({ title, description: description.trim() || undefined, due_date, expense_amount, initiative_id, assigned_to });
  }, [value, description, campaigns, teamMembers, addTask]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showAtDropdown || showDollarDropdown) return; // let dropdown handle
    if (e.key === "Enter" && value.trim()) { e.preventDefault(); parseAndSubmit(); }
    if (e.key === "Escape") { setValue(""); setDescription(""); setIsActive(false); inputRef.current?.blur(); }
  };

  const handleCancel = () => {
    setValue("");
    setDescription("");
    setIsActive(false);
  };

  return (
    <div className="mb-4 relative">
      <div className={`rounded-lg border transition-colors ${isActive ? "border-border bg-card shadow-sm" : "border-dashed border-border hover:border-foreground/30"}`}>
        <div className="flex items-start gap-3 p-3">
          <Checkbox disabled className="opacity-30 mt-1" />
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setIsActive(true)}
              onKeyDown={handleKeyDown}
              placeholder="Task name (use @ to assign, # to pick campaign, $ for budget, 'due tomorrow')"
              className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/60"
            />

            {/* @ Team Member Dropdown */}
            {showAtDropdown && filteredMembers.length > 0 && (
              <div className="absolute left-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-50 min-w-[200px] py-1">
                {filteredMembers.map((m: any) => (
                  <button
                    key={m.id}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                    onMouseDown={(e) => { e.preventDefault(); selectMember(m); }}
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{m.full_name || "Unknown"}</span>
                  </button>
                ))}
              </div>
            )}

            {/* $ Budget Dropdown */}
            {showDollarDropdown && budgets.length > 0 && (
              <div className="absolute left-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-50 min-w-[220px] py-1">
                {budgets.map((b: any) => (
                  <button
                    key={b.id}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectBudget(b, dollarAmount || String(b.amount));
                    }}
                  >
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>${dollarAmount || b.amount.toLocaleString()} {b.label}</span>
                  </button>
                ))}
              </div>
            )}

            {isActive && (
              <>
                <input
                  ref={descRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Description"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 mt-2"
                />
                <div className="flex items-center gap-3 mt-3 text-muted-foreground">
                  <button className="hover:text-foreground transition-colors" title="Assign" onClick={() => { setValue(prev => prev + "@"); inputRef.current?.focus(); }}><User className="h-4 w-4" /></button>
                  <button className="hover:text-foreground transition-colors" title="Due date" onClick={() => { setValue(prev => prev + " due "); inputRef.current?.focus(); }}><Calendar className="h-4 w-4" /></button>
                  <button className="hover:text-foreground transition-colors" title="Cost" onClick={() => { setValue(prev => prev + "$"); inputRef.current?.focus(); }}><DollarSign className="h-4 w-4" /></button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {isActive && value && (
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
          <Button size="sm" onClick={parseAndSubmit} className="gap-1">✓ Save</Button>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, artistId, campaigns }: { task: any; artistId: string; campaigns: any[] }) {
  const queryClient = useQueryClient();

  const toggleTask = useMutation({
    mutationFn: async () => {
      const completed = !task.is_completed;
      const { error } = await supabase.from("tasks").update({ is_completed: completed, completed_at: completed ? new Date().toISOString() : null }).eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", artistId] }),
  });

  const updateTask = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", artistId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").delete().eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", artistId] }),
  });

  // Get assignee name
  const { data: assignee } = useQuery({
    queryKey: ["profile", task.assigned_to],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("full_name").eq("id", task.assigned_to).single();
      if (error) return null;
      return data;
    },
    enabled: !!task.assigned_to,
  });

  const campaign = campaigns.find((c: any) => c.id === task.initiative_id);

  return (
    <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 group border-b border-border last:border-b-0">
      <Checkbox checked={task.is_completed} onCheckedChange={() => toggleTask.mutate()} className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className={`text-base ${task.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
          <InlineField value={task.title} onSave={(v) => updateTask.mutate({ title: v })} className="text-base" />
        </div>
        {/* Metadata badges */}
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {assignee?.full_name && (
            <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
              <User className="h-3 w-3" /> {assignee.full_name}
            </span>
          )}
          {campaign && (
            <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
              # {campaign.name}
            </span>
          )}
          {task.due_date && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <InlineField value={task.due_date} onSave={(v) => updateTask.mutate({ due_date: v || null })} className="text-xs text-muted-foreground" />
            </span>
          )}
          {task.expense_amount != null && task.expense_amount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
              <DollarSign className="h-3 w-3" />
              <InlineField
                value={`${task.expense_amount.toLocaleString()}`}
                onSave={(v) => {
                  const num = parseFloat(v.replace(/[^0-9.]/g, ""));
                  updateTask.mutate({ expense_amount: isNaN(num) ? null : num });
                }}
                className="text-xs font-medium w-16 text-right"
              />
            </span>
          )}
        </div>
      </div>
      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-7 w-7 shrink-0" onClick={() => deleteTask.mutate()}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

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
      ref={inputRef}
      autoFocus
      placeholder="Campaign name, press Enter"
      className="bg-transparent border-b border-primary/40 outline-none text-sm py-1 w-48"
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) create.mutate((e.target as HTMLInputElement).value);
        if (e.key === "Escape") setShow(false);
      }}
      onBlur={() => setShow(false)}
    />
  );
}
