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
 * Supports: "august 15", "jan 3rd", "today", "tomorrow", "tonight",
 * "monday"–"sunday", "next monday", "next week", "this weekend", "next weekend",
 * "due today", "due tomorrow"
 */
export function parseDateFromText(text: string): { title: string; date: Date | null } {
  const months: Record<string, number> = {
    january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
    april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
    august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
    november: 10, nov: 10, december: 11, dec: 11,
  };

  const dayNames: Record<string, number> = {
    sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
    wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4,
    friday: 5, fri: 5, saturday: 6, sat: 6,
  };

  const clean = (source: string, matched: string) => {
    const c = source.replace(matched, "").replace(/\s+/g, " ").trim();
    return c || source;
  };

  // 1. "august 15", "jan 3rd", "December 25"
  const monthDayRegex = /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;
  const monthMatch = text.match(monthDayRegex);
  if (monthMatch) {
    const monthIdx = months[monthMatch[1].toLowerCase()];
    const day = parseInt(monthMatch[2], 10);
    if (monthIdx !== undefined && day >= 1 && day <= 31) {
      const now = new Date();
      let year = now.getFullYear();
      const candidate = new Date(year, monthIdx, day);
      if (candidate.getTime() < now.getTime() - 60 * 24 * 60 * 60 * 1000) {
        year += 1;
      }
      return { title: clean(text, monthMatch[0]), date: new Date(year, monthIdx, day) };
    }
  }

  // 2. "next monday", "next friday"
  const nextDayMatch = text.match(/\bnext\s+(sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat)\b/i);
  if (nextDayMatch) {
    const target = dayNames[nextDayMatch[1].toLowerCase()];
    if (target !== undefined) {
      const d = new Date();
      const current = d.getDay();
      let diff = target - current;
      if (diff <= 0) diff += 7;
      diff += 7; // "next" means the week after
      d.setDate(d.getDate() + diff);
      return { title: clean(text, nextDayMatch[0]), date: d };
    }
  }

  // 3. "next week" → next Monday
  const nextWeekMatch = text.match(/\bnext\s+week\b/i);
  if (nextWeekMatch) {
    const d = new Date();
    const current = d.getDay();
    let diff = 1 - current; // Monday
    if (diff <= 0) diff += 7;
    diff += 7;
    d.setDate(d.getDate() + diff);
    return { title: clean(text, nextWeekMatch[0]), date: d };
  }

  // 4. "next weekend" → Saturday after next
  const nextWeekendMatch = text.match(/\bnext\s+weekend\b/i);
  if (nextWeekendMatch) {
    const d = new Date();
    const current = d.getDay();
    let diff = 6 - current; // Saturday
    if (diff <= 0) diff += 7;
    diff += 7;
    d.setDate(d.getDate() + diff);
    return { title: clean(text, nextWeekendMatch[0]), date: d };
  }

  // 5. "this weekend" → this Saturday
  const thisWeekendMatch = text.match(/\bthis\s+weekend\b/i);
  if (thisWeekendMatch) {
    const d = new Date();
    const current = d.getDay();
    let diff = 6 - current; // Saturday
    if (diff <= 0) diff += 7;
    d.setDate(d.getDate() + diff);
    return { title: clean(text, thisWeekendMatch[0]), date: d };
  }

  // 6. Standalone day name: "monday", "friday" → next occurrence
  const dayMatch = text.match(/\b(sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat)\b/i);
  if (dayMatch) {
    const target = dayNames[dayMatch[1].toLowerCase()];
    if (target !== undefined) {
      const d = new Date();
      const current = d.getDay();
      let diff = target - current;
      if (diff <= 0) diff += 7;
      d.setDate(d.getDate() + diff);
      return { title: clean(text, dayMatch[0]), date: d };
    }
  }

  // 7. "today", "tonight", "tomorrow" (with or without "due" prefix)
  const relMatch = text.match(/\b(?:due\s+)?(today|tonight|tomorrow)\b/i);
  if (relMatch) {
    const d = new Date();
    if (relMatch[1].toLowerCase() === "tomorrow") d.setDate(d.getDate() + 1);
    return { title: clean(text, relMatch[0]), date: d };
  }

  return { title: text, date: null };
}
