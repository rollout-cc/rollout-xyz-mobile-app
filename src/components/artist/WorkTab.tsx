import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ChevronDown, ChevronUp, Hash, FolderPlus, ListPlus, Calendar, DollarSign, User } from "lucide-react";
import { toast } from "sonner";
import { InlineField } from "@/components/ui/InlineField";

interface WorkTabProps {
  artistId: string;
  teamId: string;
}

export function WorkTab({ artistId, teamId }: WorkTabProps) {
  const queryClient = useQueryClient();
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
  const [activeExpanded, setActiveExpanded] = useState(true);

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

  const isEmpty = campaigns.length === 0 && tasks.length === 0;

  if (isEmpty) {
    return <EmptyWorkState artistId={artistId} teamId={teamId} />;
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
          <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} className="rounded" />
          Show Completed
        </label>
        <NewCampaignInline artistId={artistId} />
      </div>

      {/* Active Tasks */}
      <div className="border border-border rounded-lg mb-3 overflow-hidden">
        <button onClick={() => setActiveExpanded(!activeExpanded)} className="flex items-center justify-between w-full px-4 py-3 text-left bg-muted/50 hover:bg-muted transition-colors">
          <span className="text-lg font-bold">Active Tasks <span className="text-muted-foreground font-normal text-sm ml-2 bg-muted px-2 py-0.5 rounded-full">{activeTasks.length}</span></span>
          {activeExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
        </button>
        {activeExpanded && (
          <div className="p-4">
            <InlineTaskInput artistId={artistId} teamId={teamId} campaigns={campaigns} />
            {unsortedTasks.map((t: any) => (
              <TaskRow key={t.id} task={t} artistId={artistId} />
            ))}
          </div>
        )}
      </div>

      {/* Campaign sections */}
      {campaigns.map((c: any) => {
        const cTasks = campaignTasks(c.id);
        const isExpanded = expandedCampaigns[c.id] ?? true;
        return (
          <div key={c.id} className="border border-border rounded-lg mb-3 overflow-hidden">
            <button onClick={() => toggleCampaign(c.id)} className="flex items-center justify-between w-full px-4 py-3 text-left bg-muted/50 hover:bg-muted transition-colors">
              <span className="text-lg font-bold flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <CampaignName campaign={c} artistId={artistId} />
                <span className="text-muted-foreground font-normal text-sm bg-muted px-2 py-0.5 rounded-full">{cTasks.length}</span>
              </span>
              {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
            </button>
            {isExpanded && (
              <div className="p-4">
                <InlineTaskInput artistId={artistId} teamId={teamId} campaigns={campaigns} defaultCampaignId={c.id} />
                {cTasks.map((t: any) => <TaskRow key={t.id} task={t} artistId={artistId} />)}
                {cTasks.length === 0 && <p className="text-sm text-muted-foreground py-2">No tasks yet.</p>}
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
            {completedTasks.map((t: any) => <TaskRow key={t.id} task={t} artistId={artistId} />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* Empty state with prominent New Campaign / New Task buttons */
function EmptyWorkState({ artistId, teamId }: { artistId: string; teamId: string }) {
  const queryClient = useQueryClient();
  const campaignInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"idle" | "campaign" | "task">("idle");

  const createCampaign = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("initiatives").insert({ artist_id: artistId, name: name.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiatives", artistId] });
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
            <Hash className="h-4 w-4 text-muted-foreground" />
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

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const addTask = useMutation({
    mutationFn: async (parsed: { title: string; description?: string; due_date?: string; expense_amount?: number; initiative_id?: string }) => {
      const { error } = await supabase.from("tasks").insert({
        artist_id: artistId, team_id: teamId, title: parsed.title,
        description: parsed.description || null,
        due_date: parsed.due_date || null, expense_amount: parsed.expense_amount || null,
        initiative_id: parsed.initiative_id || defaultCampaignId || null,
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

    const dollarMatch = title.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (dollarMatch) { expense_amount = parseFloat(dollarMatch[1].replace(/,/g, "")); title = title.replace(dollarMatch[0], "").trim(); }

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

    addTask.mutate({ title, description: description.trim() || undefined, due_date, expense_amount, initiative_id });
  }, [value, description, campaigns, addTask]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim()) { e.preventDefault(); parseAndSubmit(); }
    if (e.key === "Escape") { setValue(""); setDescription(""); setIsActive(false); inputRef.current?.blur(); }
  };

  const handleCancel = () => {
    setValue("");
    setDescription("");
    setIsActive(false);
  };

  return (
    <div className="mb-4">
      <div className={`rounded-lg border transition-colors ${isActive ? "border-border bg-card shadow-sm" : "border-dashed border-border hover:border-foreground/30"}`}>
        <div className="flex items-start gap-3 p-3">
          <Checkbox disabled className="opacity-30 mt-1" />
          <div className="flex-1">
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setIsActive(true)}
              onKeyDown={handleKeyDown}
              placeholder="Task name (use @ to assign, # to pick campaign, $ for budget, 'due tomorrow')"
              className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/60"
            />
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
                  <button className="hover:text-foreground transition-colors" title="Assign"><User className="h-4 w-4" /></button>
                  <button className="hover:text-foreground transition-colors" title="Due date"><Calendar className="h-4 w-4" /></button>
                  <button className="hover:text-foreground transition-colors" title="Campaign"><Hash className="h-4 w-4" /></button>
                  <button className="hover:text-foreground transition-colors" title="Cost"><DollarSign className="h-4 w-4" /></button>
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

function TaskRow({ task, artistId }: { task: any; artistId: string }) {
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

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 group border-b border-border last:border-b-0">
      <Checkbox checked={task.is_completed} onCheckedChange={() => toggleTask.mutate()} />
      <div className={`flex-1 text-base ${task.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
        <InlineField value={task.title} onSave={(v) => updateTask.mutate({ title: v })} className="text-base" />
      </div>
      {task.due_date && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <InlineField value={task.due_date} onSave={(v) => updateTask.mutate({ due_date: v || null })} className="text-xs text-muted-foreground" />
        </span>
      )}
      {task.expense_amount != null && task.expense_amount > 0 && (
        <span className="flex items-center gap-1 text-xs font-medium text-foreground">
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
      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => deleteTask.mutate()}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function NewCampaignInline({ artistId }: { artistId: string }) {
  const queryClient = useQueryClient();
  const [show, setShow] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const create = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("initiatives").insert({ artist_id: artistId, name: name.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiatives", artistId] });
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
