import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ChevronRight, Plus, X, Check, Disc, Music, Album } from "lucide-react";
import { useSplitContributors, useUpsertSplitContributor } from "@/hooks/useSplits";
import { cn } from "@/lib/utils";

type ReleaseType = "single" | "ep" | "album";

interface ContributorEntry {
  name: string;
  contributorId?: string; // existing DB id
  role: "producer" | "writer" | "performer";
  pct?: string;
  songIndices: number[]; // which songs this person is on
}

interface SongData {
  title: string;
  contributors: ContributorEntry[];
}

interface Props {
  artistId: string;
  teamId: string;
  onComplete: (data: {
    releaseType: ReleaseType;
    releaseName: string;
    songs: { title: string; contributors: ContributorEntry[] }[];
  }) => void;
  onCancel: () => void;
}

const DEFAULT_COUNTS: Record<ReleaseType, number> = { single: 1, ep: 7, album: 12 };

export function SplitWizard({ artistId, teamId, onComplete, onCancel }: Props) {
  const [step, setStep] = useState(1);
  const [releaseType, setReleaseType] = useState<ReleaseType | null>(null);
  const [releaseName, setReleaseName] = useState("");
  const [titles, setTitles] = useState<string[]>([""]);
  const [songs, setSongs] = useState<SongData[]>([]);
  const [currentSongIdx, setCurrentSongIdx] = useState(0);

  const nameRef = useRef<HTMLInputElement>(null);
  const titleRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { data: existingContributors = [] } = useSplitContributors(teamId);

  // Step 1 → 2: auto-focus name
  useEffect(() => {
    if (step === 2) setTimeout(() => nameRef.current?.focus(), 50);
  }, [step]);

  // Step 3: auto-focus first title
  useEffect(() => {
    if (step === 3) setTimeout(() => titleRefs.current[0]?.focus(), 50);
  }, [step]);

  // ── Step 1: Release Type ──
  const handleTypeSelect = (type: ReleaseType) => {
    setReleaseType(type);
    setTitles(Array(DEFAULT_COUNTS[type]).fill(""));
    setStep(2);
  };

  // ── Step 2: Release Name ──
  const handleNameSubmit = () => {
    if (!releaseName.trim()) return;
    setStep(3);
  };

  // ── Step 3: Song Titles ──
  const handleTitleChange = (i: number, v: string) => {
    setTitles((prev) => prev.map((t, idx) => (idx === i ? v : t)));
  };

  const handleTitleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (i < titles.length - 1) {
        titleRefs.current[i + 1]?.focus();
      }
    }
  };

  const addTrack = () => {
    setTitles((prev) => [...prev, ""]);
    setTimeout(() => titleRefs.current[titles.length]?.focus(), 50);
  };

  const removeTrack = (i: number) => {
    if (titles.length <= 1) return;
    setTitles((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleTitlesContinue = () => {
    const filled = titles.map((t) => t.trim()).filter(Boolean);
    if (filled.length === 0) return;
    const songData = filled.map((t) => ({ title: t, contributors: [] }));
    setSongs(songData);
    setCurrentSongIdx(0);
    setStep(4);
  };

  // ── Step 4: Contributors ──
  const currentSong = songs[currentSongIdx];
  const allTitles = songs.map((s) => s.title);

  const addContributor = (role: "producer" | "writer" | "performer") => {
    setSongs((prev) =>
      prev.map((s, i) =>
        i === currentSongIdx
          ? {
              ...s,
              contributors: [
                ...s.contributors,
                { name: "", role, pct: "", songIndices: [currentSongIdx] },
              ],
            }
          : s
      )
    );
  };

  const updateContributor = (cIdx: number, patch: Partial<ContributorEntry>) => {
    setSongs((prev) =>
      prev.map((s, i) =>
        i === currentSongIdx
          ? {
              ...s,
              contributors: s.contributors.map((c, ci) =>
                ci === cIdx ? { ...c, ...patch } : c
              ),
            }
          : s
      )
    );
  };

  const removeContributor = (cIdx: number) => {
    setSongs((prev) =>
      prev.map((s, i) =>
        i === currentSongIdx
          ? { ...s, contributors: s.contributors.filter((_, ci) => ci !== cIdx) }
          : s
      )
    );
  };

  const toggleSongForContributor = (cIdx: number, songIdx: number) => {
    const c = currentSong.contributors[cIdx];
    const has = c.songIndices.includes(songIdx);
    const newIndices = has
      ? c.songIndices.filter((si) => si !== songIdx)
      : [...c.songIndices, songIdx];
    updateContributor(cIdx, { songIndices: newIndices });
  };

  const handleNextSong = () => {
    // carry over contributors that were checked for future songs
    if (currentSongIdx < songs.length - 1) {
      const nextIdx = currentSongIdx + 1;
      setSongs((prev) => {
        const updated = [...prev];
        // find contributors from current song that include nextIdx
        const carryOver = updated[currentSongIdx].contributors
          .filter((c) => c.name.trim() && c.songIndices.includes(nextIdx))
          .map((c) => ({
            ...c,
            songIndices: c.songIndices,
          }));

        // merge with existing (avoid duplicates by name+role)
        const existing = updated[nextIdx].contributors;
        const existingKeys = new Set(existing.map((e) => `${e.name}|${e.role}`));
        const toAdd = carryOver.filter(
          (c) => !existingKeys.has(`${c.name}|${c.role}`)
        );
        updated[nextIdx] = {
          ...updated[nextIdx],
          contributors: [...existing, ...toAdd],
        };
        return updated;
      });
      setCurrentSongIdx(nextIdx);
    } else {
      setStep(5);
    }
  };

  const handlePrevSong = () => {
    if (currentSongIdx > 0) setCurrentSongIdx(currentSongIdx - 1);
  };

  // ── Step 5: Review & Save ──
  const handleSave = () => {
    onComplete({
      releaseType: releaseType!,
      releaseName: releaseName.trim(),
      songs: songs.map((s) => ({
        title: s.title,
        contributors: s.contributors.filter((c) => c.name.trim()),
      })),
    });
  };

  // ── Autocomplete suggestions ──
  const getSuggestions = (query: string) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return existingContributors
      .filter((c: any) => c.name.toLowerCase().includes(q))
      .slice(0, 5);
  };

  // ── Completed steps breadcrumb ──
  const completedSteps = () => {
    const items: string[] = [];
    if (step > 1 && releaseType) items.push(releaseType.toUpperCase());
    if (step > 2 && releaseName) items.push(`"${releaseName.trim()}"`);
    if (step > 3) items.push(`${songs.length} track${songs.length !== 1 ? "s" : ""}`);
    return items;
  };

  return (
    <Card className="border-primary/20 overflow-hidden">
      {/* Progress bar */}
      <div className="flex gap-0.5 h-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={cn(
              "flex-1 transition-colors duration-300",
              s <= step ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      <div className="p-4 sm:p-6">
        {/* Breadcrumb */}
        {completedSteps().length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 flex-wrap">
            {completedSteps().map((item, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                <span className="bg-muted px-2 py-0.5 rounded-full">{item}</span>
              </span>
            ))}
          </div>
        )}

        {/* ── STEP 1: Release Type ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">What type of release?</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {([
                { type: "single" as ReleaseType, label: "Single", icon: Disc, sub: "1 track" },
                { type: "ep" as ReleaseType, label: "EP", icon: Music, sub: "Up to 7 tracks" },
                { type: "album" as ReleaseType, label: "Album", icon: Album, sub: "Up to 12+ tracks" },
              ]).map(({ type, label, icon: Icon, sub }) => (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-center group"
                >
                  <Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">{sub}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Release Name ── */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Name this release</h3>
            <Input
              ref={nameRef}
              value={releaseName}
              onChange={(e) => setReleaseName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSubmit();
              }}
              placeholder="e.g. Love Gun II"
              className="text-base h-11"
            />
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button size="sm" onClick={handleNameSubmit} disabled={!releaseName.trim()}>
                Continue <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Song Titles ── */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Add your tracks</h3>
            <p className="text-xs text-muted-foreground">Press Enter to jump to the next field. Empty titles will be removed.</p>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {titles.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                    {i + 1}.
                  </span>
                  <Input
                    ref={(el) => { titleRefs.current[i] = el; }}
                    value={t}
                    onChange={(e) => handleTitleChange(i, e.target.value)}
                    onKeyDown={(e) => handleTitleKeyDown(i, e)}
                    placeholder={`Track ${i + 1}`}
                    className="h-9 text-sm"
                  />
                  {titles.length > 1 && (
                    <button
                      onClick={() => removeTrack(i)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addTrack}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Add another track
            </button>
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleTitlesContinue}
                disabled={titles.every((t) => !t.trim())}
              >
                Continue <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Contributors ── */}
        {step === 4 && currentSong && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {currentSong.title}
              </h3>
              <span className="text-xs text-muted-foreground">
                Song {currentSongIdx + 1} of {songs.length}
              </span>
            </div>

            {(["producer", "writer", "performer"] as const).map((role) => {
              const roleContribs = currentSong.contributors.filter(
                (c) => c.role === role
              );
              return (
                <RoleSection
                  key={role}
                  role={role}
                  contributors={roleContribs}
                  allContributors={currentSong.contributors}
                  existingContributors={existingContributors}
                  allTitles={allTitles}
                  currentSongIdx={currentSongIdx}
                  onAdd={() => addContributor(role)}
                  onUpdate={(localIdx, patch) => {
                    // find global index
                    let count = 0;
                    const globalIdx = currentSong.contributors.findIndex((c, ci) => {
                      if (c.role === role) {
                        if (count === localIdx) return true;
                        count++;
                      }
                      return false;
                    });
                    if (globalIdx >= 0) updateContributor(globalIdx, patch);
                  }}
                  onRemove={(localIdx) => {
                    let count = 0;
                    const globalIdx = currentSong.contributors.findIndex((c) => {
                      if (c.role === role) {
                        if (count === localIdx) return true;
                        count++;
                      }
                      return false;
                    });
                    if (globalIdx >= 0) removeContributor(globalIdx);
                  }}
                  onToggleSong={(localIdx, songIdx) => {
                    let count = 0;
                    const globalIdx = currentSong.contributors.findIndex((c) => {
                      if (c.role === role) {
                        if (count === localIdx) return true;
                        count++;
                      }
                      return false;
                    });
                    if (globalIdx >= 0) toggleSongForContributor(globalIdx, songIdx);
                  }}
                />
              );
            })}

            <div className="flex justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (currentSongIdx === 0) setStep(3);
                  else handlePrevSong();
                }}
              >
                Back
              </Button>
              <Button size="sm" onClick={handleNextSong}>
                {currentSongIdx < songs.length - 1 ? (
                  <>Next Song <ChevronRight className="h-3.5 w-3.5" /></>
                ) : (
                  <>Review <ChevronRight className="h-3.5 w-3.5" /></>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Review ── */}
        {step === 5 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Review your split sheet</h3>
            <div className="text-xs text-muted-foreground">
              {releaseType?.toUpperCase()} · "{releaseName.trim()}" · {songs.length} track{songs.length !== 1 ? "s" : ""}
            </div>
            <div className="space-y-3 max-h-[40vh] overflow-y-auto">
              {songs.map((song, si) => (
                <div key={si} className="border border-border rounded-lg p-3 space-y-1.5">
                  <div className="text-sm font-medium">{si + 1}. {song.title}</div>
                  {song.contributors.filter((c) => c.name.trim()).length === 0 ? (
                    <div className="text-xs text-muted-foreground italic">No contributors added</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {song.contributors
                        .filter((c) => c.name.trim())
                        .map((c, ci) => (
                          <span
                            key={ci}
                            className="text-xs bg-muted px-2 py-0.5 rounded-full"
                          >
                            {c.name} · {c.role}
                            {c.pct ? ` · ${c.pct}%` : ""}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => { setStep(4); setCurrentSongIdx(songs.length - 1); }}>
                Back
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-3.5 w-3.5" /> Create Split Sheet
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Role Section sub-component ──
function RoleSection({
  role,
  contributors,
  allContributors,
  existingContributors,
  allTitles,
  currentSongIdx,
  onAdd,
  onUpdate,
  onRemove,
  onToggleSong,
}: {
  role: string;
  contributors: ContributorEntry[];
  allContributors: ContributorEntry[];
  existingContributors: any[];
  allTitles: string[];
  currentSongIdx: number;
  onAdd: () => void;
  onUpdate: (localIdx: number, patch: Partial<ContributorEntry>) => void;
  onRemove: (localIdx: number) => void;
  onToggleSong: (localIdx: number, songIdx: number) => void;
}) {
  const label = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}s
      </div>
      {contributors.map((c, localIdx) => (
        <ContributorRow
          key={localIdx}
          entry={c}
          existingContributors={existingContributors}
          allTitles={allTitles}
          currentSongIdx={currentSongIdx}
          showMultiTrack={allTitles.length > 1}
          onUpdate={(patch) => onUpdate(localIdx, patch)}
          onRemove={() => onRemove(localIdx)}
          onToggleSong={(songIdx) => onToggleSong(localIdx, songIdx)}
        />
      ))}
      <button
        onClick={onAdd}
        className="text-xs text-primary hover:underline flex items-center gap-1"
      >
        <Plus className="h-3 w-3" /> Add {label.toLowerCase()}
      </button>
    </div>
  );
}

// ── Contributor Row with autocomplete ──
function ContributorRow({
  entry,
  existingContributors,
  allTitles,
  currentSongIdx,
  showMultiTrack,
  onUpdate,
  onRemove,
  onToggleSong,
}: {
  entry: ContributorEntry;
  existingContributors: any[];
  allTitles: string[];
  currentSongIdx: number;
  showMultiTrack: boolean;
  onUpdate: (patch: Partial<ContributorEntry>) => void;
  onRemove: () => void;
  onToggleSong: (songIdx: number) => void;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    if (!entry.name.trim()) return [];
    const q = entry.name.toLowerCase();
    return existingContributors
      .filter((c: any) => c.name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [entry.name, existingContributors]);

  const selectSuggestion = (name: string, id: string) => {
    onUpdate({ name, contributorId: id });
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={entry.name}
            onChange={(e) => {
              onUpdate({ name: e.target.value, contributorId: undefined });
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Name..."
            className="h-8 text-sm"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md overflow-hidden">
              {suggestions.map((s: any) => (
                <button
                  key={s.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectSuggestion(s.name, s.id);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                >
                  {s.name}
                  {s.pro_affiliation && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {s.pro_affiliation}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <Input
          value={entry.pct ?? ""}
          onChange={(e) => onUpdate({ pct: e.target.value.replace(/[^0-9.]/g, "") })}
          placeholder="%"
          className="h-8 text-sm w-16 text-center"
        />
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Multi-track checkboxes */}
      {showMultiTrack && entry.name.trim() && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 pl-1">
          {allTitles.map((title, songIdx) => (
            <label
              key={songIdx}
              className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"
            >
              <Checkbox
                checked={entry.songIndices.includes(songIdx)}
                onCheckedChange={() => onToggleSong(songIdx)}
                className="h-3.5 w-3.5"
              />
              {title || `Track ${songIdx + 1}`}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
