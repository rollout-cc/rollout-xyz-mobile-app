import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

/* ── Read-only item row ── */
interface ItemCardReadProps {
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ItemCardRead({
  icon,
  title,
  subtitle,
  badges,
  actions,
  className,
  onClick,
}: ItemCardReadProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 py-3 px-1 group",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{title}</div>
        {subtitle && <div className="mt-0.5">{subtitle}</div>}
        {badges && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5 empty:hidden">
            {badges}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

/* ── Metadata badge pill ── */
interface MetaBadgeProps {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: "default" | "blue";
}

export function MetaBadge({
  icon,
  children,
  className,
  onClick,
  variant = "default",
}: MetaBadgeProps) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded",
        variant === "default" && "caption bg-muted/80",
        variant === "blue" &&
          "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/50 cursor-pointer transition-colors",
        className
      )}
      onClick={onClick}
    >
      {icon}
      {children}
    </Comp>
  );
}

/* ── Edit card wrapper ── */
interface ItemCardEditProps {
  children: ReactNode;
  bottomLeft?: ReactNode;
  onCancel: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  className?: string;
}

export function ItemCardEdit({
  children,
  bottomLeft,
  onCancel,
  onSave,
  saveDisabled,
  className,
}: ItemCardEditProps) {
  return (
    <div
      className={cn(
        "mb-2 rounded-lg border border-border bg-card px-4 py-3 space-y-2",
        className
      )}
    >
      {children}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1">{bottomLeft}</div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={onSave}
            disabled={saveDisabled}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Delete button for hover actions ── */
export function DeleteAction({ onDelete }: { onDelete: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 -mr-1"
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
