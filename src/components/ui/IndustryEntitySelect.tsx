import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type EntityType = "publisher" | "publishing_admin" | "record_label" | "distributor";

interface IndustryEntitySelectProps {
  entityType: EntityType;
  value: string;
  placeholder?: string;
  onSave: (value: string) => void;
}

function titleCase(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function IndustryEntitySelect({
  entityType,
  value,
  placeholder = "Search or create…",
  onSave,
}: IndustryEntitySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: entities = [] } = useQuery({
    queryKey: ["industry_entities", entityType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("industry_entities")
        .select("id, name")
        .eq("entity_type", entityType)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const createEntity = useMutation({
    mutationFn: async (name: string) => {
      const normalized = titleCase(name);
      const { error } = await supabase
        .from("industry_entities")
        .insert({ name: normalized, entity_type: entityType, is_custom: true, source: "user_generated" } as any);
      if (error) throw error;
      return normalized;
    },
    onSuccess: (normalized) => {
      queryClient.invalidateQueries({ queryKey: ["industry_entities", entityType] });
      onSave(normalized);
      setSearch("");
      setOpen(false);
    },
  });

  const filtered = entities.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = entities.some(
    (e) => e.name.toLowerCase() === search.trim().toLowerCase()
  );

  const showCreate = search.trim().length > 0 && !exactMatch;
  const totalItems = filtered.length + (showCreate ? 1 : 0);

  useEffect(() => {
    setHighlightIndex(0);
  }, [search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectItem = useCallback(
    (name: string) => {
      onSave(name);
      setSearch("");
      setOpen(false);
    },
    [onSave]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, totalItems - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex < filtered.length) {
          selectItem(filtered[highlightIndex].name);
        } else if (showCreate) {
          createEntity.mutate(search.trim());
        }
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[highlightIndex] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={cn(
          "flex items-center justify-between w-full rounded-md border border-border bg-transparent px-3 h-9 text-sm",
          "hover:bg-accent/50 transition-colors",
          !value && "text-muted-foreground/50"
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
          <div className="p-1.5">
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type to search…"
              className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
          </div>
          <div ref={listRef} className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 && !showCreate && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">No results</div>
            )}
            {filtered.map((entity, i) => (
              <button
                key={entity.id}
                type="button"
                onClick={() => selectItem(entity.name)}
                className={cn(
                  "flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm text-left",
                  highlightIndex === i
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
              >
                <Check
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    value === entity.name ? "opacity-100" : "opacity-0"
                  )}
                />
                {entity.name}
              </button>
            ))}
            {showCreate && (
              <button
                type="button"
                onClick={() => createEntity.mutate(search.trim())}
                className={cn(
                  "flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm text-left",
                  highlightIndex === filtered.length
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                Create "{titleCase(search.trim())}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
