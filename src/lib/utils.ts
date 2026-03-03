import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a Date to YYYY-MM-DD using local timezone (avoids UTC date shift).
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string into a Date in local timezone (avoids UTC midnight shift).
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Parse a natural-language date from text and return the cleaned title (date removed) + parsed Date.
 * Supports: "august 15", "jan 3rd", "due today", "due tomorrow"
 */
export function parseDateFromText(text: string): { title: string; date: Date | null } {
  const months: Record<string, number> = {
    january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
    april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
    august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
    november: 10, nov: 10, december: 11, dec: 11,
  };

  // Match patterns like "august 15", "jan 3", "December 25", "oct 1st"
  const regex = /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;
  const match = text.match(regex);
  if (match) {
    const monthIdx = months[match[1].toLowerCase()];
    const day = parseInt(match[2], 10);
    if (monthIdx !== undefined && day >= 1 && day <= 31) {
      const now = new Date();
      let year = now.getFullYear();
      const candidate = new Date(year, monthIdx, day);
      if (candidate.getTime() < now.getTime() - 60 * 24 * 60 * 60 * 1000) {
        year += 1;
      }
      const cleaned = text.replace(match[0], "").trim();
      return { title: cleaned || text, date: new Date(year, monthIdx, day) };
    }
  }

  // Match "due today" / "due tomorrow"
  const dueMatch = text.match(/\bdue\s+(today|tomorrow)\b/i);
  if (dueMatch) {
    const d = new Date();
    if (dueMatch[1].toLowerCase() === "tomorrow") d.setDate(d.getDate() + 1);
    const cleaned = text.replace(dueMatch[0], "").trim();
    return { title: cleaned || text, date: d };
  }

  return { title: text, date: null };
}
