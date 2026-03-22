import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface AvatarUploadProps {
  artistId: string;
  artistName: string;
  currentAvatarUrl?: string | null;
  className?: string;
}

export function AvatarUpload({ artistId, artistName, currentAvatarUrl, className = "" }: AvatarUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const upload = useMutation({
    mutationFn: async (f: File) => {
      const ext = f.name.split(".").pop();
      const path = `avatars/${artistId}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("artist-assets")
        .upload(path, f, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("artist-assets")
        .getPublicUrl(path);

      const { error: updateErr } = await supabase
        .from("artists")
        .update({ avatar_url: `${urlData.publicUrl}?t=${Date.now()}` })
        .eq("id", artistId);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist", artistId] });
      queryClient.invalidateQueries({ queryKey: ["artists"] });
      toast.success("Photo updated!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error("File is too large. Maximum size is 5MB.");
      return;
    }
    upload.mutate(f);
  };

  return (
    <div className={`group/avatar relative shrink-0 ${className}`}>
      <Avatar className="h-14 w-14 border-2 border-white/25 shadow-[0_8px_28px_-6px_rgba(0,0,0,0.6)] ring-2 ring-black/20 sm:h-[4.25rem] sm:w-[4.25rem] md:h-[4.5rem] md:w-[4.5rem]">
        <AvatarImage src={currentAvatarUrl ?? undefined} className="object-cover" />
        <AvatarFallback className="bg-white/10 text-lg font-semibold text-white sm:text-2xl">
          {artistName[0]}
        </AvatarFallback>
      </Avatar>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={upload.isPending}
        className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover/avatar:opacity-100 cursor-pointer"
        aria-label="Upload artist photo"
      >
        {upload.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        ) : (
          <Camera className="h-5 w-5 text-white" />
        )}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
