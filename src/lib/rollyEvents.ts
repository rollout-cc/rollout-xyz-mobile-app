// Lightweight event emitter for cross-component communication (Rolly nudge → FAB)
type Listener = (prompt: string) => void;
const listeners = new Set<Listener>();

export const rollyEvents = {
  onOpenWithPrompt(fn: Listener) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  openWithPrompt(prompt: string) {
    listeners.forEach((fn) => fn(prompt));
  },
};
