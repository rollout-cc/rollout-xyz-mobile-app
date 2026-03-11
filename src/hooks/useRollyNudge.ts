import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NudgeResult {
  nudge: string | null;
  ctaPrompt: string | null;
  dismissed: boolean;
  dismiss: () => void;
}

export function useRollyNudge(
  screen: string,
  dataSnapshot: Record<string, any>,
  entityId?: string
): NudgeResult {
  const cacheKey = `rolly-nudge:${screen}:${entityId || "global"}`;
  const [nudge, setNudge] = useState<string | null>(null);
  const [ctaPrompt, setCtaPrompt] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const fetched = useRef(false);

  useEffect(() => {
    // Check if already dismissed or cached this session
    const cached = sessionStorage.getItem(cacheKey);
    if (cached === "dismissed") {
      setDismissed(true);
      return;
    }
    if (cached && cached !== "dismissed") {
      try {
        const parsed = JSON.parse(cached);
        setNudge(parsed.nudge);
        setCtaPrompt(parsed.ctaPrompt);
        return;
      } catch {}
    }

    if (fetched.current) return;
    fetched.current = true;

    // Debounce — only fire after 2s on screen
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("rolly-nudge", {
          body: { screen, data_snapshot: dataSnapshot },
        });
        if (error) throw error;
        if (data?.nudge) {
          setNudge(data.nudge);
          setCtaPrompt(data.cta_prompt || null);
          sessionStorage.setItem(cacheKey, JSON.stringify({ nudge: data.nudge, ctaPrompt: data.cta_prompt }));
        }
      } catch (err) {
        console.error("Rolly nudge error:", err);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [screen, entityId]); // intentionally not including dataSnapshot to avoid re-fetching

  const dismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(cacheKey, "dismissed");
  };

  return { nudge, ctaPrompt, dismissed, dismiss };
}
