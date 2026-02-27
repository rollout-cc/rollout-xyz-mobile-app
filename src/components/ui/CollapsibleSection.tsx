import { useState, ReactNode } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: () => void;
  actions?: ReactNode;
  /** Render title as editable inline field */
  titleSlot?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  open: controlledOpen,
  onToggle,
  actions,
  titleSlot,
  children,
  className,
}: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = controlledOpen ?? internalOpen;
  const toggle = onToggle ?? (() => setInternalOpen((o) => !o));

  return (
    <div className={cn("", className)}>
      {/* Section header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 rounded-t-lg border-b border-border/30">
        <button
          onClick={toggle}
          className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
              !isOpen && "-rotate-90"
            )}
          />
          {titleSlot ?? (
            <span className="text-base font-bold truncate text-foreground">{title}</span>
          )}
          {count != null && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
              {count}
            </span>
          )}
        </button>
        {actions && (
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>

      {/* Content */}
      {isOpen && (
        <div className="px-4 pr-2 pt-1 pb-2">{children}</div>
      )}
    </div>
  );
}

/* Shared inline "+ New Item" trigger */
interface InlineAddTriggerProps {
  label: string;
  onClick: () => void;
  className?: string;
}

export function InlineAddTrigger({ label, onClick, className }: InlineAddTriggerProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2.5 pl-2",
        className
      )}
    >
      <span className="text-lg leading-none">+</span> {label}
    </button>
  );
}

/* Shared list item row wrapper */
interface ListItemRowProps {
  children: ReactNode;
  className?: string;
}

export function ListItemRow({ children, className }: ListItemRowProps) {
  return (
    <div className={cn("flex items-start gap-3 py-3 px-1 group", className)}>
      {children}
    </div>
  );
}
