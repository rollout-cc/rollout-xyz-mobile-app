import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const stageLabel = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const priorityBadge = (p: string) => {
  if (p === "high") return "destructive" as const;
  if (p === "medium") return "secondary" as const;
  return "outline" as const;
};

interface ProspectTableProps {
  prospects: any[];
  onSelect: (id: string) => void;
}

export function ProspectTable({ prospects, onSelect }: ProspectTableProps) {
  if (prospects.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        No prospects yet. Add your first prospect to get started.
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Artist</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden sm:table-cell">Genre</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden md:table-cell">City</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Stage</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden sm:table-cell">Priority</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden lg:table-cell">Follow Up</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((p: any) => (
              <tr
                key={p.id}
                onClick={() => onSelect(p.id)}
                className="border-b border-border last:border-b-0 hover:bg-accent/30 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-medium">{p.artist_name}</td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{p.primary_genre || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.city || "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary" className="text-xs">{stageLabel(p.stage)}</Badge>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <Badge variant={priorityBadge(p.priority)} className="text-xs capitalize">{p.priority}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                  {p.next_follow_up ? new Date(p.next_follow_up).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
