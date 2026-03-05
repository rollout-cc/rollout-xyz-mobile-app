export interface RevenueParseResult {
  isRevenue: boolean;
  amount: number | null;
  source: string | null;
  cleanTitle: string;
}

const REVENUE_TRIGGERS = [
  "send invoice",
  "invoice",
  "request payment",
  "collect payment",
  "bill",
  "charge",
];

/**
 * Detects revenue intent from natural language task titles.
 *
 * Examples:
 *   "send invoice to Nike for $5,000"  → { isRevenue: true, amount: 5000, source: "Nike", cleanTitle: "send invoice to Nike" }
 *   "invoice Live Nation $10,000"      → { isRevenue: true, amount: 10000, source: "Live Nation", cleanTitle: "invoice Live Nation" }
 *   "buy studio equipment $2,000"      → { isRevenue: false, amount: null, source: null, cleanTitle: "buy studio equipment $2,000" }
 */
export function parseRevenueIntent(text: string): RevenueParseResult {
  const lower = text.toLowerCase().trim();

  // Check if any revenue trigger phrase is present
  const matchedTrigger = REVENUE_TRIGGERS.find((t) => lower.includes(t));
  if (!matchedTrigger) {
    return { isRevenue: false, amount: null, source: null, cleanTitle: text };
  }

  // Extract dollar amount: $1,234.56 or $5000
  const amountMatch = text.match(/\$\s*([\d,]+\.?\d*)/);
  const amount = amountMatch
    ? parseFloat(amountMatch[1].replace(/,/g, ""))
    : null;

  // Remove the dollar amount from text for clean title
  const cleanTitle = amountMatch
    ? text.replace(/\s*(for\s+)?\$\s*[\d,]+\.?\d*/i, "").trim()
    : text;

  // Extract source: look for "to [words]" after the trigger phrase
  let source: string | null = null;
  const triggerIdx = lower.indexOf(matchedTrigger);
  const afterTrigger = text.slice(triggerIdx + matchedTrigger.length).trim();

  // Match "to [Source]" — stop at "for", "$", or end
  const toMatch = afterTrigger.match(/^to\s+(.+?)(?:\s+for\s|\s*\$|$)/i);
  if (toMatch) {
    source = toMatch[1].trim();
  } else {
    // For "bill Nike $5000" or "charge Sony" — first words after trigger (before $ or "for")
    const directMatch = afterTrigger.match(/^([A-Z][\w\s]*?)(?:\s+for\s|\s*\$|$)/i);
    if (directMatch && directMatch[1].trim()) {
      source = directMatch[1].trim();
    }
  }

  return { isRevenue: true, amount, source, cleanTitle };
}
