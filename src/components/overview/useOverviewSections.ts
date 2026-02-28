import { useState, useCallback } from "react";

export interface SectionConfig {
  id: string;
  label: string;
}

export const ALL_SECTIONS: SectionConfig[] = [
  { id: "kpis", label: "KPI Cards" },
  { id: "budget-utilization", label: "Budget Utilization" },
  { id: "quarterly-pnl", label: "Quarterly P&L" },
  { id: "spending-per-act", label: "Spending Per Act" },
];

const DEFAULT_ORDER = ALL_SECTIONS.map((s) => s.id);
const STORAGE_ORDER_KEY = "overview-section-order";
const STORAGE_HIDDEN_KEY = "overview-section-hidden";

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
    // Merge in any new sections not yet persisted
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

  const setOrder = useCallback((newOrder: string[]) => {
    setOrderState(newOrder);
    localStorage.setItem(STORAGE_ORDER_KEY, JSON.stringify(newOrder));
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

  const visibleSections = order.filter((id) => !hidden.has(id));
  const hiddenSections = ALL_SECTIONS.filter((s) => hidden.has(s.id));

  return {
    visibleSections,
    hiddenSections,
    collapsed,
    order,
    setOrder,
    toggleVisibility,
    showSection,
    toggleCollapse,
  };
}
