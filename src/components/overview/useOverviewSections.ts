import { useState, useCallback } from "react";

export interface SectionConfig {
  id: string;
  label: string;
}

export const ALL_SECTIONS: SectionConfig[] = [
  { id: "kpis", label: "Financial Snapshot" },
  { id: "budget-utilization", label: "Overall Company Spend" },
  { id: "quarterly-pnl", label: "Quarterly P&L" },
  { id: "spending-per-act", label: "Spending Per Act" },
  { id: "staff-productivity", label: "Team Metrics" },
  { id: "ar-pipeline", label: "A&R Pipeline" },
  { id: "streaming-trends", label: "Streaming Trends" },
];

const DEFAULT_ORDER = ALL_SECTIONS.map((s) => s.id);
const STORAGE_ORDER_KEY = "overview-section-order";
const STORAGE_HIDDEN_KEY = "overview-section-hidden";
const STORAGE_HERO_KEY = "overview-hero-section";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function useOverviewSections() {
  const [order, setOrderState] = useState<string[]>(() => {
    const saved = readJson<string[]>(STORAGE_ORDER_KEY, DEFAULT_ORDER);
    const merged = [...saved];
    for (const id of DEFAULT_ORDER) {
      if (!merged.includes(id)) merged.push(id);
    }
    return merged;
  });

  const [hidden, setHiddenState] = useState<Set<string>>(
    () => new Set(readJson<string[]>(STORAGE_HIDDEN_KEY, []))
  );

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const [heroSection, setHeroSectionState] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_HERO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const setOrder = useCallback((newVisibleOrder: string[]) => {
    setOrderState((prev) => {
      const hiddenInOrder = prev.filter((id) => !newVisibleOrder.includes(id));
      const full = [...newVisibleOrder, ...hiddenInOrder];
      localStorage.setItem(STORAGE_ORDER_KEY, JSON.stringify(full));
      return full;
    });
  }, []);

  const toggleVisibility = useCallback((id: string) => {
    setHiddenState((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(STORAGE_HIDDEN_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const showSection = useCallback((id: string) => {
    setOrderState((prev) => {
      if (!prev.includes(id)) {
        const updated = [...prev, id];
        localStorage.setItem(STORAGE_ORDER_KEY, JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
    setHiddenState((prev) => {
      const next = new Set(prev);
      next.delete(id);
      localStorage.setItem(STORAGE_HIDDEN_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setHeroSection = useCallback((id: string | null) => {
    setHeroSectionState(id);
    localStorage.setItem(STORAGE_HERO_KEY, JSON.stringify(id));
  }, []);

  const visibleSections = order.filter((id) => !hidden.has(id));
  const hiddenSections = ALL_SECTIONS.filter((s) => hidden.has(s.id));

  return {
    visibleSections,
    hiddenSections,
    collapsed,
    order,
    heroSection,
    setOrder,
    toggleVisibility,
    showSection,
    toggleCollapse,
    setHeroSection,
  };
}
