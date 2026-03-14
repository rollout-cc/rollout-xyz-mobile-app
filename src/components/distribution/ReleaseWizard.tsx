import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, X, ChevronLeft } from "lucide-react";
import { useCreateRelease, useUpdateRelease, useRelease, useReleaseTracks, useReleasePlatforms } from "@/hooks/useReleases";
import { StepTracks } from "./StepTracks";
import { StepDetails } from "./StepDetails";
import { StepPlatforms } from "./StepPlatforms";
import { StepRightsRegistration } from "./StepRightsRegistration";
import { StepSplitApproval } from "./StepSplitApproval";
import { StepReview } from "./StepReview";
import { PLATFORM_LIST } from "./PlatformLogos";
import { toast } from "sonner";

const STEPS = [
  { label: "Tracks", key: "tracks" },
  { label: "Details", key: "details" },
  { label: "Partners", key: "partners" },
  { label: "Rights", key: "rights" },
  { label: "Approvals", key: "approvals" },
  { label: "Review", key: "review" },
] as const;

export interface ReleaseFormData {
  artist_id: string;
  name: string;
  release_type: string;
  release_date: string;
  artwork_url: string;
  genre: string;
  secondary_genre: string;
  record_label: string;
  upc_code: string;
  split_project_id: string;
  pro_registration_status: string;
  mlc_registration_status: string;
  tracks: {
    title: string;
    isrc_code: string;
    sort_order: number;
    is_explicit: boolean;
    song_id?: string;
    audio_url?: string;
  }[];
  platforms: { platform: string; enabled: boolean }[];
}

interface Props {
  teamId: string;
  artists: any[];
  releaseId?: string;
  onClose: () => void;
}

const DEFAULT_PLATFORMS = PLATFORM_LIST.map((p) => p.name);

export function ReleaseWizard({ teamId, artists, releaseId, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [releaseDbId, setReleaseDbId] = useState<string | undefined>(releaseId);
  const [form, setForm] = useState<ReleaseFormData>({
    artist_id: "",
    name: "",
    release_type: "single",
    release_date: "",
    artwork_url: "",
    genre: "",
    secondary_genre: "",
    record_label: "",
    upc_code: "",
    split_project_id: "",
    pro_registration_status: "not_started",
    mlc_registration_status: "not_started",
    tracks: [{ title: "", isrc_code: "", sort_order: 0, is_explicit: false }],
    platforms: DEFAULT_PLATFORMS.map((p) => ({ platform: p, enabled: true })),
  });

  const createRelease = useCreateRelease();
  const updateRelease = useUpdateRelease();
  const { data: existingRelease } = useRelease(releaseId);
  const { data: existingTracks } = useReleaseTracks(releaseId);
  const { data: existingPlatforms } = useReleasePlatforms(releaseId);

  // Load existing release data
  useEffect(() => {
    if (existingRelease) {
      setForm((prev) => ({
        ...prev,
        artist_id: existingRelease.artist_id,
        name: existingRelease.name,
        release_type: existingRelease.release_type,
        release_date: existingRelease.release_date || "",
        artwork_url: existingRelease.artwork_url || "",
        genre: existingRelease.genre || "",
        secondary_genre: existingRelease.secondary_genre || "",
        record_label: existingRelease.record_label || "",
        upc_code: existingRelease.upc_code || "",
        split_project_id: existingRelease.split_project_id || "",
        pro_registration_status: existingRelease.pro_registration_status,
        mlc_registration_status: existingRelease.mlc_registration_status,
      }));
    }
  }, [existingRelease]);

  useEffect(() => {
    if (existingTracks && existingTracks.length > 0) {
      setForm((prev) => ({
        ...prev,
        tracks: existingTracks.map((t: any) => ({
          title: t.title,
          isrc_code: t.isrc_code || "",
          sort_order: t.sort_order,
          is_explicit: t.is_explicit,
          song_id: t.song_id || undefined,
          audio_url: t.audio_url || undefined,
        })),
      }));
    }
  }, [existingTracks]);

  useEffect(() => {
    if (existingPlatforms && existingPlatforms.length > 0) {
      setForm((prev) => ({
        ...prev,
        platforms: DEFAULT_PLATFORMS.map((p) => {
          const existing = existingPlatforms.find((ep: any) => ep.platform === p);
          return { platform: p, enabled: existing ? existing.enabled : true };
        }),
      }));
    }
  }, [existingPlatforms]);

  const updateForm = (patch: Partial<ReleaseFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = async (markReady = false) => {
    try {
      const status = markReady ? "ready" : "draft";
      if (releaseDbId) {
        await updateRelease.mutateAsync({
          id: releaseDbId,
          name: form.name,
          release_type: form.release_type,
          release_date: form.release_date || null,
          artwork_url: form.artwork_url || null,
          genre: form.genre || null,
          secondary_genre: form.secondary_genre || null,
          record_label: form.record_label || null,
          upc_code: form.upc_code || null,
          split_project_id: form.split_project_id || null,
          pro_registration_status: form.pro_registration_status,
          mlc_registration_status: form.mlc_registration_status,
          status,
        });
      } else {
        const release = await createRelease.mutateAsync({
          team_id: teamId,
          artist_id: form.artist_id,
          name: form.name || "Untitled Release",
          release_type: form.release_type,
        });
        setReleaseDbId(release.id);
      }
      toast.success(markReady ? "Release marked as ready!" : "Draft saved");
      if (markReady) onClose();
    } catch {
      toast.error("Failed to save release");
    }
  };

  const stepValid = (s: number): boolean | null => {
    switch (s) {
      case 0: return form.artist_id && form.tracks.some((t) => t.title.trim()) ? true : null;
      case 1: return form.name.trim() ? true : null;
      case 2: return form.platforms.some((p) => p.enabled) ? true : null;
      case 3: return null;
      case 4: return null;
      case 5: return null;
      default: return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-foreground">{releaseId ? "Edit Release" : "New Release"}</h2>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const valid = stepValid(i);
          const isCurrent = i === step;
          const isPast = i < step;
          return (
            <button
              key={s.key}
              onClick={() => setStep(i)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex-1 justify-center",
                isCurrent && "bg-primary text-primary-foreground",
                !isCurrent && isPast && "bg-muted text-foreground",
                !isCurrent && !isPast && "bg-muted/50 text-muted-foreground"
              )}
            >
              <span className={cn(
                "flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold shrink-0",
                isCurrent && "bg-primary-foreground text-primary",
                !isCurrent && valid === true && "bg-primary/20 text-primary",
                !isCurrent && valid === false && "bg-destructive/20 text-destructive",
                !isCurrent && valid === null && "bg-background text-muted-foreground"
              )}>
                {valid === true && !isCurrent ? <Check className="h-3 w-3" /> : 
                 valid === false && !isCurrent ? <X className="h-3 w-3" /> : 
                 i + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">
        {step === 0 && (
          <StepTracks
            form={form}
            updateForm={updateForm}
            artists={artists}
            teamId={teamId}
          />
        )}
        {step === 1 && (
          <StepDetails form={form} updateForm={updateForm} teamId={teamId} />
        )}
        {step === 2 && (
          <StepPlatforms form={form} updateForm={updateForm} />
        )}
        {step === 3 && (
          <StepRightsRegistration
            form={form}
            updateForm={updateForm}
            teamId={teamId}
          />
        )}
        {step === 4 && (
          <StepSplitApproval form={form} updateForm={updateForm} teamId={teamId} />
        )}
        {step === 5 && (
          <StepReview
            form={form}
            artists={artists}
            onSaveDraft={() => handleSave(false)}
            onMarkReady={() => handleSave(true)}
            saving={createRelease.isPending || updateRelease.isPending}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-border">
        <Button
          variant="ghost"
          onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
        >
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        <div className="flex gap-2">
          {step < 5 && (
            <Button onClick={() => setStep(step + 1)}>
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
