import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

interface InlineFieldProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  as?: "input" | "textarea";
  prefix?: string;
}

export function InlineField({
  value,
  onSave,
  placeholder = "Enter value",
  className = "",
  inputClassName = "",
  as = "input",
  prefix,
}: InlineFieldProps) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    if (draft.trim() !== value) {
      onSave(draft.trim());
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && as === "input") {
      e.preventDefault();
      commit();
      ref.current?.blur();
    }
    if (e.key === "Escape") {
      setDraft(value);
      ref.current?.blur();
    }
  };

  if (as === "textarea") {
    return (
      <RichTextEditor
        value={draft}
        onChange={(v) => setDraft(v)}
        onBlur={(v) => {
          const clean = v.trim();
          if (clean !== value) onSave(clean);
        }}
        placeholder={placeholder}
        className={`${inputClassName} ${className}`}
      />
    );
  }

  const shared = {
    ref: ref as any,
    value: prefix ? `${prefix}${draft}` : draft,
    onChange: (e: any) => {
      const val = prefix ? e.target.value.replace(prefix, "") : e.target.value;
      setDraft(val);
    },
    onBlur: commit,
    onKeyDown: handleKeyDown,
    placeholder,
    className: `w-full bg-transparent border border-border rounded-md outline-none text-foreground py-1.5 px-2 focus:border-ring focus:ring-1 focus:ring-ring transition-colors placeholder:text-muted-foreground/50 ${inputClassName} ${className}`,
  };

  return <input {...shared} />;
}
