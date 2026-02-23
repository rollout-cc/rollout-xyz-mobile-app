import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandTagInputProps {
  value: string; // comma-separated string stored in DB
  onSave: (value: string) => void;
}

export function BrandTagInput({ value, onSave }: BrandTagInputProps) {
  const tags = value ? value.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch all known brands for autocomplete
  const { data: allBrands = [] } = useQuery({
    queryKey: ["clothing_brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clothing_brands")
        .select("name")
        .order("name");
      if (error) throw error;
      return data.map((b: any) => b.name as string);
    },
    staleTime: 60_000,
  });

  const suggestions = input.trim().length > 0
    ? allBrands.filter(
        (b) =>
          b.toLowerCase().includes(input.trim().toLowerCase()) &&
          !tags.some((t) => t.toLowerCase() === b.toLowerCase())
      ).slice(0, 8)
    : [];

  useEffect(() => {
    setSelectedIdx(0);
  }, [input]);

  const addTag = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setInput("");
      return;
    }

    const newTags = [...tags, trimmed];
    onSave(newTags.join(", "));
    setInput("");
    setShowSuggestions(false);

    // Upsert into global brands table (ignore conflict)
    await supabase
      .from("clothing_brands")
      .upsert({ name: trimmed } as any, { onConflict: "name" })
      .select();
  }, [tags, onSave]);

  const removeTag = (idx: number) => {
    const newTags = tags.filter((_, i) => i !== idx);
    onSave(newTags.join(", "));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (suggestions.length > 0 && showSuggestions) {
        addTag(suggestions[selectedIdx] || input);
      } else {
        addTag(input);
      }
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    } else if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex flex-wrap gap-1.5 items-center min-h-[2.25rem] w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-sm cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 bg-primary/15 text-primary rounded-md px-2 py-0.5 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(i); }}
              className="hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            // Handle pasted commas
            const val = e.target.value;
            if (val.includes(",")) {
              const parts = val.split(",");
              parts.forEach((p, i) => {
                if (i < parts.length - 1) addTag(p);
              });
              setInput(parts[parts.length - 1]);
            } else {
              setInput(val);
            }
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? "Type brand name, press Enter" : ""}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted-foreground/50"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-40 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={s}
              type="button"
              className={cn(
                "w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors",
                i === selectedIdx && "bg-accent"
              )}
              onMouseDown={(e) => { e.preventDefault(); addTag(s); }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
