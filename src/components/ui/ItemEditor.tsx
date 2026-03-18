import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
  /** Enable inline highlight overlay for parsed tokens */
  enableHighlight?: boolean;
  /** Team member names for highlight matching */
  highlightMembers?: string[];
  /** Campaign names for highlight matching */
  highlightCampaigns?: string[];
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
  enableHighlight = false,
  highlightMembers = [],
  highlightCampaigns = [],
}: ItemEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [activeTrigger, setActiveTrigger] = useState<TriggerConfig | null>(null);
  const [triggerQuery, setTriggerQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const lastDetectedRef = useRef<string | null>(null);

  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (!dropdownRef.current) return;
    const selected = dropdownRef.current.children[selectedIndex] as HTMLElement | undefined;
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

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
        // Keep sentence intact — don't strip date text while typing
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

  // Update dropdown position when active trigger changes
  useEffect(() => {
    if (activeTrigger && filteredItems.length > 0 && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 200) });
    } else {
      setDropdownPos(null);
    }
  }, [activeTrigger, filteredItems.length]);

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

  const highlightedTokens = useMemo(() => {
    if (!enableHighlight || !value) return null;
    return buildHighlightOverlay(value, highlightMembers, highlightCampaigns);
  }, [enableHighlight, value, highlightMembers, highlightCampaigns]);

  return (
    <div className="relative flex-1 min-w-0">
      {/* Highlight overlay — sits behind input, mirrors text with colored spans */}
      {enableHighlight && value && (
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 pointer-events-none whitespace-pre overflow-hidden",
            className
          )}
          style={{ lineHeight: "inherit" }}
        >
          {highlightedTokens}
        </div>
      )}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "w-full min-w-0 bg-transparent outline-none text-sm placeholder:text-muted-foreground/50",
          enableHighlight && value ? "text-transparent caret-foreground" : "",
          className
        )}
      />
      {activeTrigger && filteredItems.length > 0 && dropdownPos && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
          className="bg-popover border border-border rounded-lg shadow-xl z-[9999] min-w-[200px] py-1 max-h-[200px] overflow-y-auto overscroll-contain"
          onMouseDown={(e) => {
            e.preventDefault();
          }}
        >
          {filteredItems.map((item, idx) => (
            <button
              key={item.id}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors text-left",
                idx === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent"
              )}
              onClick={() => selectItem(item)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

/** Build highlighted overlay from text, wrapping detected tokens in colored spans */
function buildHighlightOverlay(
  text: string,
  memberNames: string[],
  campaignNames: string[]
): ReactNode[] {
  // Token patterns: @mention, #campaign, $amount [label], date phrases
  const dateWords = "(?:today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\\s+(?:week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|this\\s+weekend|next\\s+weekend|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\s+\\d{1,2}(?:st|nd|rd|th)?|due\\s+\\S+)";
  const patterns = [
    { regex: new RegExp(`@(\\S+(?:\\s\\S+)?)`, "gi"), cls: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold rounded px-0.5" },
    { regex: new RegExp(`(${dateWords})`, "gi"), cls: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-bold rounded px-0.5" },
    { regex: new RegExp(`#(\\S+)`, "gi"), cls: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold rounded px-0.5" },
    { regex: new RegExp(`\\$\\d[\\d,.]*(?:\\s*\\[[^\\]]+\\])?`, "gi"), cls: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold rounded px-0.5" },
  ];

  // Find all matches with positions
  type Match = { start: number; end: number; cls: string; text: string };
  const matches: Match[] = [];

  for (const { regex, cls } of patterns) {
    let m: RegExpExecArray | null;
    const re = new RegExp(regex.source, regex.flags);
    while ((m = re.exec(text)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length, cls, text: m[0] });
    }
  }

  // Sort by position
  matches.sort((a, b) => a.start - b.start);

  // Remove overlapping matches
  const filtered: Match[] = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      filtered.push(m);
      lastEnd = m.end;
    }
  }

  // Build JSX
  const result: ReactNode[] = [];
  let cursor = 0;
  for (let i = 0; i < filtered.length; i++) {
    const m = filtered[i];
    if (cursor < m.start) {
      result.push(<span key={`t-${i}`}>{text.slice(cursor, m.start)}</span>);
    }
    result.push(
      <span key={`h-${i}`} className={m.cls}>{m.text}</span>
    );
    cursor = m.end;
  }
  if (cursor < text.length) {
    result.push(<span key="tail">{text.slice(cursor)}</span>);
  }

  return result;
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
        "w-full min-w-0 bg-transparent text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/40",
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
