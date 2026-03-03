import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { cn, parseDateFromText } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";

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
  /** Enable live natural-language date detection */
  enableDateDetection?: boolean;
  /** Called when a date is detected or cleared */
  onDateParsed?: (date: Date | null) => void;
  /** Externally controlled parsed date (for display) */
  parsedDate?: Date | null;
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
  enableDateDetection = false,
  onDateParsed,
  parsedDate,
}: ItemEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeTrigger, setActiveTrigger] = useState<TriggerConfig | null>(null);
  const [triggerQuery, setTriggerQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const lastDetectedRef = useRef<string | null>(null);

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

  // Live date detection — triggers on space after a date-like word
  useEffect(() => {
    if (!enableDateDetection || !onDateParsed) return;
    // Only detect when the value ends with a space (user finished typing a word)
    if (!value.endsWith(" ") && value.length > 0) return;

    const parsed = parseDateFromText(value.trim());
    if (parsed.date) {
      const dateKey = parsed.date.toISOString();
      if (lastDetectedRef.current !== dateKey) {
        lastDetectedRef.current = dateKey;
        onDateParsed(parsed.date);
        // Strip the date text from the value
        onChange(parsed.title);
      }
    }
  }, [value, enableDateDetection, onDateParsed, onChange]);

  const filteredItems = useMemo(() => {
    if (!activeTrigger) return [];
    if (!triggerQuery) return activeTrigger.items;
    if (/^[\d,.]*$/.test(triggerQuery)) return activeTrigger.items;
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

  const clearDate = useCallback(() => {
    lastDetectedRef.current = null;
    onDateParsed?.(null);
  }, [onDateParsed]);

  return (
    <div className="relative flex-1 min-w-0">
      <div className="flex items-center gap-2">
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
        {enableDateDetection && parsedDate && (
          <DateChip date={parsedDate} onClear={clearDate} />
        )}
      </div>
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

/** Date chip pill shown inline when a date is detected */
function DateChip({ date, onClear }: { date: Date; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0 whitespace-nowrap">
      <CalendarIcon className="h-2.5 w-2.5" />
      {format(date, "EEE, MMM d")}
      <button
        onClick={onClear}
        className="ml-0.5 hover:text-primary/70 transition-colors"
        type="button"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
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
