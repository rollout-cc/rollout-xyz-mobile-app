import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, FolderOpen, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { InlineField } from "@/components/ui/InlineField";

interface LinksTabProps {
  artistId: string;
}

export function LinksTab({ artistId }: LinksTabProps) {
  const queryClient = useQueryClient();
  const { data: folders = [] } = useQuery({
    queryKey: ["artist_link_folders", artistId],
    queryFn: async () => {
      const { data, error } = await supabase.from("artist_link_folders").select("*, artist_links(*)").eq("artist_id", artistId).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const [addingFolder, setAddingFolder] = useState(false);
  const folderRef = useRef<HTMLInputElement>(null);

  const createFolder = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("artist_link_folders").insert({ artist_id: artistId, name });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["artist_link_folders", artistId] }); setAddingFolder(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateFolder = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("artist_link_folders").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist_link_folders", artistId] }),
  });

  const addLink = useMutation({
    mutationFn: async (folderId: string) => {
      const { error } = await supabase.from("artist_links").insert({ folder_id: folderId, title: "New Link", url: "https://" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist_link_folders", artistId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const updateLink = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, string> }) => {
      const { error } = await supabase.from("artist_links").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist_link_folders", artistId] }),
  });

  const deleteLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("artist_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist_link_folders", artistId] }),
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("artist_link_folders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artist_link_folders", artistId] }),
  });

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-2">
        {addingFolder ? (
          <input
            ref={folderRef}
            autoFocus
            placeholder="Folder name, press Enter"
            className="bg-transparent border-b border-primary/40 outline-none text-sm py-1 w-48"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) createFolder.mutate((e.target as HTMLInputElement).value.trim());
              if (e.key === "Escape") setAddingFolder(false);
            }}
            onBlur={() => setAddingFolder(false)}
          />
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setAddingFolder(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Folder
          </Button>
        )}
      </div>

      {folders.length === 0 && !addingFolder && (
        <p className="text-sm text-muted-foreground">No link folders yet.</p>
      )}

      {folders.map((folder: any) => (
        <div key={folder.id} className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              <InlineField value={folder.name} onSave={(v) => updateFolder.mutate({ id: folder.id, name: v })} />
            </h4>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => addLink.mutate(folder.id)}><Plus className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" onClick={() => deleteFolder.mutate(folder.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
          <div className="space-y-1">
            {(folder.artist_links ?? []).map((link: any) => (
              <div key={link.id} className="flex items-center justify-between text-sm p-2 rounded hover:bg-accent/50 group">
                <div className="flex items-center gap-3 flex-1">
                  <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                  <InlineField value={link.title} onSave={(v) => updateLink.mutate({ id: link.id, patch: { title: v } })} className="font-medium" />
                  <InlineField value={link.url} onSave={(v) => updateLink.mutate({ id: link.id, patch: { url: v } })} className="text-muted-foreground text-xs truncate max-w-[300px]" />
                </div>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => deleteLink.mutate(link.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
