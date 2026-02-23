import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronDown, ChevronUp, FolderOpen, ExternalLink, LinkIcon, MoreHorizontal, Trash, FolderPlus } from "lucide-react";
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

interface LinksTabProps {
  artistId: string;
}

export function LinksTab({ artistId }: LinksTabProps) {
  const queryClient = useQueryClient();
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [newFolderId, setNewFolderId] = useState<string | null>(null);

  const { data: folders = [] } = useQuery({
    queryKey: ["artist_link_folders", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_link_folders")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: allLinks = [] } = useQuery({
    queryKey: ["artist_links", artistId],
    queryFn: async () => {
      // Get links in folders
      const { data: folderLinks, error: fErr } = await supabase
        .from("artist_links")
        .select("*")
        .in("folder_id", folders.map((f: any) => f.id))
        .order("created_at", { ascending: false });

      // Get unfiled links
      const { data: unfiledLinks, error: uErr } = await (supabase as any)
        .from("artist_links")
        .select("*")
        .eq("artist_id", artistId)
        .is("folder_id", null)
        .order("created_at", { ascending: false });

      if (fErr) throw fErr;
      if (uErr) throw uErr;
      return [...(folderLinks || []), ...(unfiledLinks || [])];
    },
    enabled: folders !== undefined,
  });

  const unfiledLinks = allLinks.filter((l: any) => !l.folder_id);
  const folderLinks = (folderId: string) => allLinks.filter((l: any) => l.folder_id === folderId);

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    if (newFolderId && folders.some((f: any) => f.id === newFolderId)) {
      setExpandedFolders(prev => ({ ...prev, [newFolderId]: true }));
      setTimeout(() => setNewFolderId(null), 100);
    }
  }, [newFolderId, folders]);

  const isEmpty = folders.length === 0 && allLinks.length === 0;

  if (isEmpty) {
    return <EmptyLinksState artistId={artistId} folders={folders} onFolderCreated={setNewFolderId} />;
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <div />
        <NewFolderInline artistId={artistId} onCreated={setNewFolderId} />
      </div>

      {/* Unfiled Links */}
      {unfiledLinks.length > 0 && (
        <div className="border border-border rounded-lg mb-3 overflow-hidden">
          <div className="px-4 py-3 bg-muted/50">
            <span className="text-lg font-bold">Links <span className="text-muted-foreground font-normal text-sm ml-2 bg-muted px-2 py-0.5 rounded-full">{unfiledLinks.length}</span></span>
          </div>
          <div className="p-4">
            <InlineLinkInput artistId={artistId} folders={folders} />
            {unfiledLinks.map((link: any) => (
              <LinkRow key={link.id} link={link} artistId={artistId} folders={folders} />
            ))}
          </div>
        </div>
      )}

      {/* If no unfiled links, show the input at top level */}
      {unfiledLinks.length === 0 && (
        <div className="mb-3">
          <InlineLinkInput artistId={artistId} folders={folders} />
        </div>
      )}

      {/* Folder sections */}
      {folders.map((folder: any) => {
        const fLinks = folderLinks(folder.id);
        const isExpanded = expandedFolders[folder.id] ?? true;
        const isNewlyCreated = newFolderId === folder.id;
        return (
          <div key={folder.id} className="border border-border rounded-lg mb-3 overflow-hidden">
            <div className="flex items-center justify-between w-full px-4 py-3 bg-muted/50 hover:bg-muted transition-colors">
              <button onClick={() => toggleFolder(folder.id)} className="flex items-center gap-2 flex-1 text-left">
                <span className="text-lg font-bold flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  <FolderName folder={folder} artistId={artistId} />
                  <span className="text-muted-foreground font-normal text-sm bg-muted px-2 py-0.5 rounded-full">{fLinks.length}</span>
                </span>
              </button>
              <div className="flex items-center gap-1">
                <FolderActions folder={folder} artistId={artistId} linkCount={fLinks.length} />
                {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </div>
            </div>
            {isExpanded && (
              <div className="p-4">
                <InlineLinkInput artistId={artistId} folders={folders} defaultFolderId={folder.id} autoFocus={isNewlyCreated} />
                {fLinks.map((link: any) => <LinkRow key={link.id} link={link} artistId={artistId} folders={folders} />)}
                {fLinks.length === 0 && !isNewlyCreated && <p className="text-sm text-muted-foreground py-2">No links yet.</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Empty State ── */
function EmptyLinksState({ artistId, folders, onFolderCreated }: { artistId: string; folders: any[]; onFolderCreated: (id: string) => void }) {
  const queryClient = useQueryClient();
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"idle" | "folder" | "link">("idle");

  const createFolder = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from("artist_link_folders").insert({ artist_id: artistId, name: name.trim() }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["artist_link_folders", artistId] });
      onFolderCreated(data.id);
      setMode("idle");
      toast.success("Folder created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (mode === "folder") {
    return (
      <div className="mt-4">
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-muted/50">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <input
              ref={folderInputRef}
              autoFocus
              placeholder="Folder name"
              className="flex-1 bg-transparent text-lg font-bold outline-none placeholder:text-muted-foreground/60"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) createFolder.mutate((e.target as HTMLInputElement).value);
                if (e.key === "Escape") setMode("idle");
              }}
              onBlur={(e) => { if (!e.target.value.trim()) setMode("idle"); }}
            />
          </div>
          <div className="p-4">
            <p className="text-sm text-muted-foreground">Press Enter to create folder</p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "link") {
    return (
      <div className="mt-4">
        <InlineLinkInput artistId={artistId} folders={folders} autoFocus />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
      <p className="text-muted-foreground text-lg">No links yet</p>
      <div className="flex items-center gap-3">
        <Button variant="default" size="lg" className="gap-2 text-base" onClick={() => { setMode("folder"); setTimeout(() => folderInputRef.current?.focus(), 50); }}>
          <FolderPlus className="h-5 w-5" /> New Folder
        </Button>
        <Button variant="outline" size="lg" className="gap-2 text-base" onClick={() => setMode("link")}>
          <LinkIcon className="h-5 w-5" /> New Link
        </Button>
      </div>
    </div>
  );
}

/* ── Inline Link Input ── */
function InlineLinkInput({ artistId, folders, defaultFolderId, autoFocus }: {
  artistId: string; folders: any[]; defaultFolderId?: string; autoFocus?: boolean;
}) {
  const queryClient = useQueryClient();
  const urlRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [isActive, setIsActive] = useState(!!autoFocus);

  // # folder shortcut state
  const [showHashDropdown, setShowHashDropdown] = useState(false);
  const [hashQuery, setHashQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(defaultFolderId || null);
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(
    defaultFolderId ? folders.find((f: any) => f.id === defaultFolderId)?.name || null : null
  );

  useEffect(() => {
    if (autoFocus) urlRef.current?.focus();
  }, [autoFocus]);

  // Detect # in title
  useEffect(() => {
    const match = title.match(/#(\w*)$/);
    if (match && !defaultFolderId) {
      setShowHashDropdown(true);
      setHashQuery(match[1].toLowerCase());
    } else {
      setShowHashDropdown(false);
      setHashQuery("");
    }
  }, [title, defaultFolderId]);

  const filteredFolders = useMemo(() => {
    if (!hashQuery) return folders;
    return folders.filter((f: any) => f.name.toLowerCase().includes(hashQuery));
  }, [folders, hashQuery]);

  const selectFolder = (folder: any) => {
    setTitle(prev => prev.replace(/#\w*$/, "").trim());
    setSelectedFolderId(folder.id);
    setSelectedFolderName(folder.name);
    setShowHashDropdown(false);
    titleRef.current?.focus();
  };

  const addLink = useMutation({
    mutationFn: async () => {
      const finalUrl = url.trim();
      const finalTitle = title.trim() || finalUrl;
      const insert: any = { title: finalTitle, url: finalUrl };

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
      setUrl("");
      setTitle("");
      if (!defaultFolderId) {
        setSelectedFolderId(null);
        setSelectedFolderName(null);
      }
      setTimeout(() => urlRef.current?.focus(), 50);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submit = useCallback(() => {
    if (!url.trim()) return;
    addLink.mutate();
  }, [url, title, selectedFolderId]);

  if (!isActive) {
    return (
      <button
        onClick={() => { setIsActive(true); setTimeout(() => urlRef.current?.focus(), 50); }}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 w-full"
      >
        <Plus className="h-4 w-4" /> Add a link...
      </button>
    );
  }

  return (
    <div className="mb-3 space-y-1">
      <div className="flex items-center gap-2">
        <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          ref={urlRef}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste URL"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              titleRef.current?.focus();
            }
            if (e.key === "Escape") { setUrl(""); setTitle(""); setIsActive(false); }
          }}
        />
      </div>
      {url.trim() && (
        <div className="flex items-center gap-2 pl-6 relative">
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`Link name${!defaultFolderId ? "  (# to assign folder)" : ""}`}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && !showHashDropdown) {
                e.preventDefault();
                submit();
              }
              if (e.key === "Escape") { setUrl(""); setTitle(""); setIsActive(false); }
            }}
          />
          {selectedFolderName && !defaultFolderId && (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              <FolderOpen className="h-3 w-3" /> {selectedFolderName}
              <button onClick={() => { setSelectedFolderId(null); setSelectedFolderName(null); }} className="hover:text-foreground">×</button>
            </span>
          )}

          {/* # folder dropdown */}
          {showHashDropdown && filteredFolders.length > 0 && (
            <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 w-56 py-1">
              {filteredFolders.map((f: any) => (
                <button
                  key={f.id}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                  onMouseDown={(e) => { e.preventDefault(); selectFolder(f); }}
                >
                  <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  {f.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Link Row ── */
function LinkRow({ link, artistId, folders }: { link: any; artistId: string; folders: any[] }) {
  const queryClient = useQueryClient();

  const updateLink = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      const { error } = await supabase.from("artist_links").update(patch).eq("id", link.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist_links", artistId] });
      queryClient.invalidateQueries({ queryKey: ["artist_link_folders", artistId] });
    },
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

  const folder = link.folder_id ? folders.find((f: any) => f.id === link.folder_id) : null;

  return (
    <div className="flex items-center justify-between text-sm py-2 px-1 rounded hover:bg-accent/50 group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-primary">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <InlineField value={link.title} onSave={(v) => updateLink.mutate({ title: v })} className="font-medium" />
        <span className="text-muted-foreground text-xs truncate max-w-[250px]">{link.url}</span>
        {folder && (
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
            <FolderOpen className="h-3 w-3" /> {folder.name}
          </span>
        )}
      </div>
      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-7 w-7 shrink-0" onClick={() => deleteLink.mutate()}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

/* ── Folder Name (inline editable) ── */
function FolderName({ folder, artistId }: { folder: any; artistId: string }) {
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("artist_link_folders").update({ name }).eq("id", folder.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist_link_folders", artistId] }),
  });

  return <InlineField value={folder.name} onSave={(v) => update.mutate(v)} className="text-lg font-bold" />;
}

/* ── New Folder Inline ── */
function NewFolderInline({ artistId, onCreated }: { artistId: string; onCreated: (id: string) => void }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const createFolder = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from("artist_link_folders").insert({ artist_id: artistId, name: name.trim() }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["artist_link_folders", artistId] });
      onCreated(data.id);
      setAdding(false);
      toast.success("Folder created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (adding) {
    return (
      <input
        ref={inputRef}
        autoFocus
        placeholder="Folder name, press Enter"
        className="bg-transparent border-b border-primary/40 outline-none text-sm py-1 w-48"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) createFolder.mutate((e.target as HTMLInputElement).value);
          if (e.key === "Escape") setAdding(false);
        }}
        onBlur={() => setAdding(false)}
      />
    );
  }

  return (
    <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
      <FolderPlus className="h-4 w-4 mr-1" /> New Folder
    </Button>
  );
}

/* ── Folder Actions (delete) ── */
function FolderActions({ folder, artistId, linkCount }: { folder: any; artistId: string; linkCount: number }) {
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteFolder = useMutation({
    mutationFn: async () => {
      // Delete all links in this folder first
      const { error: linksError } = await supabase.from("artist_links").delete().eq("folder_id", folder.id);
      if (linksError) throw linksError;
      const { error } = await supabase.from("artist_link_folders").delete().eq("id", folder.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist_link_folders", artistId] });
      queryClient.invalidateQueries({ queryKey: ["artist_links", artistId] });
      toast.success("Folder and its links deleted");
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
          <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteConfirm(true)}>
            <Trash className="h-4 w-4 mr-2" /> Delete Folder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{folder.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this folder and {linkCount} link{linkCount !== 1 ? "s" : ""} within it.
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
