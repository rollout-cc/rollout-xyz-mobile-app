export const REVENUE_CATEGORIES = [
  { value: "streaming", label: "Streaming" },
  { value: "sync", label: "Sync" },
  { value: "live", label: "Live / Touring" },
  { value: "merch", label: "Merchandise" },
  { value: "brand_deal", label: "Brand Deal" },
  { value: "show_fee", label: "Show Fee" },
  { value: "feature", label: "Feature" },
  { value: "royalty", label: "Royalty" },
  { value: "publishing", label: "Publishing" },
  { value: "licensing", label: "Licensing" },
  { value: "other", label: "Other" },
] as const;

export const REVENUE_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  REVENUE_CATEGORIES.map((c) => [c.value, c.label])
);
