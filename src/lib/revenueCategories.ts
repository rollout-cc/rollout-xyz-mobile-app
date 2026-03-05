export const REVENUE_CATEGORIES = [
  { value: "royalty", label: "Royalty" },
  { value: "live", label: "Live / Touring" },
  { value: "merch", label: "Merchandise" },
  { value: "brand_deal", label: "Brand Deal" },
  { value: "show_fee", label: "Show Fee" },
  { value: "feature", label: "Feature" },
  { value: "publishing", label: "Publishing" },
  { value: "other", label: "Other" },
] as const;

// Map legacy values to consolidated categories
export const REVENUE_CATEGORY_ALIASES: Record<string, string> = {
  streaming: "royalty",
  sync: "royalty",
  licensing: "royalty",
};

export const REVENUE_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  REVENUE_CATEGORIES.map((c) => [c.value, c.label])
);
