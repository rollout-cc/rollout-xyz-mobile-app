import React, { useState, useRef, useCallback, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, isPast, isYesterday } from "date-fns";
import { CalendarDays, Trash2, Music2, Tag, DollarSign } from "lucide-react";

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
  showArtist?: boolean;
}

function formatDue(date: string) {
  const d = new Date(date + "T00:00:00");
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

/* ── Circle Checkbox (Things 3 style) ── */

function CircleCheck({
  checked,
  completing,
  onCheck,
}: {
  checked: boolean;
  completing: boolean;
  onCheck: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onCheck();
      }}
      className="group/check relative shrink-0 mt-[3px] outline-none"
      aria-label={checked ? "Mark incomplete" : "Mark complete"}
    >
      <div
        className={cn(
          "h-[20px] w-[20px] rounded-full border-[1.5px] transition-all duration-300 ease-out flex items-center justify-center",
          checked || completing
            ? "border-primary bg-primary scale-100"
            : "border-muted-foreground/25 group-hover/check:border-primary/60 group-hover/check:bg-primary/5"
        )}
      >
        <svg
          className={cn(
            "h-2.5 w-2.5 transition-all duration-200 ease-out",
            checked || completing
              ? "text-primary-foreground opacity-100 scale-100"
              : "text-transparent opacity-0 scale-50"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </button>
  );
}

/* ── Due Date Pill (color-coded) ── */

function DueDatePill({ date }: { date: string }) {
  const d = new Date(date + "T00:00:00");
  const overdue = isPast(d) && !isToday(d);
  const today = isToday(d);
  const tomorrow = isTomorrow(d);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium leading-none px-1.5 py-[3px] rounded-full",
        overdue && "bg-destructive/10 text-destructive",
        today && "bg-primary/10 text-primary",
        tomorrow && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        !overdue && !today && !tomorrow && "bg-muted text-muted-foreground"
      )}
    >
      <CalendarDays className="h-2.5 w-2.5" />
      {formatDue(date)}
    </span>
  );
}

/* ── Plain description area (matches artist profile Work section – no rich text) ── */

function TaskDescriptionArea({
  value,
  onChange,
  onDelete,
}: {
  value: string;
  onChange?: (desc: string) => void;
  onDelete: () => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleBlur = useCallback(() => {
    if (onChange && local !== value) onChange(local);
  }, [local, value, onChange]);

  return (
    <div
      className="ml-[32px] pb-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={handleBlur}
        placeholder="Description"
        className={cn(
          "w-full bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/40",
          "min-h-[32px] py-1"
        )}
      />
      <div className="flex items-center justify-end mt-2 pt-2 border-t border-border/30">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 text-muted-foreground/40 hover:text-destructive transition-colors rounded-md hover:bg-destructive/5"
          title="Delete task"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ── Main Work Item Row ── */

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
  const [completing, setCompleting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleComplete = useCallback(() => {
    if (completing) return;
    setCompleting(true);
    timerRef.current = setTimeout(() => {
      onToggleComplete();
    }, 600);
  }, [completing, onToggleComplete]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const hasMetadata =
    (showArtist && task.artists) ||
    task.due_date ||
    task.initiatives ||
    (task.expense_amount != null && task.expense_amount > 0);

  return (
    <li
      className={cn(
        "transition-all duration-500 ease-out",
        completing && "opacity-30 max-h-0 -my-2 overflow-hidden"
      )}
    >
      <div
        className={cn(
          "flex items-start gap-3 py-3 px-2 -mx-2 rounded-xl cursor-pointer transition-colors duration-150",
          isExpanded ? "bg-accent/50" : "hover:bg-accent/20"
        )}
        onClick={onToggleExpand}
      >
        <CircleCheck
          checked={task.is_completed}
          completing={completing}
          onCheck={handleComplete}
        />

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-[15px] leading-snug text-foreground transition-all duration-200",
              (task.is_completed || completing) && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </p>

          {hasMetadata && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {showArtist && task.artists && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToArtist?.(task.artists!.id);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium leading-none px-1.5 py-[3px] rounded-full bg-muted/80 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Music2 className="h-2.5 w-2.5" />
                  {task.artists.name}
                </button>
              )}
              {task.due_date && <DueDatePill date={task.due_date} />}
              {task.initiatives && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium leading-none px-1.5 py-[3px] rounded-full bg-muted/80 text-muted-foreground">
                  <Tag className="h-2.5 w-2.5" />
                  {task.initiatives.name}
                </span>
              )}
              {task.expense_amount != null && task.expense_amount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium leading-none px-1.5 py-[3px] rounded-full bg-muted/80 text-muted-foreground">
                  <DollarSign className="h-2.5 w-2.5" />
                  ${task.expense_amount.toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>

        {showArtist && task.artists && (
          <Avatar
            className="h-6 w-6 shrink-0 cursor-pointer mt-0.5"
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToArtist?.(task.artists!.id);
            }}
          >
            {task.artists.avatar_url && (
              <AvatarImage src={task.artists.avatar_url} alt={task.artists.name} />
            )}
            <AvatarFallback className="text-[9px] font-bold bg-muted">
              {task.artists.name?.[0]}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {isExpanded && (
        <TaskDescriptionArea
          value={task.description || ""}
          onChange={onDescriptionChange}
          onDelete={onDelete}
        />
      )}
    </li>
  );
});
