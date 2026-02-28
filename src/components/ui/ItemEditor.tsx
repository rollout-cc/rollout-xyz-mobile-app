import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";

interface SuggestionItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TriggerConfig {
  char: string;
  items: SuggestionItem[];
  onSelect: (item: SuggestionItem, currentValue: string) => string;
}

interface ItemEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  triggers?: TriggerConfig[];
  /** Make the input behave as single-line (Enter submits) */
  singleLine?: boolean;
}

export function ItemEditor({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder = "Enter title",
  className,
  autoFocus,
  triggers = [],
  singleLine = true,
}: ItemEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeTrigger, setActiveTrigger] = useState<TriggerConfig | null>(null);
  const [triggerQuery, setTriggerQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [autoFocus]);

  // Detect trigger characters in value
  useEffect(() => {
    let found = false;
    for (const trigger of triggers) {
      const regex = new RegExp(`\\${trigger.char}(\\S*)$`);
      const match = value.match(regex);
      if (match) {
        setActiveTrigger(trigger);
        setTriggerQuery(match[1].toLowerCase());
        setSelectedIndex(0);
        found = true;
        break;
      }
    }
    if (!found) {
      setActiveTrigger(null);
      setTriggerQuery("");
    }
  }, [value, triggers]);

  const filteredItems = useMemo(() => {
    if (!activeTrigger) return [];
    if (!triggerQuery) return activeTrigger.items;
    return activeTrigger.items.filter((item) =>
      item.label.toLowerCase().includes(triggerQuery)
    );
  }, [activeTrigger, triggerQuery]);

  const selectItem = useCallback(
    (item: SuggestionItem) => {
      if (!activeTrigger) return;
      const newValue = activeTrigger.onSelect(item, value);
      onChange(newValue);
      setActiveTrigger(null);
      inputRef.current?.focus();
    },
    [activeTrigger, value, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (activeTrigger && filteredItems.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredItems.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectItem(filteredItems[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setActiveTrigger(null);
        return;
      }
    }

    if (singleLine && e.key === "Enter" && !activeTrigger) {
      e.preventDefault();
      onSubmit?.();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel?.();
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground/50",
          className
        )}
      />
      {activeTrigger && filteredItems.length > 0 && (
        <div className="absolute left-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-xl z-50 min-w-[200px] py-1 max-h-[200px] overflow-y-auto">
          {filteredItems.map((item, idx) => (
            <button
              key={item.id}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors text-left",
                idx === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                selectItem(item);
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Simple description editor - just a plain input with muted styling */
interface DescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  className?: string;
}

export function DescriptionEditor({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder = "Description",
  className,
}: DescriptionEditorProps) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full bg-transparent text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/40",
        className
      )}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSubmit?.();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel?.();
        }
      }}
    />
  );
}
