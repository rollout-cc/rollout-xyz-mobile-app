import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Headphones, FolderOpen, CheckCircle2 } from "lucide-react";

interface ArtistCardProps {
  artist: any;
  onClick: () => void;
}

function formatListeners(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

export function ArtistCard({ artist, onClick }: ArtistCardProps) {
  const initiativeCount = artist.initiatives?.[0]?.count ?? 0;
  const taskCount = artist.tasks?.[0]?.count ?? 0;
  const listeners = artist.monthly_listeners ?? 0;

  return (
    <div
      onClick={onClick}
      className="relative flex flex-col rounded-xl overflow-hidden cursor-pointer group border border-border bg-card shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {artist.avatar_url ? (
          <img
            src={artist.avatar_url}
            alt={artist.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-accent">
            <span className="text-4xl font-bold text-muted-foreground/40">
              {artist.name[0]}
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-base font-semibold text-white drop-shadow-md truncate">
            {artist.name}
          </h3>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 px-3 py-2.5 text-xs text-muted-foreground">
        {listeners > 0 && (
          <span className="flex items-center gap-1">
            <Headphones className="h-3 w-3" />
            {formatListeners(listeners)}
          </span>
        )}
        <span className="flex items-center gap-1">
          <FolderOpen className="h-3 w-3" />
          {initiativeCount}
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {taskCount}
        </span>
      </div>
    </div>
  );
}
