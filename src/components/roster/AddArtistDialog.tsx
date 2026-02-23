import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, User, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images: { url: string }[];
}

interface AddArtistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSpotifyIds: Set<string>;
  onAdd: (artist: SpotifyArtist) => Promise<void>;
  onCreateManual: (name: string) => Promise<void>;
}

export function AddArtistDialog({ open, onOpenChange, existingSpotifyIds, onAdd, onCreateManual }: AddArtistDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyArtist[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
      setAddedIds(new Set());
      setAddingIds(new Set());
    }
  }, [open]);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase.functions.invoke("spotify-search", {
          body: { q: searchQuery.trim() },
        });
        if (error) throw error;
        setSearchResults(data?.artists ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const handleAdd = async (artist: SpotifyArtist) => {
    setAddingIds((prev) => new Set(prev).add(artist.id));
    try {
      await onAdd(artist);
      setAddedIds((prev) => new Set(prev).add(artist.id));
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(artist.id);
        return next;
      });
    }
  };

  const isAlreadyInRoster = (id: string) => existingSpotifyIds.has(id) || addedIds.has(id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Artist</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for an artist"
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="min-h-[300px] flex flex-col">
          {searching ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[350px]">
              {searchResults.map((result) => {
                const inRoster = isAlreadyInRoster(result.id);
                const adding = addingIds.has(result.id);
                return (
                  <div key={result.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={result.images?.[0]?.url} />
                      <AvatarFallback>{result.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {result.genres.slice(0, 3).join(", ") || "No genres"}
                      </p>
                    </div>
                    {inRoster ? (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-[hsl(var(--success))]" /> Added
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => handleAdd(result)} disabled={adding}>
                        {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <User className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {searchQuery.trim().length > 0 ? "No results found" : "Search Spotify to add artists to your roster"}
              </p>
              {searchQuery.trim().length > 0 && (
                <>
                  <p className="text-sm text-muted-foreground">or</p>
                  <Button onClick={() => onCreateManual(searchQuery.trim())}>
                    Create "{searchQuery.trim()}" manually
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
