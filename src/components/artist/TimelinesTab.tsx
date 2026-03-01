import { useState, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Trash2, CalendarIcon, Share2, Check, Copy, List, CalendarDays,
  ChevronLeft, ChevronRight, FolderOpen, Link2, MoreVertical,
  Plus, Archive, Trash, MoreHorizontal, FolderPlus, ListPlus,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { InlineField } from "@/components/ui/InlineField";
import { CollapsibleSection, InlineAddTrigger } from "@/components/ui/CollapsibleSection";
import { ItemCardRead, ItemCardEdit, MetaBadge } from "@/components/ui/ItemCard";
import { ItemEditor, DescriptionEditor } from "@/components/ui/ItemEditor";
import { DatePicker } from "@/components/ui/ItemPickers";
import {
  format, parse, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isToday,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useAuth } from "@/contexts/AuthContext";

interface TimelinesTabProps {
  artistId: string;
}

export function TimelinesTab({ artistId }: TimelinesTabProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [view, setView] = useState<"list" | "chart">("list");
  const [showArchived, setShowArchived] = useState(false);
  const [expandedTimelines, setExpandedTimelines] = useState<Record<string, boolean>>({});
  const [unsortedExpanded, setUnsortedExpanded] = useState(true);
  const [newTimelineId, setNewTimelineId] = useState<string | null>(null);

  const { data: artist } = useQuery({
    queryKey: ["artist", artistId],
    queryFn: async () => {
      const { data, error } = await supabase.from("artists").select("*").eq("id", artistId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: timelines = [] } = useQuery({
    queryKey: ["artist_timelines", artistId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("artist_timelines").select("*").eq("artist_id", artistId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["artist_milestones", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_milestones").select("*").eq("artist_id", artistId).order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: folders = [] } = useQuery({
    queryKey: ["artist_link_folders", artistId],
    queryFn: async () => {
      const { data, error } = await supabase.from("artist_link_folders").select("id, name").eq("artist_id", artistId);
      if (error) throw error;
      return data;
    },
  });

  const { data: links = [] } = useQuery({
    queryKey: ["artist_links_for_milestones", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_links").select("id, title, url, folder_id")
        .or(`artist_id.eq.${artistId},folder_id.not.is.null`);
      if (error) throw error;
      return data;
    },
  });

  const { data: milestoneAttachments = { folders: [], links: [] } } = useQuery({
    queryKey: ["milestone_attachments", artistId],
    queryFn: async () => {
      const milestoneIds = milestones.map((m: any) => m.id);
      if (milestoneIds.length === 0) return { folders: [], links: [] };
      const [foldersRes, linksRes] = await Promise.all([
        supabase.from("milestone_folders" as any).select("*").in("milestone_id", milestoneIds),
        supabase.from("milestone_links" as any).select("*").in("milestone_id", milestoneIds),
      ]);
      return { folders: (foldersRes.data || []) as any[], links: (linksRes.data || []) as any[] };
    },
    enabled: milestones.length > 0,
  });

  /* ── Mutations ── */
  const addMilestone = useMutation({
    mutationFn: async ({ title, date, timelineId }: { title: string; date: string; timelineId?: string }) => {
      const { error } = await supabase.from("artist_milestones").insert({
        artist_id: artistId, title, date,
        ...(timelineId ? { timeline_id: timelineId } : {}),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist_milestones", artistId] });
      toast.success("Milestone added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMilestone = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const { error } = await supabase.from("artist_milestones").update(patch as any).eq("id", id);
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

  const attachFolder = useMutation({
    mutationFn: async ({ milestoneId, folderId }: { milestoneId: string; folderId: string }) => {
      const { error } = await (supabase as any).from("milestone_folders").insert({ milestone_id: milestoneId, folder_id: folderId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["milestone_attachments", artistId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const detachFolder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("milestone_folders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["milestone_attachments", artistId] }),
  });

  const attachLink = useMutation({
    mutationFn: async ({ milestoneId, linkId }: { milestoneId: string; linkId: string }) => {
      const { error } = await (supabase as any).from("milestone_links").insert({ milestone_id: milestoneId, link_id: linkId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["milestone_attachments", artistId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const detachLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("milestone_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["milestone_attachments", artistId] }),
  });

  /* ── Grouping ── */
  const activeTimelines = timelines.filter((t: any) => !t.is_archived);
  const archivedTimelines = timelines.filter((t: any) => t.is_archived);
  const displayedTimelines = showArchived ? archivedTimelines : activeTimelines;
  const unsortedMilestones = milestones.filter((m: any) => !(m as any).timeline_id);
  const timelineMilestones = (timelineId: string) => milestones.filter((m: any) => (m as any).timeline_id === timelineId);

  const toggleTimeline = (id: string) => {
    setExpandedTimelines(prev => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  const isEmpty = timelines.length === 0 && milestones.length === 0;

  const milestoneRowProps = (m: any) => {
    const mFolders = milestoneAttachments.folders
      .filter((mf: any) => mf.milestone_id === m.id)
      .map((mf: any) => ({ ...mf, folder: folders.find((f) => f.id === mf.folder_id) }))
      .filter((mf: any) => mf.folder);
    const mLinks = milestoneAttachments.links
      .filter((ml: any) => ml.milestone_id === m.id)
      .map((ml: any) => ({ ...ml, link: links.find((l) => l.id === ml.link_id) }))
      .filter((ml: any) => ml.link);
    return {
      milestone: m,
      attachedFolders: mFolders,
      attachedLinks: mLinks,
      allFolders: folders,
      allLinks: links,
      allTimelines: activeTimelines,
      onUpdate: (patch: Record<string, any>) => updateMilestone.mutate({ id: m.id, patch }),
      onDelete: () => deleteMilestone.mutate(m.id),
      onAttachFolder: (folderId: string) => attachFolder.mutate({ milestoneId: m.id, folderId }),
      onDetachFolder: (id: string) => detachFolder.mutate(id),
      onAttachLink: (linkId: string) => attachLink.mutate({ milestoneId: m.id, linkId }),
      onDetachLink: (id: string) => detachLink.mutate(id),
    };
  };

  if (isEmpty) {
    return (
      <EmptyTimelinesState
        artistId={artistId}
        artist={artist}
        onTimelineCreated={setNewTimelineId}
        onMilestoneAdd={(title, date) => addMilestone.mutate({ title, date })}
      />
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-xs font-medium">
            <button
              onClick={() => setView("list")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-colors",
                view === "list" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              List
            </button>
            <button
              onClick={() => setView("chart")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-colors",
                view === "chart" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Calendar
            </button>
          </div>
          {archivedTimelines.length > 0 && (
            <label className="flex items-center gap-2 cursor-pointer caption text-muted-foreground hover:text-foreground transition-colors">
              <Checkbox checked={showArchived} onCheckedChange={(v) => setShowArchived(!!v)} />
              Archived ({archivedTimelines.length})
            </label>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ShareTimelineButton artist={artist} />
        </div>
      </div>

      {view === "chart" ? (
        <CalendarView milestones={milestones} />
      ) : (
        <>
          {/* Unsorted milestones */}
          {unsortedMilestones.length > 0 && (
            <CollapsibleSection
              title="Unsorted"
              count={unsortedMilestones.length}
              open={unsortedExpanded}
              onToggle={() => setUnsortedExpanded(!unsortedExpanded)}
            >
              <InlineMilestoneInput onAdd={(title, date) => addMilestone.mutate({ title, date })} />
              <div className="divide-y divide-border/30">
                {unsortedMilestones.map((m: any) => (
                  <MilestoneRow key={m.id} {...milestoneRowProps(m)} />
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Timeline sections */}
          {displayedTimelines.map((t: any) => {
            const tMilestones = timelineMilestones(t.id);
            const isExpanded = expandedTimelines[t.id] ?? true;
            return (
              <CollapsibleSection
                key={t.id}
                title={t.name}
                count={tMilestones.length}
                open={isExpanded}
                onToggle={() => toggleTimeline(t.id)}
                titleSlot={<TimelineName timeline={t} artistId={artistId} />}
                actions={<TimelineActions timeline={t} artistId={artistId} milestoneCount={tMilestones.length} />}
              >
                <InlineMilestoneInput onAdd={(title, date) => addMilestone.mutate({ title, date, timelineId: t.id })} />
                <div className="divide-y divide-border/30">
                  {tMilestones.map((m: any) => (
                    <MilestoneRow key={m.id} {...milestoneRowProps(m)} />
                  ))}
                </div>
                {tMilestones.length === 0 && <p className="caption text-muted-foreground py-3 pl-2">No milestones yet.</p>}
              </CollapsibleSection>
            );
          })}

          {/* If no unsorted and no timelines, still show add trigger */}
          {unsortedMilestones.length === 0 && displayedTimelines.length === 0 && (
            <InlineMilestoneInput onAdd={(title, date) => addMilestone.mutate({ title, date })} />
          )}

          {/* Inline new timeline creation */}
          <NewTimelineInline artistId={artistId} onCreated={setNewTimelineId} />
        </>
      )}
    </div>
  );
}

/* ── Empty State ── */
function EmptyTimelinesState({
  artistId, artist, onTimelineCreated, onMilestoneAdd,
}: {
  artistId: string; artist: any;
  onTimelineCreated: (id: string) => void;
  onMilestoneAdd: (title: string, date: string) => void;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"idle" | "timeline" | "milestone">("idle");

  const createTimeline = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await (supabase as any)
        .from("artist_timelines").insert({ artist_id: artistId, name: name.trim() }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["artist_timelines", artistId] });
      onTimelineCreated(data.id);
      setMode("idle");
      toast.success("Timeline created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (mode === "timeline") {
    return (
      <div className="mt-4">
        <div className="bg-muted/30 rounded-lg px-4 py-3">
          <input
            ref={inputRef} autoFocus placeholder="Timeline name"
            className="flex-1 bg-transparent text-base font-bold outline-none placeholder:text-muted-foreground/60 w-full"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) createTimeline.mutate((e.target as HTMLInputElement).value);
              if (e.key === "Escape") setMode("idle");
            }}
            onBlur={(e) => { if (!e.target.value.trim()) setMode("idle"); }}
          />
          <p className="text-xs text-muted-foreground mt-2">Press Enter to create timeline</p>
        </div>
      </div>
    );
  }

  if (mode === "milestone") {
    return (
      <div className="mt-4">
        <InlineMilestoneInput onAdd={(title, date) => { onMilestoneAdd(title, date); setMode("idle"); }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
      <p className="text-muted-foreground text-lg">No timelines or milestones yet</p>
      <div className="flex items-center gap-3">
        <Button variant="default" size="lg" className="gap-2 text-base" onClick={() => { setMode("timeline"); setTimeout(() => inputRef.current?.focus(), 50); }}>
          <FolderPlus className="h-5 w-5" /> New Timeline
        </Button>
        <Button variant="outline" size="lg" className="gap-2 text-base" onClick={() => setMode("milestone")}>
          <ListPlus className="h-5 w-5" /> New Milestone
        </Button>
      </div>
      <div className="mt-2">
        <ShareTimelineButton artist={artist} />
      </div>
    </div>
  );
}

/* ── Calendar View ── */
function CalendarView({ milestones }: { milestones: any[] }) {
  const initialMonth = useMemo(() => {
    if (milestones.length > 0) {
      const today = new Date();
      const sorted = [...milestones].sort((a, b) => {
        const da = Math.abs(new Date(a.date).getTime() - today.getTime());
        const db = Math.abs(new Date(b.date).getTime() - today.getTime());
        return da - db;
      });
      return startOfMonth(new Date(sorted[0].date + "T12:00:00"));
    }
    return new Date();
  }, [milestones]);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) { days.push(d); d = addDays(d, 1); }

  const milestonesByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    milestones.forEach((m) => {
      const normalized = format(new Date(m.date + "T12:00:00"), "yyyy-MM-dd");
      if (!map[normalized]) map[normalized] = [];
      map[normalized].push(m);
    });
    return map;
  }, [milestones]);

  const colors = ["bg-primary", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    milestones.forEach((m, i) => { map[m.id] = colors[i % colors.length]; });
    return map;
  }, [milestones]);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="mt-4 rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
        <h3 className="text-sm font-semibold">{format(currentMonth, "MMMM yyyy")}</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <div className="grid grid-cols-7 border-b border-border">
        {weekDays.map((wd) => (
          <div key={wd} className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-2">{wd}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const key = format(day, "yyyy-MM-dd");
          const events = milestonesByDate[key] || [];
          const inMonth = isSameMonth(day, currentMonth);
          const todayCell = isToday(day);
          return (
            <div key={idx} className={cn("min-h-[80px] sm:min-h-[100px] border-b border-r border-border p-1 transition-colors", !inMonth && "bg-muted/20", todayCell && "bg-primary/5")}>
              <div className={cn("text-xs font-medium mb-1 flex items-center justify-center w-6 h-6 rounded-full", todayCell && "bg-primary text-primary-foreground", !inMonth && "text-muted-foreground/40", inMonth && !todayCell && "text-foreground")}>{format(day, "d")}</div>
              <div className="space-y-0.5">
                {events.slice(0, 3).map((ev: any) => (
                  <Tooltip key={ev.id}>
                    <TooltipTrigger asChild>
                      <div className={cn("text-[10px] sm:text-xs font-medium truncate rounded px-1 py-0.5 text-white cursor-default", colorMap[ev.id] || "bg-primary")}>{ev.title}</div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs max-w-[200px]">
                      <p className="font-medium">{ev.title}</p>
                      {ev.description && <p className="text-muted-foreground mt-0.5">{ev.description}</p>}
                      <p className="text-muted-foreground">{format(parse(ev.date, "yyyy-MM-dd", new Date()), "EEEE, MMMM d, yyyy")}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {events.length > 3 && <div className="text-[9px] text-muted-foreground px-1">+{events.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Parse natural date from text ── */
function parseDateFromText(text: string): { title: string; date: Date | null } {
  const months: Record<string, number> = {
    january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
    april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
    august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
    november: 10, nov: 10, december: 11, dec: 11,
  };

  // Match patterns like "august 15", "jan 3", "December 25", "oct 1st"
  const regex = /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;
  const match = text.match(regex);
  if (match) {
    const monthIdx = months[match[1].toLowerCase()];
    const day = parseInt(match[2], 10);
    if (monthIdx !== undefined && day >= 1 && day <= 31) {
      const now = new Date();
      let year = now.getFullYear();
      const candidate = new Date(year, monthIdx, day);
      // If the date is more than 2 months in the past, assume next year
      if (candidate.getTime() < now.getTime() - 60 * 24 * 60 * 60 * 1000) {
        year += 1;
      }
      return { title: text, date: new Date(year, monthIdx, day) };
    }
  }

  // Match "due today" / "due tomorrow"
  const dueMatch = text.match(/\bdue\s+(today|tomorrow)\b/i);
  if (dueMatch) {
    const d = new Date();
    if (dueMatch[1].toLowerCase() === "tomorrow") d.setDate(d.getDate() + 1);
    const cleaned = text.replace(dueMatch[0], "").trim();
    return { title: cleaned || text, date: d };
  }

  return { title: text, date: null };
}

/* ── Inline Milestone Input ── */
function InlineMilestoneInput({ onAdd }: { onAdd: (title: string, date: string) => void }) {
  const [isActive, setIsActive] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);

  // Auto-detect date from title
  const parsedDate = useMemo(() => parseDateFromText(title), [title]);
  const effectiveDate = date || parsedDate.date || undefined;

  const submit = () => {
    if (!title.trim() || !effectiveDate) return;
    onAdd(title.trim(), format(effectiveDate, "yyyy-MM-dd"));
    setTitle("");
    setDescription("");
    setDate(undefined);
    setIsActive(false);
  };

  const handleCancel = () => {
    setTitle("");
    setDescription("");
    setDate(undefined);
    setIsActive(false);
  };

  if (!isActive) {
    return <InlineAddTrigger label="New Milestone" onClick={() => setIsActive(true)} />;
  }

  return (
    <ItemCardEdit
      onCancel={handleCancel}
      onSave={submit}
      saveDisabled={!title.trim() || !effectiveDate}
      bottomLeft={
        <div className="flex items-center gap-2">
          <DatePicker value={effectiveDate} onChange={setDate} placeholder="Select Date" />
          {parsedDate.date && !date && (
            <span className="text-xs text-muted-foreground">
              Auto: {format(parsedDate.date, "MMM d, yyyy")}
            </span>
          )}
        </div>
      }
    >
      <div className="flex items-center gap-3">
        <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1">
          <ItemEditor
            value={title}
            onChange={setTitle}
            onSubmit={submit}
            onCancel={handleCancel}
            placeholder="What's happening? (e.g. Album release August 15)"
            autoFocus
            className="font-semibold"
          />
          <DescriptionEditor
            value={description}
            onChange={setDescription}
            onSubmit={submit}
            onCancel={handleCancel}
            placeholder="Add description"
            className="mt-1"
          />
        </div>
      </div>
    </ItemCardEdit>
  );
}

/* ── Milestone Row ── */
function MilestoneRow({
  milestone, attachedFolders, attachedLinks, allFolders, allLinks, allTimelines,
  onUpdate, onDelete,
  onAttachFolder, onDetachFolder, onAttachLink, onDetachLink,
}: {
  milestone: any; attachedFolders: any[]; attachedLinks: any[];
  allFolders: any[]; allLinks: any[]; allTimelines: any[];
  onUpdate: (patch: Record<string, any>) => void; onDelete: () => void;
  onAttachFolder: (folderId: string) => void; onDetachFolder: (id: string) => void;
  onAttachLink: (linkId: string) => void; onDetachLink: (id: string) => void;
}) {
  const date = parse(milestone.date, "yyyy-MM-dd", new Date());
  const attachedFolderIds = new Set(attachedFolders.map((f: any) => f.folder_id));
  const attachedLinkIds = new Set(attachedLinks.map((l: any) => l.link_id));
  const availableFolders = allFolders.filter((f) => !attachedFolderIds.has(f.id));
  const availableLinks = allLinks.filter((l) => !attachedLinkIds.has(l.id));
  const currentTimeline = allTimelines.find((t: any) => t.id === (milestone as any).timeline_id);
  const availableTimelines = allTimelines.filter((t: any) => t.id !== (milestone as any).timeline_id);

  return (
    <ItemCardRead
      icon={<CalendarIcon className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />}
      title={
        <InlineField value={milestone.title} onSave={(v) => onUpdate({ title: v })} className="font-semibold text-sm" />
      }
      subtitle={
        <InlineField
          value={milestone.description ?? ""}
          placeholder="Add description"
          onSave={(v) => onUpdate({ description: v || null })}
          className="text-sm text-muted-foreground"
        />
      }
      badges={
        <>
          <Popover>
            <PopoverTrigger asChild>
              <button className="caption inline-flex items-center gap-1 bg-muted/80 px-1.5 py-0.5 rounded hover:bg-accent transition-colors">
                <CalendarIcon className="h-3 w-3" /> {format(date, "MMM d, yyyy")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover border border-border z-50" align="start">
              <Calendar mode="single" selected={date} onSelect={(d) => d && onUpdate({ date: format(d, "yyyy-MM-dd") })} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          {currentTimeline && (
            <MetaBadge icon={<FolderPlus className="h-3 w-3" />}>
              {currentTimeline.name}
            </MetaBadge>
          )}

          {attachedFolders.map((af: any) => (
            <MetaBadge key={af.id} variant="blue" icon={<FolderOpen className="h-3 w-3" />} onClick={() => onDetachFolder(af.id)}>
              {af.folder?.name}
            </MetaBadge>
          ))}
          {attachedLinks.map((al: any) => (
            <MetaBadge
              key={al.id}
              variant="blue"
              icon={<Link2 className="h-3 w-3" />}
              onClick={() => window.open(al.link?.url, "_blank", "noopener,noreferrer")}
            >
              {al.link?.title}
            </MetaBadge>
          ))}
        </>
      }
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* Move to timeline */}
            {availableTimelines.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Move to Timeline</div>
                {availableTimelines.map((t: any) => (
                  <DropdownMenuItem key={t.id} onClick={() => onUpdate({ timeline_id: t.id })}>
                    <FolderPlus className="mr-2 h-3.5 w-3.5" /> {t.name}
                  </DropdownMenuItem>
                ))}
                {(milestone as any).timeline_id && (
                  <DropdownMenuItem onClick={() => onUpdate({ timeline_id: null })}>
                    <FolderPlus className="mr-2 h-3.5 w-3.5" /> Unsorted
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
              </>
            )}

            {availableFolders.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Attach Folder</div>
                {availableFolders.map((f) => (
                  <DropdownMenuItem key={f.id} onClick={() => onAttachFolder(f.id)}>
                    <FolderOpen className="mr-2 h-3.5 w-3.5" /> {f.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            {availableLinks.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Attach Link</div>
                {availableLinks.slice(0, 10).map((l) => (
                  <DropdownMenuItem key={l.id} onClick={() => onAttachLink(l.id)}>
                    <Link2 className="mr-2 h-3.5 w-3.5" /> {l.title}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );
}

/* ── Timeline Name (inline editable) ── */
function TimelineName({ timeline, artistId }: { timeline: any; artistId: string }) {
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await (supabase as any).from("artist_timelines").update({ name }).eq("id", timeline.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist_timelines", artistId] }),
  });
  return <InlineField value={timeline.name} onSave={(v) => update.mutate(v)} className="text-base font-bold tracking-tight" inputClassName="bg-transparent border-none focus:ring-0 px-0 py-0" />;
}

/* ── Timeline Actions (archive/delete) ── */
function TimelineActions({ timeline, artistId, milestoneCount }: { timeline: any; artistId: string; milestoneCount: number }) {
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteTimeline = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("artist_timelines").delete().eq("id", timeline.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist_timelines", artistId] });
      queryClient.invalidateQueries({ queryKey: ["artist_milestones", artistId] });
      toast.success("Timeline deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleArchive = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("artist_timelines").update({ is_archived: !timeline.is_archived }).eq("id", timeline.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist_timelines", artistId] });
      toast.success(timeline.is_archived ? "Timeline restored" : "Timeline archived");
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
          <DropdownMenuItem onClick={() => toggleArchive.mutate()}>
            <Archive className="h-4 w-4 mr-2" /> {timeline.is_archived ? "Restore" : "Archive"} Timeline
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteConfirm(true)}>
            <Trash className="h-4 w-4 mr-2" /> Delete Timeline
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{timeline.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the timeline. {milestoneCount} milestone{milestoneCount !== 1 ? "s" : ""} will be moved to Unsorted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTimeline.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ── New Timeline Inline ── */
function NewTimelineInline({ artistId, onCreated }: { artistId: string; onCreated: (id: string) => void }) {
  const queryClient = useQueryClient();
  const [show, setShow] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const create = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await (supabase as any)
        .from("artist_timelines").insert({ artist_id: artistId, name: name.trim() }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["artist_timelines", artistId] });
      onCreated(data.id);
      setShow(false);
      toast.success("Timeline created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!show) {
    return <InlineAddTrigger label="New Timeline" onClick={() => { setShow(true); setTimeout(() => inputRef.current?.focus(), 50); }} />;
  }

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <input
        ref={inputRef}
        autoFocus
        placeholder="Timeline name, press Enter"
        className="w-full bg-transparent text-base font-bold outline-none placeholder:text-muted-foreground/50"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) create.mutate((e.target as HTMLInputElement).value);
          if (e.key === "Escape") setShow(false);
        }}
        onBlur={(e) => { if (!e.target.value.trim()) setShow(false); }}
      />
      <p className="text-xs text-muted-foreground mt-1">Press Enter to create · Esc to cancel</p>
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
        .from("artists").update({ timeline_is_public: !isPublic } as any).eq("id", artist.id);
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
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toggleShare.mutate()}>
        <Share2 className="h-4 w-4" />
        {isPublic ? "Sharing On" : "Share Timeline"}
      </Button>
    </div>
  );
}
