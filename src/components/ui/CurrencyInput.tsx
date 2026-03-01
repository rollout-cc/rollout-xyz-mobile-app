import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

/** Strips non-digit/decimal chars */
function rawValue(formatted: string): string {
  return formatted.replace(/[^0-9.]/g, "");
}

/** Formats a numeric string with commas */
function formatWithCommas(val: string): string {
  const raw = rawValue(val);
  if (!raw) return "";
  const parts = raw.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export function CurrencyInput({
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder = "0",
  className,
  autoFocus,
}: CurrencyInputProps) {
  const display = formatWithCommas(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = rawValue(e.target.value);
    onChange(raw);
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
      <input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
      />
    </div>
  );
}
