import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ItemEditorUiContextValue = {
  /** True while at least one ItemEditor trigger suggestion list (@, #, $, …) is open */
  suggestionsMenuOpen: boolean;
  beginSuggestions: () => void;
  endSuggestions: () => void;
};

const ItemEditorUiContext = createContext<ItemEditorUiContextValue>({
  suggestionsMenuOpen: false,
  beginSuggestions: () => {},
  endSuggestions: () => {},
});

export function ItemEditorUiProvider({ children }: { children: ReactNode }) {
  const [openCount, setOpenCount] = useState(0);

  const beginSuggestions = useCallback(() => {
    setOpenCount((c) => c + 1);
  }, []);

  const endSuggestions = useCallback(() => {
    setOpenCount((c) => Math.max(0, c - 1));
  }, []);

  const value = useMemo(
    () => ({
      suggestionsMenuOpen: openCount > 0,
      beginSuggestions,
      endSuggestions,
    }),
    [openCount, beginSuggestions, endSuggestions]
  );

  return <ItemEditorUiContext.Provider value={value}>{children}</ItemEditorUiContext.Provider>;
}

export function useItemEditorUi() {
  return useContext(ItemEditorUiContext);
}
