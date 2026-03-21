import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Upload, Loader2, Mic } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TaskReviewList, type ExtractedTask } from "./TaskReviewList";
import { cn } from "@/lib/utils";

const SOURCES = [
  { key: "otter", label: "Otter", instruction: "Open conversation → Share → Copy transcript" },
  { key: "zoom", label: "Zoom", instruction: "Go to zoom.us → Recordings → open meeting → copy transcript or download .vtt" },
  { key: "google_meet", label: "Google Meet", instruction: "Open the meeting notes doc in Google Docs → Select All → Copy" },
  { key: "granola", label: "Granola", instruction: "Open meeting in Granola → transcript tab → Select All → Copy" },
  { key: "manual", label: "Manual", instruction: "Paste any meeting transcript or notes" },
] as const;

type Source = typeof SOURCES[number]["key"];

function parseVttSrt(raw: string): string {
  return raw
    .replace(/WEBVTT[\s\S]*?\n\n/, "")
    .replace(/\d+\n/g, "")
    .replace(/[\d:.,\-\s>]+-->/g, "")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" ");
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistId: string;
  teamId: string;
}

export function ImportTranscriptDialog({ open, onOpenChange, artistId, teamId }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [source, setSource] = useState<Source>("manual");
  const [text, setText] = useState("");
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [memberContext, setMemberContext] = useState<{ id: string; full_name: string }[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep(1);
    setSource("manual");
    setText("");
    setExtractedTasks([]);
    setMemberContext([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let content = reader.result as string;
      if (file.name.endsWith(".vtt") || file.name.endsWith(".srt")) {
        content = parseVttSrt(content);
      }
      setText(content);
    };
    reader.readAsText(file);
  };

  const handleExtract = async () => {
    if (!text.trim()) {
      toast.error("Please paste or upload a transcript first");
      return;
    }
    setIsExtracting(true);
    setStep(2);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-meeting-tasks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ transcript: text, source, artist_id: artistId, team_id: teamId }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Extraction failed" }));
        throw new Error(err.error || "Extraction failed");
      }

      const data = await resp.json();
      setExtractedTasks((data.tasks ?? []).map((t: any, i: number) => ({ ...t, selected: true, id: `et-${i}` })));
      setMemberContext(data.member_context ?? []);
      setStep(3);
    } catch (e: any) {
      toast.error(e.message || "Failed to extract tasks");
      setStep(1);
    } finally {
      setIsExtracting(false);
    }
  };

  const sourceInfo = SOURCES.find((s) => s.key === source)!;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-primary" />
            Import Transcript
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Paste or upload a meeting transcript to extract tasks."}
            {step === 2 && "Analyzing your transcript…"}
            {step === 3 && `${extractedTasks.filter((t) => t.selected).length} tasks found — review and create.`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {SOURCES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSource(s.key)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                    source === s.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:bg-accent"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{sourceInfo.instruction}</p>
            </div>

            <Textarea
              placeholder="Paste your transcript here…"
              className="min-h-[160px] text-sm"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.vtt,.srt"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Upload file
              </Button>
              <span className="text-xs text-muted-foreground">.txt, .vtt, .srt</span>
            </div>

            <Button className="w-full" onClick={handleExtract} disabled={!text.trim()}>
              <FileText className="h-4 w-4 mr-2" />
              Extract Tasks
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Extracting tasks from transcript…</p>
          </div>
        )}

        {step === 3 && (
          <TaskReviewList
            tasks={extractedTasks}
            setTasks={setExtractedTasks}
            artistId={artistId}
            teamId={teamId}
            memberContext={memberContext}
            onDone={() => { reset(); onOpenChange(false); }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
