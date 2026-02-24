import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus, Trash2, CalendarIcon, Share2, Check, Copy, List, CalendarDays,
  ChevronLeft, ChevronRight, FolderOpen, Link2, MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { InlineField } from "@/components/ui/InlineField";
import {
  format, parse, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isToday,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

interface TimelinesTabProps {
  artistId: string;
}

export function TimelinesTab({ artistId }: TimelinesTabProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
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

  // Fetch folders and links for this artist (for attachment picker)
  const { data: folders = [] } = useQuery({
    queryKey: ["artist_link_folders", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_link_folders")
        .select("id, name")
        .eq("artist_id", artistId);
      if (error) throw error;
      return data;
    },
  });

  const { data: links = [] } = useQuery({
    queryKey: ["artist_links_for_milestones", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_links")
        .select("id, title, url, folder_id")
        .or(`artist_id.eq.${artistId},folder_id.not.is.null`);
      if (error) throw error;
      return data;
    },
  });

  // Fetch milestone attachments
  const { data: milestoneAttachments = { folders: [], links: [] } } = useQuery({
    queryKey: ["milestone_attachments", artistId],
    queryFn: async () => {
      const milestoneIds = milestones.map((m: any) => m.id);
      if (milestoneIds.length === 0) return { folders: [], links: [] };

      const [foldersRes, linksRes] = await Promise.all([
        supabase.from("milestone_folders" as any).select("*").in("milestone_id", milestoneIds),
        supabase.from("milestone_links" as any).select("*").in("milestone_id", milestoneIds),
      ]);

      return {
        folders: (foldersRes.data || []) as any[],
        links: (linksRes.data || []) as any[],
      };
    },
    enabled: milestones.length > 0,
  });

  // Get user profile for initials
  const { data: profile } = useQuery({
    queryKey: ["my-profile-initials"],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      return data;
    },
  });

  const userInitials = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

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

  const attachFolder = useMutation({
    mutationFn: async ({ milestoneId, folderId }: { milestoneId: string; folderId: string }) => {
      const { error } = await (supabase as any).from("milestone_folders").insert({
        milestone_id: milestoneId,
        folder_id: folderId,
      });
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
      const { error } = await (supabase as any).from("milestone_links").insert({
        milestone_id: milestoneId,
        link_id: linkId,
      });
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

        <div className="flex items-center gap-2">
          <ShareTimelineButton artist={artist} />
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              // Scroll to add input or activate it
              const el = document.getElementById("milestone-add-trigger");
              el?.click();
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Add Milestone
          </Button>
        </div>
      </div>

      {/* Inline add */}
      <InlineMilestoneInput onAdd={(title, date) => addMilestone.mutate({ title, date })} />

      {isEmpty ? (
        <p className="text-sm text-muted-foreground mt-4">No key dates yet. Add your first one above.</p>
      ) : view === "list" ? (
        <div className="mt-4 space-y-0">
          {milestones.map((m: any) => {
            const mFolders = milestoneAttachments.folders
              .filter((mf: any) => mf.milestone_id === m.id)
              .map((mf: any) => {
                const folder = folders.find((f) => f.id === mf.folder_id);
                return { ...mf, folder };
              })
              .filter((mf: any) => mf.folder);

            const mLinks = milestoneAttachments.links
              .filter((ml: any) => ml.milestone_id === m.id)
              .map((ml: any) => {
                const link = links.find((l) => l.id === ml.link_id);
                return { ...ml, link };
              })
              .filter((ml: any) => ml.link);

            return (
              <MilestoneRow
                key={m.id}
                milestone={m}
                attachedFolders={mFolders}
                attachedLinks={mLinks}
                allFolders={folders}
                allLinks={links}
                userInitials={userInitials}
                onUpdate={(patch) => updateMilestone.mutate({ id: m.id, patch })}
                onDelete={() => deleteMilestone.mutate(m.id)}
                onAttachFolder={(folderId) => attachFolder.mutate({ milestoneId: m.id, folderId })}
                onDetachFolder={(id) => detachFolder.mutate(id)}
                onAttachLink={(linkId) => attachLink.mutate({ milestoneId: m.id, linkId })}
                onDetachLink={(id) => detachLink.mutate(id)}
              />
            );
          })}
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

  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) { days.push(d); d = addDays(d, 1); }

  const milestonesByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    milestones.forEach((m) => { const key = m.date; if (!map[key]) map[key] = []; map[key].push(m); });
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
        id="milestone-add-trigger"
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
          <Button variant="outline" className={cn("h-9 w-[160px] justify-start text-left font-normal text-sm bg-transparent border-border shrink-0", !date && "text-muted-foreground/50")}>
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {date ? format(date, "MMM d, yyyy") : "Pick date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-popover border border-border z-50" align="start">
          <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="p-3 pointer-events-auto" />
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
  milestone, attachedFolders, attachedLinks, allFolders, allLinks,
  userInitials, onUpdate, onDelete,
  onAttachFolder, onDetachFolder, onAttachLink, onDetachLink,
}: {
  milestone: any;
  attachedFolders: any[];
  attachedLinks: any[];
  allFolders: any[];
  allLinks: any[];
  userInitials: string;
  onUpdate: (patch: Record<string, any>) => void;
  onDelete: () => void;
  onAttachFolder: (folderId: string) => void;
  onDetachFolder: (id: string) => void;
  onAttachLink: (linkId: string) => void;
  onDetachLink: (id: string) => void;
}) {
  const date = parse(milestone.date, "yyyy-MM-dd", new Date());

  const attachedFolderIds = new Set(attachedFolders.map((f: any) => f.folder_id));
  const attachedLinkIds = new Set(attachedLinks.map((l: any) => l.link_id));
  const availableFolders = allFolders.filter((f) => !attachedFolderIds.has(f.id));
  const availableLinks = allLinks.filter((l) => !attachedLinkIds.has(l.id));

  return (
    <div className="flex items-start gap-0 group border-b border-border last:border-b-0">
      {/* Date column */}
      <div className="w-[160px] shrink-0 py-5 pr-6">
        <Popover>
          <PopoverTrigger asChild>
            <button className="text-left hover:text-primary transition-colors">
              <div className="font-semibold text-sm">{format(date, "MMMM d, yyyy")}</div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-popover border border-border z-50" align="start">
            <Calendar mode="single" selected={date} onSelect={(d) => d && onUpdate({ date: format(d, "yyyy-MM-dd") })} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>

      {/* Content column */}
      <div className="flex-1 py-5 pl-6 border-l border-border min-w-0">
        <InlineField value={milestone.title} onSave={(v) => onUpdate({ title: v })} className="font-semibold text-sm" />
        <InlineField
          value={milestone.description ?? ""}
          placeholder="Add description"
          onSave={(v) => onUpdate({ description: v || null })}
          className="text-sm text-muted-foreground mt-0.5"
        />

        {/* Attached badges */}
        {(attachedFolders.length > 0 || attachedLinks.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {attachedFolders.map((af: any) => (
              <span
                key={af.id}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 px-2 py-1 rounded-md cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
                onClick={() => onDetachFolder(af.id)}
                title="Click to remove"
              >
                <FolderOpen className="h-3 w-3" /> {af.folder?.name}
              </span>
            ))}
            {attachedLinks.map((al: any) => (
              <span
                key={al.id}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 px-2 py-1 rounded-md cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
                onClick={() => onDetachLink(al.id)}
                title="Click to remove"
              >
                <Link2 className="h-3 w-3" /> {al.link?.title}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right: user initials + kebab menu */}
      <div className="flex items-center gap-2 py-5 pl-4 shrink-0">
        <span className="text-xs font-semibold text-muted-foreground">{userInitials}</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* Attach folder */}
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
            {/* Attach link */}
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
        variant="outline"
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
