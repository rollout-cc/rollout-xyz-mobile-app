import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, User, Loader2, Check, ArrowLeft } from "lucide-react";
import { useCreateProspect } from "@/hooks/useProspects";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images: { url: string }[];
  followers?: { total: number };
}

interface NewProspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string | undefined;
}

export function NewProspectDialog({ open, onOpenChange, teamId }: NewProspectDialogProps) {
  const create = useCreateProspect();
  const [step, setStep] = useState<"search" | "form">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyArtist[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [form, setForm] = useState({
    artist_name: "",
    primary_genre: "",
    city: "",
    spotify_uri: "",
    instagram: "",
    tiktok: "",
    youtube: "",
    notes: "",
    stage: "contacted",
    priority: "medium",
    monthly_listeners: undefined as number | undefined,
  });

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep("search");
      setSearchQuery("");
      setSearchResults([]);
      setForm({
        artist_name: "", primary_genre: "", city: "", spotify_uri: "",
        instagram: "", tiktok: "", youtube: "", notes: "", stage: "contacted",
        priority: "medium", monthly_listeners: undefined,
      });
    }
  }, [open]);

  // Debounced Spotify search
  useEffect(() => {
    if (step !== "search" || !searchQuery.trim() || searchQuery.trim().length < 2) {
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

  const selectSpotifyArtist = (artist: SpotifyArtist) => {
    setForm((prev) => ({
      ...prev,
      artist_name: artist.name,
      primary_genre: artist.genres?.[0] || "",
      spotify_uri: `spotify:artist:${artist.id}`,
      monthly_listeners: artist.followers?.total,
    }));
    setStep("form");
  };

  const startManual = (name?: string) => {
    setForm((prev) => ({ ...prev, artist_name: name || searchQuery.trim() }));
    setStep("form");
  };

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.artist_name.trim() || !teamId) return;
    try {
      await create.mutateAsync({
        team_id: teamId,
        artist_name: form.artist_name.trim(),
        primary_genre: form.primary_genre || undefined,
        city: form.city || undefined,
        spotify_uri: form.spotify_uri || undefined,
        instagram: form.instagram || undefined,
        tiktok: form.tiktok || undefined,
        youtube: form.youtube || undefined,
        notes: form.notes || undefined,
        stage: form.stage,
        priority: form.priority,
        monthly_listeners: form.monthly_listeners,
      });
      toast.success("Prospect added!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "form" && (
              <button onClick={() => setStep("search")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mr-2">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            New Prospect
          </DialogTitle>
          <DialogDescription>
            {step === "search" ? "Search Spotify to find and add an artist prospect." : "Fill in details for the new prospect."}
          </DialogDescription>
        </DialogHeader>

        {step === "search" ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for an artist on Spotify"
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
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => selectSpotifyArtist(result)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left w-full"
                    >
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
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                    <User className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery.trim().length > 0 ? "No results found" : "Search Spotify to find artists"}
                  </p>
                  {searchQuery.trim().length > 0 && (
                    <>
                      <p className="text-sm text-muted-foreground">or</p>
                      <Button variant="outline" onClick={() => startManual()}>
                        Add "{searchQuery.trim()}" manually
                      </Button>
                    </>
                  )}
                  {!searchQuery.trim() && (
                    <Button variant="outline" onClick={() => startManual("")}>
                      Add manually without Spotify
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <Label>Artist Name *</Label>
                <Input value={form.artist_name} onChange={(e) => set("artist_name", e.target.value)} placeholder="Artist name" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Genre</Label>
                  <Input value={form.primary_genre} readOnly className="bg-muted" placeholder="Auto-filled from Spotify" />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Atlanta" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Instagram</Label>
                  <Input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@handle" />
                </div>
                <div>
                  <Label>TikTok</Label>
                  <Input value={form.tiktok} onChange={(e) => set("tiktok", e.target.value)} placeholder="@handle" />
                </div>
                <div>
                  <Label>YouTube</Label>
                  <Input value={form.youtube} onChange={(e) => set("youtube", e.target.value)} placeholder="Channel" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Stage</Label>
                  <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["contacted", "offer_sent", "negotiating", "signed"].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <RichTextEditor value={form.notes} onChange={(v) => set("notes", v)} placeholder="Initial notes..." />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={create.isPending || !form.artist_name.trim()}>
                Add Prospect
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
