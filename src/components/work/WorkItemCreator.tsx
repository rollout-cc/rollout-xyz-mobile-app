import { useState } from "react";
import { Plus } from "lucide-react";
import { ItemEditor } from "@/components/ui/ItemEditor";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { VoiceInputButton } from "@/components/ui/VoiceInputButton";
import { useIsMobile } from "@/hooks/use-mobile";

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
  /** When set, Enter or tapping the row opens the full add form with this title instead of submitting inline */
  onOpenFullForm?: (currentTitle: string) => void;
  /** Shorter placeholder on narrow viewports (defaults to `placeholder` when omitted) */
  placeholderMobile?: string;
}

export function WorkItemCreator({
  onSubmit,
  onCancel,
  placeholder = "What needs to be done?",
  triggers,
  variant = "card",
  metadataPills,
  onTitleChange,
  onOpenFullForm,
  placeholderMobile,
}: WorkItemCreatorProps) {
  const isMobile = useIsMobile();
  const [title, setTitle] = useState("");
  const handleTitleChange = (val: string) => {
    setTitle(val);
    onTitleChange?.(val);
  };
  const [description, setDescription] = useState("");
  const [parsedDate, setParsedDate] = useState<Date | null>(null);
  const [showDescription, setShowDescription] = useState(false);

  const voice = useVoiceInput({
    onResult: (text) => {
      handleTitleChange(title ? title + " " + text : text);
    },
  });

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

  const resolvedPlaceholder =
    isMobile && placeholderMobile ? placeholderMobile : placeholder;

  if (variant === "inline") {
    const openFullForm = () => onOpenFullForm?.(title);
    return (
      <div className="py-0.5 md:py-1">
        <div
          className="flex items-center gap-2.5 md:gap-3 px-0.5 md:px-1 py-2 md:py-2.5 rounded-xl cursor-text active:bg-muted/40 transition-colors"
          onClick={(e) => { if (onOpenFullForm) openFullForm(); else { const input = e.currentTarget.querySelector<HTMLElement>('[contenteditable]'); input?.focus(); } }}
          role={onOpenFullForm ? "button" : undefined}
          tabIndex={onOpenFullForm ? 0 : undefined}
          onKeyDown={
            onOpenFullForm
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openFullForm();
                  }
                }
              : undefined
          }
        >
          <div
            className={cn(
              "h-4 w-4 rounded-sm border border-muted-foreground/25 shrink-0 flex items-center justify-center",
              onOpenFullForm && "cursor-pointer"
            )}
          >
            <Plus className="h-2.5 w-2.5 text-muted-foreground/40" />
          </div>
          <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
            <ItemEditor
              value={title}
              onChange={handleTitleChange}
              onSubmit={onOpenFullForm ? openFullForm : handleSubmit}
              onCancel={handleCancel}
              placeholder={resolvedPlaceholder}
              autoFocus={false}
              triggers={triggers}
              singleLine
              enableDateDetection
              onDateParsed={setParsedDate}
              parsedDate={parsedDate}
            />
          </div>
        </div>
        {metadataPills && <div className="mt-0.5 md:mt-1 ml-9 md:ml-[38px]">{metadataPills}</div>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border p-3 space-y-2 bg-card min-w-0">
      <div className="flex items-start gap-3 min-w-0">
        <div className="pt-0.5 shrink-0">
          <div className="h-4 w-4 rounded-sm border border-muted-foreground/20" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <ItemEditor
            value={title}
            onChange={handleTitleChange}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            placeholder={resolvedPlaceholder}
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

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
        <VoiceInputButton
          isListening={voice.isListening}
          isSupported={voice.isSupported}
          onClick={voice.toggleListening}
          size="sm"
        />
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit} disabled={!title.trim()} className="gap-1">
          Save
        </Button>
      </div>
    </div>
  );
}
