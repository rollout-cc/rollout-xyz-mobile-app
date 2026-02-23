import { useState, useRef, useEffect, type KeyboardEvent } from "react";

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
  placeholder = "Click to edit",
  className = "",
  inputClassName = "",
  as = "input",
  prefix,
}: InlineFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value) {
      onSave(draft.trim());
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && as === "input") {
      e.preventDefault();
      commit();
    }
    if (e.key === "Escape") {
      setDraft(value);
      setEditing(false);
    }
  };

  if (editing) {
    const shared = {
      ref: ref as any,
      value: draft,
      onChange: (e: any) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: handleKeyDown,
      placeholder,
      className: `w-full bg-transparent border-b border-primary/40 outline-none text-foreground py-0.5 px-0 ${inputClassName}`,
    };

    return as === "textarea" ? (
      <textarea {...shared} rows={2} />
    ) : (
      <input {...shared} />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`cursor-text inline-block min-w-[2rem] rounded px-1 -mx-1 hover:bg-accent/60 transition-colors ${
        !value ? "text-muted-foreground italic" : ""
      } ${className}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") setEditing(true); }}
    >
      {prefix}{value || placeholder}
    </span>
  );
}
