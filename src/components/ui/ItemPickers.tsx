import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, FolderOpen, User, Hash } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

/* ── Date Picker ── */
interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
}

export function DatePicker({ value, onChange, placeholder = "Select Date" }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-8 justify-start text-left font-normal text-sm px-2 shrink-0",
            !value && "text-muted-foreground/50"
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
          {value ? format(value, "MMM d, yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-popover border border-border z-50" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

/* ── Folder Picker ── */
interface FolderPickerProps {
  folders: { id: string; name: string }[];
  value: string | null;
  onChange: (folderId: string | null, folderName: string | null) => void;
}

export function FolderPicker({ folders, value, onChange }: FolderPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = folders.find((f) => f.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-8 justify-start text-left font-normal text-sm px-2 shrink-0 gap-1.5",
            !selected && "text-muted-foreground/50"
          )}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          {selected ? selected.name : "Folder"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1 bg-popover border border-border z-50" align="start">
        {value && (
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:bg-accent rounded transition-colors text-left"
            onClick={() => {
              onChange(null, null);
              setOpen(false);
            }}
          >
            No folder
          </button>
        )}
        {folders.map((f) => (
          <button
            key={f.id}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent rounded transition-colors text-left",
              f.id === value && "bg-accent"
            )}
            onClick={() => {
              onChange(f.id, f.name);
              setOpen(false);
            }}
          >
            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
            {f.name}
          </button>
        ))}
        {folders.length === 0 && (
          <p className="text-xs text-muted-foreground px-3 py-2">No folders</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* ── Icon Toolbar Button ── */
interface ToolbarButtonProps {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}

export function ToolbarButton({ icon, title, onClick }: ToolbarButtonProps) {
  return (
    <button
      className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      title={title}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}
