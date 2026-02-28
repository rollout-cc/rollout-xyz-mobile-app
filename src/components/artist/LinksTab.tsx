import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  FolderOpen, ExternalLink, LinkIcon, MoreHorizontal,
  Trash, FolderPlus, Copy, GripVertical, Trash2, Check,
} from "lucide-react";
import { toast } from "sonner";
import { InlineField } from "@/components/ui/InlineField";
import { CollapsibleSection, InlineAddTrigger } from "@/components/ui/CollapsibleSection";
import { MetaBadge } from "@/components/ui/ItemCard";
import { ItemEditor, DescriptionEditor } from "@/components/ui/ItemEditor";
import { FolderPicker } from "@/components/ui/ItemPickers";
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

interface LinksTabProps {
  artistId: string;
}

export function LinksTab({ artistId }: LinksTabProps) {
  const queryClient = useQueryClient();
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const { data: folders = [] } = useQuery({
    queryKey: ["artist_link_folders", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_link_folders").select("*").eq("artist_id", artistId).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: allLinks = [] } = useQuery({
    queryKey: ["artist_links", artistId],
    queryFn: async () => {
      const { data: folderLinks, error: fErr } = await supabase
        .from("artist_links").select("*")
        .in("folder_id", folders.map((f: any) => f.id))
        .order("sort_order", { ascending: true });
      const { data: unfiledLinks, error: uErr } = await (supabase as any)
        .from("artist_links").select("*")
        .eq("artist_id", artistId).is("folder_id", null)
        .order("sort_order", { ascending: true });
      if (fErr) throw fErr;
      if (uErr) throw uErr;
      return [...(folderLinks || []), ...(unfiledLinks || [])];
    },
    enabled: folders !== undefined,
  });

  const unfiledLinks = allLinks.filter((l: any) => !l.folder_id);
  const folderLinks = (folderId: string) => allLinks.filter((l: any) => l.folder_id === folderId);
  const toggleFolder = (id: string) => setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));

  const isEmpty = folders.length === 0 && allLinks.length === 0;

  if (isEmpty) {
    return <EmptyLinksState artistId={artistId} folders={folders} />;
  }

  return (
    <div className="mt-4 space-y-2">
      {unfiledLinks.length > 0 && (
        <CollapsibleSection title="Unsorted" count={unfiledLinks.length}>
          <LinkItem isNew artistId={artistId} folders={folders} />
          <LinkList links={unfiledLinks} artistId={artistId} folders={folders} droppableId="unsorted" />
        </CollapsibleSection>
      )}

      {folders.map((folder: any) => {
        const fLinks = folderLinks(folder.id);
        const isExpanded = expandedFolders[folder.id] ?? false;
        return (
          <CollapsibleSection
            key={folder.id} title={folder.name} count={fLinks.length}
            open={isExpanded} onToggle={() => toggleFolder(folder.id)}
            titleSlot={<FolderName folder={folder} artistId={artistId} />}
            actions={<FolderActions folder={folder} artistId={artistId} linkCount={fLinks.length} />}
            defaultOpen={false}
          >
            <LinkItem isNew artistId={artistId} folders={folders} defaultFolderId={folder.id} />
            <LinkList links={fLinks} artistId={artistId} folders={folders} droppableId={folder.id} />
            {fLinks.length === 0 && <p className="caption text-muted-foreground py-3 pl-2">No links yet.</p>}
          </CollapsibleSection>
        );
      })}

      {unfiledLinks.length === 0 && folders.length > 0 && (
        <div className="pt-2">
          <LinkItem isNew artistId={artistId} folders={folders} />
        </div>
      )}
    </div>
  );
}

/* ── Empty State ── */
function EmptyLinksState({ artistId, folders }: { artistId: string; folders: any[] }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"idle" | "folder" | "link">("idle");

  const createFolder = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from("artist_link_folders").insert({ artist_id: artistId, name: name.trim() }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist_link_folders", artistId] });
      setMode("idle");
      toast.success("Folder created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (mode === "folder") {
    return (
      <div className="mt-4">
        <div className="mb-2 rounded-lg border border-border bg-card px-4 py-3">
          <input
            autoFocus placeholder="Folder name"
            className="w-full bg-transparent outline-none text-sm font-medium placeholder:text-muted-foreground/50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) createFolder.mutate((e.target as HTMLInputElement).value);
              if (e.key === "Escape") setMode("idle");
            }}
            onBlur={(e) => { if (!e.target.value.trim()) setMode("idle"); }}
          />
        </div>
      </div>
    );
  }

  if (mode === "link") {
    return (
      <div className="mt-4">
        <LinkItem isNew artistId={artistId} folders={folders} autoFocus />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
      <p className="text-muted-foreground text-lg">No links yet</p>
      <div className="flex items-center gap-3">
        <Button variant="default" size="sm" className="gap-2" onClick={() => setMode("folder")}>
          <FolderPlus className="h-4 w-4" /> New Folder
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setMode("link")}>
          <LinkIcon className="h-4 w-4" /> New Link
        </Button>
      </div>
    </div>
  );
}

/* ── Link List with drag-and-drop ── */
function LinkList({ links, artistId, folders, droppableId }: {
  links: any[]; artistId: string; folders: any[]; droppableId: string;
}) {
  const queryClient = useQueryClient();

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;

    const reordered = [...links];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    // Optimistic update
    const updates = reordered.map((link, idx) => ({ id: link.id, sort_order: idx }));

    // Update in DB
    for (const u of updates) {
      await supabase.from("artist_links").update({ sort_order: u.sort_order }).eq("id", u.id);
    }
    queryClient.invalidateQueries({ queryKey: ["artist_links", artistId] });
  }, [links, artistId, queryClient]);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId={droppableId}>
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="divide-y divide-border/30">
            {links.map((link: any, index: number) => (
              <Draggable key={link.id} draggableId={link.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={cn(snapshot.isDragging && "opacity-80 bg-background rounded-lg shadow-lg")}
                  >
                    <LinkItem
                      link={link}
                      artistId={artistId}
                      folders={folders}
                      dragHandleProps={provided.dragHandleProps}
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

/* ── Unified Link Item (new + existing) ── */
interface LinkItemProps {
  link?: any;
  isNew?: boolean;
  artistId: string;
  folders: any[];
  defaultFolderId?: string;
  autoFocus?: boolean;
  dragHandleProps?: any;
}

function LinkItem({ link, isNew, artistId, folders, defaultFolderId, autoFocus, dragHandleProps }: LinkItemProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(link?.url || "");
  const [title, setTitle] = useState(link?.title || "");
  const [description, setDescription] = useState(link?.description || "");
  const [showNew, setShowNew] = useState(false);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(defaultFolderId || link?.folder_id || null);
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(
    (defaultFolderId || link?.folder_id) ? folders.find((f: any) => f.id === (defaultFolderId || link?.folder_id))?.name || null : null
  );
  const lastFetchedUrl = useRef("");
  const titleRef = useRef(title);
  const descRef = useRef(description);
  titleRef.current = title;
  descRef.current = description;

  // Auto-fetch metadata when URL looks valid
  const fetchMeta = useCallback((targetUrl: string) => {
    const trimmed = targetUrl.trim();
    if (!trimmed) return;
    if (!/^https?:\/\/.+\..+/.test(trimmed)) return;
    if (lastFetchedUrl.current === trimmed) return;
    lastFetchedUrl.current = trimmed;
    setIsFetchingMeta(true);
    supabase.functions.invoke("scrape-link-metadata", { body: { url: trimmed } })
      .then(({ data, error }) => {
        console.log("Metadata fetch result:", { data, error });
        if (error) {
          console.error("Metadata fetch edge fn error:", error);
          return;
        }
        if (data?.success) {
          // Always overwrite title if it matches the URL or is empty
          const currentTitle = titleRef.current;
          if (data.title && (!currentTitle || currentTitle === trimmed || currentTitle.startsWith("http"))) {
            setTitle(data.title);
          }
          if (data.description && !descRef.current) {
            setDescription(data.description);
          }
        }
      })
      .catch((err) => console.error("Metadata fetch error:", err))
      .finally(() => setIsFetchingMeta(false));
  }, []);

  useEffect(() => {
    fetchMeta(url);
  }, [url, fetchMeta]);

  // Trigger config for # folder selection
  const triggers = useMemo(() => defaultFolderId ? [] : [
    {
      char: "#",
      items: folders.map((f: any) => ({
        id: f.id,
        label: f.name,
        icon: <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />,
      })),
      onSelect: (item: any, current: string) => {
        setSelectedFolderId(item.id);
        setSelectedFolderName(item.label);
        return current.replace(/#\S*$/, "").trim();
      },
    },
  ], [folders, defaultFolderId]);

  /* ── Mutations ── */
  const addLink = useMutation({
    mutationFn: async () => {
      const finalUrl = url.trim();
      const finalTitle = title.trim() || finalUrl;
      const insert: any = { title: finalTitle, url: finalUrl, description: description.trim() || null, sort_order: 0 };
      if (selectedFolderId || defaultFolderId) {
        insert.folder_id = selectedFolderId || defaultFolderId;
      } else {
        insert.artist_id = artistId;
      }
      const { error } = await (supabase as any).from("artist_links").insert(insert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist_links", artistId] });
      queryClient.invalidateQueries({ queryKey: ["artist_link_folders", artistId] });
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateLink = useMutation({
    mutationFn: async () => {
      const patch: any = {
        title: title.trim() || url.trim(),
        url: url.trim(),
        description: description.trim() || null,
      };
      if (!defaultFolderId) {
        patch.folder_id = selectedFolderId || null;
        if (!selectedFolderId) patch.artist_id = artistId;
      }
      const { error } = await supabase.from("artist_links").update(patch).eq("id", link.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist_links", artistId] });
      setEditing(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLink = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("artist_links").delete().eq("id", link.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist_links", artistId] });
      queryClient.invalidateQueries({ queryKey: ["artist_link_folders", artistId] });
    },
  });

  const resetForm = () => {
    setUrl(""); setTitle(""); setDescription(""); setShowNew(false);
    lastFetchedUrl.current = "";
    if (!defaultFolderId) { setSelectedFolderId(null); setSelectedFolderName(null); }
  };

  const handleCancel = () => {
    if (isNew) {
      resetForm();
    } else {
      setUrl(link.url);
      setTitle(link.title);
      setDescription(link.description || "");
      setEditing(false);
    }
  };

  const handleSubmit = () => {
    if (!url.trim()) return;
    if (isNew) addLink.mutate();
    else updateLink.mutate();
  };

  const enterEdit = () => {
    setUrl(link.url);
    setTitle(link.title);
    setDescription(link.description || "");
    setSelectedFolderId(link.folder_id || null);
    setSelectedFolderName(link.folder_id ? folders.find((f: any) => f.id === link.folder_id)?.name || null : null);
    setEditing(true);
    // If link title looks like a URL (no metadata was fetched), auto-fetch
    if (link.title === link.url || link.title.startsWith("http")) {
      lastFetchedUrl.current = ""; // Reset so fetchMeta will trigger
    } else {
      lastFetchedUrl.current = link.url;
    }
  };

  /* ── New link trigger ── */
  if (isNew && !showNew && !autoFocus) {
    return <InlineAddTrigger label="New Link" onClick={() => setShowNew(true)} />;
  }

  /* ── Editing mode (shared for new and existing) ── */
  if (editing || (isNew && (showNew || autoFocus))) {
    return (
      <div className="mb-2 rounded-lg border border-border bg-card px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <ItemEditor
            value={url}
            onChange={setUrl}
            onSubmit={() => {}}
            onCancel={handleCancel}
            placeholder="Paste URL"
            autoFocus={autoFocus || showNew || editing}
            className="flex-1 min-w-0"
          />
        </div>
        {url.trim() && (
          <div className="pl-6 space-y-1">
            {isFetchingMeta && (
              <p className="text-xs text-muted-foreground animate-pulse">Fetching page info…</p>
            )}
            <ItemEditor
              value={title}
              onChange={setTitle}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              placeholder={isFetchingMeta ? "Loading title…" : `Enter Title${!defaultFolderId ? "  (# to assign folder)" : ""}`}
              triggers={triggers}
              autoFocus={!isFetchingMeta && !!url.trim()}
            />
            <DescriptionEditor
              value={description}
              onChange={setDescription}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              placeholder="Description"
            />
            {selectedFolderName && !defaultFolderId && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1">
                <FolderOpen className="h-3 w-3" /> {selectedFolderName}
                <button onClick={() => { setSelectedFolderId(null); setSelectedFolderName(null); }} className="hover:text-foreground">×</button>
              </span>
            )}
          </div>
        )}

        {/* Bottom bar */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            {!defaultFolderId && (
              <FolderPicker
                folders={folders}
                value={selectedFolderId}
                onChange={(id, name) => { setSelectedFolderId(id); setSelectedFolderName(name); }}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 text-sm" onClick={handleCancel}>Cancel</Button>
            <Button size="sm" className="h-8 text-sm gap-1.5" onClick={handleSubmit} disabled={!url.trim()}>
              <Check className="h-3.5 w-3.5" /> Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Read mode (existing link) ── */
  let faviconUrl: string | null = null;
  try {
    const domain = new URL(link.url).hostname;
    faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {}

  let domainLabel: string | null = null;
  try {
    domainLabel = new URL(link.url).hostname.replace("www.", "");
  } catch {}

  const folder = link.folder_id ? folders.find((f: any) => f.id === link.folder_id) : null;

  return (
    <div
      className="flex items-start gap-2 py-3 px-1 group cursor-pointer"
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

      {/* Favicon */}
      <div className="h-9 w-9 shrink-0 rounded-lg bg-muted/60 flex items-center justify-center overflow-hidden mt-0.5">
        {faviconUrl ? (
          <img src={faviconUrl} alt="" className="h-5 w-5" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <LinkIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{link.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {domainLabel && <span className="caption text-muted-foreground">{domainLabel}</span>}
          {folder && (
            <MetaBadge icon={<FolderOpen className="h-3 w-3" />}>{folder.name}</MetaBadge>
          )}
        </div>
        {link.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{link.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(link.url); toast.success("URL copied"); }}
          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
          title="Copy URL"
        >
          <Copy className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); window.open(link.url, "_blank"); }}
          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
          title="Open"
        >
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); deleteLink.mutate(); }}
          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ── Folder Name ── */
function FolderName({ folder, artistId }: { folder: any; artistId: string }) {
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("artist_link_folders").update({ name }).eq("id", folder.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist_link_folders", artistId] }),
  });
  return <InlineField value={folder.name} onSave={(v) => update.mutate(v)} className="text-base font-bold" />;
}

/* ── Folder Actions ── */
function FolderActions({ folder, artistId, linkCount }: { folder: any; artistId: string; linkCount: number }) {
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteFolder = useMutation({
    mutationFn: async () => {
      const { error: linksError } = await supabase.from("artist_links").delete().eq("folder_id", folder.id);
      if (linksError) throw linksError;
      const { error } = await supabase.from("artist_link_folders").delete().eq("id", folder.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist_link_folders", artistId] });
      queryClient.invalidateQueries({ queryKey: ["artist_links", artistId] });
      toast.success("Folder deleted");
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
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}>
            <Trash className="h-4 w-4 mr-2" /> Delete Folder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{folder.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this folder and {linkCount} link{linkCount !== 1 ? "s" : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteFolder.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
