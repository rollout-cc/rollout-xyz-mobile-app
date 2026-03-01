import { useState, useEffect, useRef } from "react";
import { Search, User, Loader2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import type { OnboardingArtist } from "./CompanyOnboardingWizard";

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images: { url: string }[];
}

interface Props {
  teamId: string;
  addedArtists: OnboardingArtist[];
  onArtistAdded: (artist: OnboardingArtist) => void;
}

export function StepAddArtists({ teamId, addedArtists, onArtistAdded }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyArtist[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [addedSpotifyIds, setAddedSpotifyIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase.functions.invoke("spotify-search", {
          body: { q: query.trim() },
        });
        if (error) throw error;
        setResults(data?.artists ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleAdd = async (artist: SpotifyArtist) => {
    setAddingIds((prev) => new Set(prev).add(artist.id));
    try {
      const { data, error } = await supabase
        .from("artists")
        .insert({
          name: artist.name,
          team_id: teamId,
          spotify_id: artist.id,
          avatar_url: artist.images?.[0]?.url ?? null,
          genres: artist.genres,
        })
        .select("id, name, avatar_url")
        .single();
      if (error) throw error;
      onArtistAdded(data);
      setAddedSpotifyIds((prev) => new Set(prev).add(artist.id));
    } catch {
      // Artist may already exist
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(artist.id);
        return next;
      });
    }
  };

  const handleCreateManual = async () => {
    if (!query.trim()) return;
    const { data, error } = await supabase
      .from("artists")
      .insert({ name: query.trim(), team_id: teamId })
      .select("id, name, avatar_url")
      .single();
    if (error) return;
    onArtistAdded(data);
    setQuery("");
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-foreground mb-2">Add your artists</h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        Search Spotify to add artists to your roster. You can always add more later.
      </p>

      {/* Added artists chips */}
      {addedArtists.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {addedArtists.map((a) => (
            <div key={a.id} className="flex items-center gap-2 bg-accent/50 rounded-full pl-1 pr-3 py-1">
              <Avatar className="h-6 w-6">
                <AvatarImage src={a.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">{a.name[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{a.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for an artist"
          className="pl-9"
          autoFocus
        />
      </div>

      {/* Results */}
      <div className="max-h-[250px] overflow-y-auto space-y-2">
        {searching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : results.length > 0 ? (
          results.map((result) => {
            const isAdded = addedSpotifyIds.has(result.id);
            const isAdding = addingIds.has(result.id);
            return (
              <div key={result.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={result.images?.[0]?.url} />
                  <AvatarFallback>{result.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{result.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {result.genres.slice(0, 2).join(", ") || "No genres"}
                  </p>
                </div>
                {isAdded ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Check className="h-3.5 w-3.5 text-emerald-500" /> Added
                  </span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => handleAdd(result)} disabled={isAdding}>
                    {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}
                  </Button>
                )}
              </div>
            );
          })
        ) : query.trim().length > 0 && !searching ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-3">No results found</p>
            <Button variant="outline" onClick={handleCreateManual}>
              Create "{query.trim()}" manually
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Search Spotify to add artists</p>
          </div>
        )}
      </div>
    </>
  );
}
