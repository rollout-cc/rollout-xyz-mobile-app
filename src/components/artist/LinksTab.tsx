import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, FolderOpen, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface LinksTabProps {
  artistId: string;
}

export function LinksTab({ artistId }: LinksTabProps) {
  const queryClient = useQueryClient();
  const { data: folders = [] } = useQuery({
    queryKey: ["artist_link_folders", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_link_folders")
        .select("*, artist_links(*)")
        .eq("artist_id", artistId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const [newFolder, setNewFolder] = useState("");
  const [addingLinkTo, setAddingLinkTo] = useState<string | null>(null);
  const [linkForm, setLinkForm] = useState({ title: "", url: "" });

  const createFolder = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("artist_link_folders").insert({ artist_id: artistId, name: newFolder.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist_link_folders", artistId] });
      setNewFolder("");
      toast.success("Folder created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addLink = useMutation({
    mutationFn: async (folderId: string) => {
      const { error } = await supabase.from("artist_links").insert({ folder_id: folderId, title: linkForm.title, url: linkForm.url });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist_link_folders", artistId] });
      setLinkForm({ title: "", url: "" });
      setAddingLinkTo(null);
      toast.success("Link added");
    },
    onError: (e: any) => toast.error(e.message),
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
        <Input placeholder="New folder name" value={newFolder} onChange={(e) => setNewFolder(e.target.value)} className="max-w-xs" />
        <Button size="sm" onClick={() => createFolder.mutate()} disabled={!newFolder.trim()}>
          <Plus className="h-4 w-4 mr-1" /> Folder
        </Button>
      </div>

      {folders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No link folders yet.</p>
      ) : (
        folders.map((folder: any) => (
          <div key={folder.id} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium flex items-center gap-2">
                <FolderOpen className="h-4 w-4" /> {folder.name}
              </h4>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setAddingLinkTo(addingLinkTo === folder.id ? null : folder.id)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteFolder.mutate(folder.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {addingLinkTo === folder.id && (
              <div className="flex gap-2 mb-3">
                <Input placeholder="Title" value={linkForm.title} onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })} />
                <Input placeholder="URL" value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} />
                <Button size="sm" onClick={() => addLink.mutate(folder.id)} disabled={!linkForm.title.trim() || !linkForm.url.trim()}>Add</Button>
              </div>
            )}

            <div className="space-y-1">
              {(folder.artist_links ?? []).map((link: any) => (
                <div key={link.id} className="flex items-center justify-between text-sm p-2 rounded hover:bg-accent/50">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                    <ExternalLink className="h-3 w-3" /> {link.title}
                  </a>
                  <Button variant="ghost" size="icon" onClick={() => deleteLink.mutate(link.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
