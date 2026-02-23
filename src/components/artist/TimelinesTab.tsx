import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, CalendarIcon, Share2, Check, Copy, List, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { InlineField } from "@/components/ui/InlineField";
import { format, parse, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TimelinesTabProps {
  artistId: string;
}

export function TimelinesTab({ artistId }: TimelinesTabProps) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "chart">("list");

  const { data: artist } = useQuery({
    queryKey: ["artist", artistId],
    queryFn: async () => {
      const { data, error } = await supabase.from("artists").select("*").eq("id", artistId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["artist_milestones", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_milestones")
        .select("*")
        .eq("artist_id", artistId)
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addMilestone = useMutation({
    mutationFn: async ({ title, date }: { title: string; date: string }) => {
      const { error } = await supabase.from("artist_milestones").insert({
        artist_id: artistId,
        title,
        date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist_milestones", artistId] });
      toast.success("Date added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMilestone = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const { error } = await supabase.from("artist_milestones").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist_milestones", artistId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMilestone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("artist_milestones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist_milestones", artistId] }),
  });

  const isEmpty = milestones.length === 0;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        {/* View toggle */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
          <button
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              view === "list" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button
            onClick={() => setView("chart")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              view === "chart" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Calendar
          </button>
        </div>
        <ShareTimelineButton artist={artist} />
      </div>

      {/* Inline add */}
      <InlineMilestoneInput onAdd={(title, date) => addMilestone.mutate({ title, date })} />

      {isEmpty ? (
        <p className="text-sm text-muted-foreground mt-4">No key dates yet. Add your first one above.</p>
      ) : view === "list" ? (
        <div className="mt-4 space-y-0">
          {milestones.map((m: any) => (
            <MilestoneRow
              key={m.id}
              milestone={m}
              onUpdate={(patch) => updateMilestone.mutate({ id: m.id, patch })}
              onDelete={() => deleteMilestone.mutate(m.id)}
            />
          ))}
        </div>
      ) : (
        <CalendarView milestones={milestones} />
      )}
    </div>
  );
}

/* ── Calendar View ── */
function CalendarView({ milestones }: { milestones: any[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  // Build array of days
  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  // Map milestones by date string
  const milestonesByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    milestones.forEach((m) => {
      const key = m.date; // yyyy-MM-dd
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [milestones]);

  const colors = [
    "bg-primary", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5",
  ];

  // Assign consistent colors per milestone
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    milestones.forEach((m, i) => {
      map[m.id] = colors[i % colors.length];
    });
    return map;
  }, [milestones]);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="mt-4 rounded-lg border border-border overflow-hidden">
      {/* Month navigation header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold">{format(currentMonth, "MMMM yyyy")}</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekDays.map((wd) => (
          <div key={wd} className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-2">
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const key = format(day, "yyyy-MM-dd");
          const events = milestonesByDate[key] || [];
          const inMonth = isSameMonth(day, currentMonth);
          const todayCell = isToday(day);

          return (
            <div
              key={idx}
              className={cn(
                "min-h-[80px] sm:min-h-[100px] border-b border-r border-border p-1 transition-colors",
                !inMonth && "bg-muted/20",
                todayCell && "bg-primary/5",
                idx % 7 === 0 && "border-l-0",
              )}
            >
              <div className={cn(
                "text-xs font-medium mb-1 flex items-center justify-center w-6 h-6 rounded-full",
                todayCell && "bg-primary text-primary-foreground",
                !inMonth && "text-muted-foreground/40",
                inMonth && !todayCell && "text-foreground",
              )}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {events.slice(0, 3).map((ev: any) => (
                  <Tooltip key={ev.id}>
                    <TooltipTrigger asChild>
                      <div className={cn(
                        "text-[10px] sm:text-xs font-medium truncate rounded px-1 py-0.5 text-white cursor-default",
                        colorMap[ev.id] || "bg-primary",
                      )}>
                        {ev.title}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs max-w-[200px]">
                      <p className="font-medium">{ev.title}</p>
                      {ev.description && <p className="text-muted-foreground mt-0.5">{ev.description}</p>}
                      <p className="text-muted-foreground">{format(parse(ev.date, "yyyy-MM-dd", new Date()), "EEEE, MMMM d, yyyy")}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {events.length > 3 && (
                  <div className="text-[9px] text-muted-foreground px-1">+{events.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Inline Milestone Input ── */
function InlineMilestoneInput({ onAdd }: { onAdd: (title: string, date: string) => void }) {
  const [isActive, setIsActive] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const titleRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!title.trim() || !date) return;
    onAdd(title.trim(), format(date, "yyyy-MM-dd"));
    setTitle("");
    setDate(undefined);
    setTimeout(() => titleRef.current?.focus(), 50);
  };

  if (!isActive) {
    return (
      <button
        onClick={() => { setIsActive(true); setTimeout(() => titleRef.current?.focus(), 50); }}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 w-full"
      >
        <Plus className="h-4 w-4" /> Add a key date...
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-9 w-[160px] justify-start text-left font-normal text-sm bg-transparent border-border shrink-0",
              !date && "text-muted-foreground/50"
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {date ? format(date, "MMM d, yyyy") : "Pick date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-popover border border-border z-50" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      <input
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What's happening on this date?"
        className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); submit(); }
          if (e.key === "Escape") { setTitle(""); setDate(undefined); setIsActive(false); }
        }}
      />
    </div>
  );
}

/* ── Milestone Row ── */
function MilestoneRow({
  milestone,
  onUpdate,
  onDelete,
}: {
  milestone: any;
  onUpdate: (patch: Record<string, any>) => void;
  onDelete: () => void;
}) {
  const date = parse(milestone.date, "yyyy-MM-dd", new Date());

  return (
    <div className="flex items-start gap-0 group border-b border-border last:border-b-0">
      {/* Date column */}
      <div className="w-[140px] shrink-0 py-4 pr-4 border-r border-border">
        <Popover>
          <PopoverTrigger asChild>
            <button className="text-left hover:text-primary transition-colors">
              <div className="font-semibold text-sm">{format(date, "MMMM d, yyyy")}</div>
              <div className="text-xs text-muted-foreground">{format(date, "EEEE")}</div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-popover border border-border z-50" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && onUpdate({ date: format(d, "yyyy-MM-dd") })}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Content column */}
      <div className="flex-1 py-4 pl-4 min-w-0">
        <InlineField
          value={milestone.title}
          onSave={(v) => onUpdate({ title: v })}
          className="font-semibold text-sm"
        />
        <InlineField
          value={milestone.description ?? ""}
          placeholder="Add description"
          onSave={(v) => onUpdate({ description: v || null })}
          className="text-sm text-muted-foreground mt-0.5"
        />
      </div>

      {/* Delete */}
      <div className="py-4 pl-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 h-7 w-7"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ── Share Timeline Button ── */
function ShareTimelineButton({ artist }: { artist: any }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const isPublic = artist?.timeline_is_public ?? false;
  const token = artist?.timeline_public_token;

  const toggleShare = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("artists")
        .update({ timeline_is_public: !isPublic } as any)
        .eq("id", artist.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist", artist.id] });
      if (!isPublic && token) {
        const url = `${window.location.origin}/shared/timeline/${token}`;
        navigator.clipboard.writeText(url);
        toast.success("Link copied! Sharing enabled.");
      } else {
        toast.success("Sharing disabled");
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const copyLink = () => {
    if (!token) return;
    const url = `${window.location.origin}/shared/timeline/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!artist) return null;

  return (
    <div className="flex items-center gap-1">
      {isPublic && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyLink}>
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
        </Button>
      )}
      <Button
        variant={isPublic ? "secondary" : "ghost"}
        size="sm"
        className="gap-1.5"
        onClick={() => toggleShare.mutate()}
      >
        <Share2 className="h-4 w-4" />
        {isPublic ? "Sharing On" : "Share Timeline"}
      </Button>
    </div>
  );
}
