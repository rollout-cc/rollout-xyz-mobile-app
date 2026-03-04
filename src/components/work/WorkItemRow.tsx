import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { ChevronDown, ChevronRight, Trash2, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, isPast, isYesterday } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface TaskArtist {
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface TaskInitiative {
  name: string;
}

export interface WorkItemData {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  is_completed: boolean;
  expense_amount?: number | null;
  artists?: TaskArtist | null;
  initiatives?: TaskInitiative | null;
}

interface WorkItemRowProps {
  task: WorkItemData;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
  onDescriptionChange?: (description: string) => void;
  onNavigateToArtist?: (artistId: string) => void;
  /** Whether to show the artist avatar and name (hidden when already in artist context) */
  showArtist?: boolean;
}

function formatDue(date: string) {
  const d = new Date(date + "T00:00:00");
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

function isDueOverdue(date: string) {
  const d = new Date(date + "T00:00:00");
  return isPast(d) && !isToday(d);
}

export const WorkItemRow = React.memo(function WorkItemRow({
  task,
  isExpanded,
  onToggleExpand,
  onToggleComplete,
  onDelete,
  onDescriptionChange,
  onNavigateToArtist,
  showArtist = true,
}: WorkItemRowProps) {
  return (
    <li className="py-1">
      <div className="flex items-center gap-2.5 py-1.5 group">
        <Checkbox
          checked={task.is_completed}
          onCheckedChange={() => onToggleComplete()}
          className="shrink-0"
        />
        <button
          onClick={onToggleExpand}
          className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={onToggleExpand}
        >
          <p className={cn("text-sm text-foreground leading-snug", task.is_completed && "line-through text-muted-foreground")}>
            {task.title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-xs text-muted-foreground">
            {showArtist && task.artists && (
              <button
                onClick={(e) => { e.stopPropagation(); onNavigateToArtist?.(task.artists!.id); }}
                className="hover:text-foreground transition-colors"
              >
                {task.artists.name}
              </button>
            )}
            {task.initiatives && (
              <span>{showArtist && task.artists ? "· " : ""}{task.initiatives.name}</span>
            )}
            {task.due_date && (
              <span className={isDueOverdue(task.due_date) ? "text-destructive" : ""}>
                {(showArtist && task.artists) || task.initiatives ? "· " : ""}{formatDue(task.due_date)}
              </span>
            )}
            {task.expense_amount != null && task.expense_amount > 0 && (
              <span>· ${task.expense_amount.toLocaleString()}</span>
            )}
          </div>
        </div>
        {showArtist && task.artists && (
          <Avatar
            className="h-6 w-6 shrink-0 cursor-pointer"
            onClick={() => onNavigateToArtist?.(task.artists!.id)}
          >
            {task.artists.avatar_url && <AvatarImage src={task.artists.avatar_url} alt={task.artists.name} />}
            <AvatarFallback className="text-[9px] font-bold bg-muted">{task.artists.name?.[0]}</AvatarFallback>
          </Avatar>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isExpanded && (
        <div className="ml-[52px] pb-2">
          <RichTextEditor
            value={task.description || ""}
            onBlur={(val) => onDescriptionChange?.(val)}
            placeholder="Add notes…"
            className="min-h-[80px] text-sm"
          />
        </div>
      )}
    </li>
  );
});
