import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ChevronDown, ChevronUp, Hash } from "lucide-react";
import { toast } from "sonner";

interface WorkTabProps {
  artistId: string;
  teamId: string;
}

export function WorkTab({ artistId, teamId }: WorkTabProps) {
  const queryClient = useQueryClient();
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
  const [activeExpanded, setActiveExpanded] = useState(true);

  // Fetch campaigns (initiatives)
  const { data: campaigns = [] } = useQuery({
    queryKey: ["initiatives", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("initiatives")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const activeTasks = tasks.filter((t: any) => !t.is_completed);
  const completedTasks = tasks.filter((t: any) => t.is_completed);

  // Group tasks by campaign
  const unsortedTasks = activeTasks.filter((t: any) => !t.initiative_id);
  const campaignTasks = (campaignId: string) => activeTasks.filter((t: any) => t.initiative_id === campaignId);

  const toggleCampaign = (id: string) => {
    setExpandedCampaigns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded"
              />
              Show Completed
            </label>
          </span>
        </div>
        <NewCampaignButton artistId={artistId} />
      </div>

      {/* Active Tasks section */}
      <div className="border border-border rounded-lg mb-2">
        <button
          onClick={() => setActiveExpanded(!activeExpanded)}
          className="flex items-center justify-between w-full p-3 text-left hover:bg-accent/50 rounded-lg"
        >
          <span className="font-semibold">Active Tasks <span className="text-muted-foreground font-normal text-sm ml-1">{activeTasks.length}</span></span>
          {activeExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {activeExpanded && (
          <div className="px-3 pb-3">
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
        const isExpanded = expandedCampaigns[c.id] ?? false;
        return (
          <div key={c.id} className="border border-border rounded-lg mb-2">
            <button
              onClick={() => toggleCampaign(c.id)}
              className="flex items-center justify-between w-full p-3 text-left hover:bg-accent/50 rounded-lg"
            >
              <span className="font-semibold flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                {c.name}
                <span className="text-muted-foreground font-normal text-sm">{cTasks.length}</span>
              </span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {isExpanded && (
              <div className="px-3 pb-3">
                <InlineTaskInput artistId={artistId} teamId={teamId} campaigns={campaigns} defaultCampaignId={c.id} />
                {cTasks.map((t: any) => (
                  <TaskRow key={t.id} task={t} artistId={artistId} />
                ))}
                {cTasks.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">No tasks in this campaign yet.</p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Completed */}
      {showCompleted && completedTasks.length > 0 && (
        <div className="border border-border rounded-lg mb-2">
          <div className="p-3">
            <span className="font-semibold text-muted-foreground">Completed <span className="font-normal text-sm ml-1">{completedTasks.length}</span></span>
          </div>
          <div className="px-3 pb-3">
            {completedTasks.map((t: any) => (
              <TaskRow key={t.id} task={t} artistId={artistId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InlineTaskInput({ artistId, teamId, campaigns, defaultCampaignId }: {
  artistId: string;
  teamId: string;
  campaigns: any[];
  defaultCampaignId?: string;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [isActive, setIsActive] = useState(false);

  const addTask = useMutation({
    mutationFn: async (parsed: { title: string; due_date?: string; expense_amount?: number; initiative_id?: string }) => {
      const { error } = await supabase.from("tasks").insert({
        artist_id: artistId,
        team_id: teamId,
        title: parsed.title,
        due_date: parsed.due_date || null,
        expense_amount: parsed.expense_amount || null,
        initiative_id: parsed.initiative_id || defaultCampaignId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", artistId] });
      setValue("");
      // Keep input focused for chaining
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

    // Parse $amount
    const dollarMatch = title.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (dollarMatch) {
      expense_amount = parseFloat(dollarMatch[1].replace(/,/g, ""));
      title = title.replace(dollarMatch[0], "").trim();
    }

    // Parse #campaign
    const hashMatch = title.match(/#(\S+)/);
    if (hashMatch) {
      const campaignName = hashMatch[1].toLowerCase();
      const found = campaigns.find((c: any) => c.name.toLowerCase().startsWith(campaignName));
      if (found) {
        initiative_id = found.id;
      }
      title = title.replace(hashMatch[0], "").trim();
    }

    // Parse dates like "due tomorrow", "due 3/15", "due 2026-03-15"
    const dateMatch = title.match(/\bdue\s+(\S+)/i);
    if (dateMatch) {
      const dateStr = dateMatch[1].toLowerCase();
      const today = new Date();
      if (dateStr === "today") {
        due_date = today.toISOString().split("T")[0];
      } else if (dateStr === "tomorrow") {
        today.setDate(today.getDate() + 1);
        due_date = today.toISOString().split("T")[0];
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        due_date = dateStr;
      } else if (/^\d{1,2}\/\d{1,2}$/.test(dateStr)) {
        const [m, d] = dateStr.split("/").map(Number);
        due_date = `${today.getFullYear()}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
      title = title.replace(dateMatch[0], "").trim();
    }

    addTask.mutate({ title, due_date, expense_amount, initiative_id });
  }, [value, campaigns, addTask]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim()) {
      e.preventDefault();
      parseAndSubmit();
    }
    if (e.key === "Escape") {
      setValue("");
      setIsActive(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 p-2 rounded border border-dashed border-border hover:border-foreground/30 transition-colors">
        <Checkbox disabled className="opacity-30" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsActive(true)}
          onBlur={() => { if (!value) setIsActive(false); }}
          onKeyDown={handleKeyDown}
          placeholder="Type a task and press Enter (use $ for cost, # for campaign, 'due tomorrow')"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>
      {isActive && value && (
        <div className="flex gap-2 mt-1 text-xs text-muted-foreground pl-8">
          <span>Press <kbd className="px-1 py-0.5 rounded bg-muted text-foreground">Enter</kbd> to save</span>
          <span>·</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted text-foreground">$</kbd> cost</span>
          <span>·</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted text-foreground">#</kbd> campaign</span>
          <span>·</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted text-foreground">due</kbd> date</span>
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
      const { error } = await supabase.from("tasks").update({
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      }).eq("id", task.id);
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

  return (
    <div className="flex items-center gap-3 p-2 rounded hover:bg-accent/50 group">
      <Checkbox
        checked={task.is_completed}
        onCheckedChange={() => toggleTask.mutate()}
      />
      <span className={`flex-1 text-sm ${task.is_completed ? "line-through text-muted-foreground" : ""}`}>
        {task.title}
      </span>
      {task.expense_amount != null && task.expense_amount > 0 && (
        <span className="text-xs font-medium text-primary">${task.expense_amount.toLocaleString()}</span>
      )}
      {task.due_date && (
        <span className="text-xs text-muted-foreground">{task.due_date}</span>
      )}
      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => deleteTask.mutate()}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function NewCampaignButton({ artistId }: { artistId: string }) {
  const queryClient = useQueryClient();
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("initiatives").insert({
        artist_id: artistId,
        name: name.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiatives", artistId] });
      setName("");
      setShow(false);
      toast.success("Campaign created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!show) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setShow(true)}>
        <Plus className="h-4 w-4 mr-1" /> New Campaign
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Campaign name"
        className="h-8 w-48"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) create.mutate();
          if (e.key === "Escape") { setShow(false); setName(""); }
        }}
      />
      <Button size="sm" className="h-8" onClick={() => create.mutate()} disabled={!name.trim()}>Create</Button>
      <Button variant="ghost" size="sm" className="h-8" onClick={() => { setShow(false); setName(""); }}>Cancel</Button>
    </div>
  );
}
