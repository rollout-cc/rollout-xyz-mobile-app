import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, Clock } from "lucide-react";

interface ArtistCardProps {
  artist: any;
  onClick: () => void;
}

export function ArtistCard({ artist, onClick }: ArtistCardProps) {
  const initiativeCount = artist.initiatives?.[0]?.count ?? 0;
  const taskCount = artist.tasks?.[0]?.count ?? 0;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors cursor-pointer"
    >
      <Avatar className="h-14 w-14">
        <AvatarImage src={artist.avatar_url} alt={artist.name} />
        <AvatarFallback className="text-lg">{artist.name[0]}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate">{artist.name}</h3>
        <p className="text-sm text-muted-foreground">
          {initiativeCount} initiative{initiativeCount !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
          <span className="text-muted-foreground">Open Tasks</span>
          <span className="font-medium">{taskCount || "None"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
          <span className="text-muted-foreground">Upcoming Deadline</span>
          <span className="font-medium">None</span>
        </div>
      </div>
    </div>
  );
}
