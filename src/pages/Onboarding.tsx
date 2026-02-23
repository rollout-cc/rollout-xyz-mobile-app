import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateTeam } from "@/hooks/useTeams";
import { useCreateArtist } from "@/hooks/useArtists";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import rolloutLogo from "@/assets/rollout-logo.png";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, User, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images: { url: string }[];
}

interface AddedArtist {
  name: string;
  avatar_url?: string;
  spotify_id?: string;
}

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createTeam = useCreateTeam();
  const createArtist = useCreateArtist();
  const [step, setStep] = useState<"name" | "team" | "artists">("name");
  const [fullName, setFullName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Artist search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyArtist[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [addedArtists, setAddedArtists] = useState<AddedArtist[]>([]);
  const [addedSpotifyIds, setAddedSpotifyIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Spotify search
  useEffect(() => {
    if (step !== "artists") return;
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
  }, [searchQuery, step]);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", user!.id);
      if (error) throw error;
      setStep("team");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setLoading(true);
    try {
      const team = await createTeam.mutateAsync(teamName.trim());
      setTeamId(team.id);
      setStep("artists");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSpotify = async (artist: SpotifyArtist) => {
    if (!teamId) return;
    setAddingIds((prev) => new Set(prev).add(artist.id));
    try {
      await createArtist.mutateAsync({
        team_id: teamId,
        name: artist.name,
        avatar_url: artist.images?.[0]?.url || null,
        spotify_id: artist.id,
        genres: artist.genres,
      });
      setAddedSpotifyIds((prev) => new Set(prev).add(artist.id));
      setAddedArtists((prev) => [...prev, {
        name: artist.name,
        avatar_url: artist.images?.[0]?.url,
        spotify_id: artist.id,
      }]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(artist.id);
        return next;
      });
    }
  };

  const handleCreateManual = async (name: string) => {
    if (!teamId) return;
    setLoading(true);
    try {
      await createArtist.mutateAsync({ team_id: teamId, name });
      setAddedArtists((prev) => [...prev, { name }]);
      setSearchQuery("");
      setSearchResults([]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    toast.success("You're all set!");
    navigate("/roster", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <motion.div
        className="w-full max-w-sm px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        key={step}
      >
        <img
          src={rolloutLogo}
          alt="Rollout"
          className="h-7 mb-1"
        />

        {step === "name" ? (
          <form onSubmit={handleNameSubmit} className="mt-8 flex flex-col gap-4">
            <div>
              <p className="text-lg font-semibold text-foreground">What's your name?</p>
              <p className="text-sm text-muted-foreground mt-1">We'll use this across the app.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                required
                autoFocus
              />
            </div>
            <Button type="submit" disabled={loading || !fullName.trim()}>
              {loading ? "Saving..." : "Continue"}
            </Button>
          </form>
        ) : step === "team" ? (
          <form onSubmit={handleTeamSubmit} className="mt-8 flex flex-col gap-4">
            <div>
              <p className="text-lg font-semibold text-foreground">Name your team</p>
              <p className="text-sm text-muted-foreground mt-1">
                This is where you'll manage your artists.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. My Label"
                required
                autoFocus
              />
            </div>
            <Button type="submit" disabled={loading || !teamName.trim()}>
              {loading ? "Creating..." : "Continue"}
            </Button>
          </form>
        ) : (
          <div className="mt-8 flex flex-col gap-4">
            <div>
              <p className="text-lg font-semibold text-foreground">Add your artists</p>
              <p className="text-sm text-muted-foreground mt-1">
                Search Spotify or create them manually. You can always add more later.
              </p>
            </div>

            {/* Added artists chips */}
            {addedArtists.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {addedArtists.map((a, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm">
                    <Check className="h-3 w-3 text-[hsl(var(--success))]" />
                    {a.name}
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
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

            {/* Results */}
            <div className="min-h-[200px] max-h-[300px] overflow-y-auto flex flex-col">
              {searching ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {searchResults.map((result) => {
                    const inRoster = addedSpotifyIds.has(result.id);
                    const adding = addingIds.has(result.id);
                    return (
                      <div key={result.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={result.images?.[0]?.url} />
                          <AvatarFallback>{result.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{result.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {result.genres.slice(0, 2).join(", ") || "No genres"}
                          </p>
                        </div>
                        {inRoster ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Check className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> Added
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleAddSpotify(result)} disabled={adding}>
                            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : searchQuery.trim().length >= 2 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <p className="text-sm text-muted-foreground">No results found</p>
                  <Button size="sm" onClick={() => handleCreateManual(searchQuery.trim())} disabled={loading}>
                    {loading ? "Creating..." : `Create "${searchQuery.trim()}" manually`}
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8">
                  <User className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground text-center">
                    Search Spotify to find artists
                  </p>
                </div>
              )}
            </div>

            {/* Finish */}
            <Button onClick={handleFinish}>
              {addedArtists.length > 0 ? "Get Started" : "Skip for now"}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
