import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type MobileQuickActionsContextValue = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
};

const MobileQuickActionsContext = createContext<MobileQuickActionsContextValue>({
  isOpen: false,
  setIsOpen: () => {},
});

export function MobileQuickActionsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo(() => ({ isOpen, setIsOpen }), [isOpen]);
  return <MobileQuickActionsContext.Provider value={value}>{children}</MobileQuickActionsContext.Provider>;
}

export function useMobileQuickActions() {
  return useContext(MobileQuickActionsContext);
}
