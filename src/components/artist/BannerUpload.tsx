import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Upload, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const RECOMMENDED_WIDTH = 2660;
const RECOMMENDED_HEIGHT = 1140;
const MIN_WIDTH = 1200;
const MIN_HEIGHT = 400;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ASPECT_RATIO = RECOMMENDED_WIDTH / RECOMMENDED_HEIGHT; // ~2.33

interface BannerUploadProps {
  artistId: string;
  currentBannerUrl?: string | null;
}

export function BannerUpload({ artistId, currentBannerUrl }: BannerUploadProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const upload = useMutation({
    mutationFn: async (f: File) => {
      const ext = f.name.split(".").pop();
      const path = `banners/${artistId}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("artist-assets")
        .upload(path, f, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("artist-assets")
        .getPublicUrl(path);

      const { error: updateErr } = await supabase
        .from("artists")
        .update({ banner_url: urlData.publicUrl })
        .eq("id", artistId);
      if (updateErr) throw updateErr;

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist", artistId] });
      toast.success("Banner uploaded!");
      reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeBanner = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("artists")
        .update({ banner_url: null })
        .eq("id", artistId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist", artistId] });
      toast.success("Banner removed");
      reset();
    },
  });

  const reset = () => {
    setOpen(false);
    setPreview(null);
    setFile(null);
    setError(null);
  };

  const validateAndSetFile = (f: File) => {
    setError(null);

    if (!f.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, or WebP).");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("File is too large. Maximum size is 10MB.");
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) {
        setError(`Image too small. Minimum size is ${MIN_WIDTH}×${MIN_HEIGHT}px. Yours is ${img.width}×${img.height}px.`);
        URL.revokeObjectURL(url);
        return;
      }
      setFile(f);
      setPreview(url);
    };
    img.onerror = () => {
      setError("Could not read image file.");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-white/80 hover:text-white hover:bg-white/10"
        onClick={() => setOpen(true)}
      >
        <Upload className="h-3.5 w-3.5" /> Change Banner
      </Button>

      <Dialog open={open} onOpenChange={(v) => !v && reset()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Banner Image</DialogTitle>
            <DialogDescription>
              Recommended size: <strong>{RECOMMENDED_WIDTH}×{RECOMMENDED_HEIGHT}px</strong> (landscape ~2.3:1 ratio).
              Minimum: {MIN_WIDTH}×{MIN_HEIGHT}px. Max file size: 10MB. JPG, PNG, or WebP.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {preview ? (
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full object-cover"
                  style={{ aspectRatio: `${ASPECT_RATIO}` }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white h-7 w-7"
                  onClick={() => { setPreview(null); setFile(null); setError(null); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                style={{ aspectRatio: `${ASPECT_RATIO}` }}
              >
                <ImageIcon className="h-10 w-10" />
                <span className="text-sm font-medium">Click to select an image</span>
                <span className="text-xs">{RECOMMENDED_WIDTH}×{RECOMMENDED_HEIGHT}px recommended</span>
              </button>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) validateAndSetFile(f);
                e.target.value = "";
              }}
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {currentBannerUrl && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => removeBanner.mutate()}
                disabled={removeBanner.isPending}
              >
                Remove Current Banner
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={reset}>Cancel</Button>
            <Button
              disabled={!file || upload.isPending}
              onClick={() => file && upload.mutate(file)}
            >
              {upload.isPending ? "Uploading..." : "Upload Banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
