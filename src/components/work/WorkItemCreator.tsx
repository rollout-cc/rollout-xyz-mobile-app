import { useState } from "react";
import { Plus } from "lucide-react";
import { ItemEditor } from "@/components/ui/ItemEditor";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { Button } from "@/components/ui/button";
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

interface WorkItemCreatorProps {
  onSubmit: (data: { title: string; description: string; dueDate: Date | null }) => void;
  onCancel?: () => void;
  placeholder?: string;
  triggers?: TriggerConfig[];
  /** Show inline (always visible) or as expandable card */
  variant?: "inline" | "card";
  /** Metadata pills to render below input */
  metadataPills?: React.ReactNode;
  /** Called when title changes, for external parsing (e.g. revenue detection) */
  onTitleChange?: (title: string) => void;
}

export function WorkItemCreator({
  onSubmit,
  onCancel,
  placeholder = "What needs to be done?",
  triggers,
  variant = "card",
  metadataPills,
  onTitleChange,
}: WorkItemCreatorProps) {
  const [title, setTitle] = useState("");
  const handleTitleChange = (val: string) => {
    setTitle(val);
    onTitleChange?.(val);
  };
  const [description, setDescription] = useState("");
  const [parsedDate, setParsedDate] = useState<Date | null>(null);
  const [showDescription, setShowDescription] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description, dueDate: parsedDate });
    setTitle("");
    onTitleChange?.("");
    setDescription("");
    setParsedDate(null);
    setShowDescription(false);
  };

  const handleCancel = () => {
    setTitle("");
    onTitleChange?.("");
    setDescription("");
    setParsedDate(null);
    setShowDescription(false);
    onCancel?.();
  };

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 py-2">
        <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
        <ItemEditor
          value={title}
          onChange={handleTitleChange}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          placeholder={placeholder}
          autoFocus={false}
          triggers={triggers}
          singleLine
          enableDateDetection
          onDateParsed={setParsedDate}
          parsedDate={parsedDate}
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-start gap-3">
        <div className="pt-0.5 shrink-0">
          <div className="h-4 w-4 rounded border border-muted-foreground/30" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <ItemEditor
            value={title}
            onChange={handleTitleChange}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            placeholder={placeholder}
            autoFocus
            triggers={triggers}
            singleLine
            enableDateDetection
            onDateParsed={setParsedDate}
            parsedDate={parsedDate}
          />
          {!showDescription ? (
            <button
              onClick={() => setShowDescription(true)}
              className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              Description
            </button>
          ) : (
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Description"
              className="min-h-[40px] text-xs !border-0 !ring-0 !px-0"
            />
          )}
        </div>
      </div>

      {metadataPills}

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
        <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit} disabled={!title.trim()} className="gap-1">
          Save
        </Button>
      </div>
    </div>
  );
}
