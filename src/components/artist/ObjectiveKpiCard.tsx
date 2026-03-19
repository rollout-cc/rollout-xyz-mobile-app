import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Target, TrendingUp, Headphones, DollarSign, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Objective types that map to real tracked data */
export const OBJECTIVE_TYPES = [
  { value: "monthly_listeners", label: "Monthly Listeners", icon: Headphones, unit: "" },
  { value: "monthly_streams", label: "Monthly Streams", icon: TrendingUp, unit: "" },
  { value: "daily_streams", label: "Daily Streams", icon: TrendingUp, unit: "" },
  { value: "est_monthly_revenue", label: "Monthly Revenue", icon: DollarSign, unit: "$" },
  { value: "merch_revenue", label: "Merch Revenue", icon: DollarSign, unit: "$" },
  { value: "gross_revenue", label: "Gross Revenue", icon: DollarSign, unit: "$" },
] as const;

export type ObjectiveType = (typeof OBJECTIVE_TYPES)[number]["value"];

function formatValue(n: number, unit: string): string {
  const prefix = unit === "$" ? "$" : "";
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${prefix}${n.toLocaleString()}`;
}

interface ObjectiveKpiCardProps {
  artistId: string;
  /** 1 or 2 */
  slot: 1 | 2;
  objectiveType: string | null;
  objectiveTarget: number | null;
  currentValue: number | null;
  /** Banner overlay variant (dark glass) or normal card */
  variant?: "banner" | "card";
}

export function ObjectiveKpiCard({
  artistId,
  slot,
  objectiveType,
  objectiveTarget,
  currentValue,
  variant = "banner",
}: ObjectiveKpiCardProps) {
  const queryClient = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);
  const [editTarget, setEditTarget] = useState(false);
  const [targetInput, setTargetInput] = useState("");

  // Record a monthly snapshot whenever we have an active objective with a current value
  useEffect(() => {
    if (!objectiveType || objectiveTarget == null || currentValue == null) return;
    const today = new Date().toISOString().split("T")[0];
    // Use an async IIFE — upsert silently (conflict = already logged today)
    (async () => {
      await supabase.from("objective_snapshots").upsert({
        artist_id: artistId,
        slot,
        objective_type: objectiveType,
        recorded_value: currentValue,
        target_value: objectiveTarget,
        recorded_at: today,
        is_baseline: false,
      } as any, { onConflict: "artist_id,slot,recorded_at" });
    })();
  }, [artistId, slot, objectiveType, objectiveTarget, currentValue]);

  const typeDef = OBJECTIVE_TYPES.find((t) => t.value === objectiveType);
  const Icon = typeDef?.icon ?? Target;

  const save = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      const { error } = await supabase.from("artists").update(patch).eq("id", artistId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist", artistId] });
      setShowPicker(false);
      setEditTarget(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const typeKey = `objective_${slot}_type`;
  const targetKey = `objective_${slot}_target`;

  const handleSelectType = (type: string) => {
    save.mutate({ [typeKey]: type, [targetKey]: null });
    setEditTarget(true);
    setTargetInput("");
  };

  const handleSetTarget = async () => {
    const num = parseFloat(targetInput.replace(/,/g, ""));
    if (isNaN(num) || num <= 0) return;
    save.mutate({ [targetKey]: num });

    // Record baseline snapshot
    const selectedType = objectiveType || OBJECTIVE_TYPES.find(() => true)?.value;
    if (selectedType) {
      await supabase.from("objective_snapshots").upsert({
        artist_id: artistId,
        slot,
        objective_type: selectedType,
        recorded_value: currentValue ?? 0,
        target_value: num,
        recorded_at: new Date().toISOString().split("T")[0],
        is_baseline: true,
      } as any, { onConflict: "artist_id,slot,recorded_at" });
    }
  };

  const handleClear = () => {
    save.mutate({ [typeKey]: null, [targetKey]: null });
  };

  const isBanner = variant === "banner";
  const cardBase = isBanner
    ? "flex h-full min-h-[5rem] min-w-0 w-full flex-col rounded-md border border-border bg-card/90 p-3 text-foreground shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-black/25 dark:text-zinc-50 dark:shadow-none"
    : "rounded-xl border border-border bg-card shadow-sm";

  // Empty state — picker opens in a portaled popover over the banner, not inline
  if (!objectiveType) {
    return (
      <Popover open={showPicker} onOpenChange={setShowPicker}>
        <div
          className={cn(
            cardBase,
            "relative items-center justify-center",
            !isBanner && "flex min-h-[5rem] flex-col",
          )}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-[calc(var(--radius)-2px)] px-3 py-2 text-center text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isBanner
                  ? "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Target
                className={cn(
                  "h-4 w-4 shrink-0",
                  isBanner && "text-muted-foreground dark:text-white/45",
                )}
              />
              <span className="font-medium">Set goal</span>
            </button>
          </PopoverTrigger>
        </div>
        <PopoverContent
          align="start"
          side="top"
          sideOffset={8}
          collisionPadding={12}
          className="z-[100] w-[min(calc(100vw-1.5rem),17.5rem)] border-border bg-popover p-2 text-popover-foreground shadow-lg"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Select objective
          </p>
          <div className="max-h-[min(55vh,19rem)] overflow-y-auto overscroll-contain">
            {OBJECTIVE_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => handleSelectType(t.value)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <t.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {t.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Has type but no target yet AND editTarget is active — show target-first view
  if (editTarget && objectiveTarget == null) {
    const parsedInput = parseFloat(targetInput.replace(/,/g, ""));
    const isBelowCurrent = !isNaN(parsedInput) && parsedInput > 0 && currentValue != null && parsedInput < currentValue;

    return (
      <div className={cn(cardBase, "relative", !isBanner && "px-3.5 py-3")}>
        <p
          className={cn(
            "font-semibold uppercase tracking-wider",
            isBanner
              ? "text-[10px] leading-none py-[2px] text-muted-foreground dark:text-white/45"
              : "text-xs leading-none text-muted-foreground",
          )}
        >
          {typeDef?.label ?? "Objective"}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <Icon className={cn("h-4 w-4 shrink-0", isBanner ? "text-muted-foreground dark:text-white/50" : "text-primary")} />
          <input
            type="text"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSetTarget(); if (e.key === "Escape") { setEditTarget(false); } }}
            placeholder="Enter target…"
            autoFocus
            className={cn(
              "w-20 text-sm font-bold bg-transparent outline-none border-b",
              isBelowCurrent
                ? "text-amber-600 border-amber-500/50 placeholder:text-amber-500/40 dark:text-amber-400 dark:border-amber-400/40 dark:placeholder:text-amber-400/30"
                : isBanner
                  ? "border-border text-foreground placeholder:text-muted-foreground/50 dark:border-white/25 dark:text-white dark:placeholder:text-white/35"
                  : "border-border text-foreground placeholder:text-muted-foreground/40",
            )}
          />
          <button
            type="button"
            onClick={handleSetTarget}
            className={cn(
              "rounded px-1.5 py-0.5 text-xs font-medium",
              isBanner
                ? "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            Set
          </button>
        </div>
        {isBelowCurrent && (
          <p className={cn(
            "mt-1 text-xs font-medium leading-tight",
            isBanner ? "text-amber-600 dark:text-amber-400/80" : "text-amber-500",
          )}>
            Below current ({formatValue(currentValue!, typeDef?.unit ?? "")})
          </p>
        )}
      </div>
    );
  }

  // Has type, compute progress
  const progress = objectiveTarget && currentValue != null
    ? Math.min((currentValue / objectiveTarget) * 100, 100)
    : null;

  return (
    <div className={cn(cardBase, "relative group/obj", !isBanner && "px-3.5 py-3")}>
      {/* Clear button */}
      <button
        type="button"
        onClick={handleClear}
        className={cn(
          "absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full opacity-0 transition-opacity group-hover/obj:opacity-100",
          isBanner
            ? "bg-muted text-muted-foreground hover:bg-muted/80 dark:bg-white/20 dark:text-white dark:hover:bg-white/30"
            : "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
        )}
      >
        <X className="h-2.5 w-2.5" />
      </button>

      <p
        className={cn(
          "font-semibold uppercase tracking-wider",
          isBanner
            ? "text-[10px] leading-none py-[2px] text-muted-foreground dark:text-white/45"
            : "text-xs leading-none text-muted-foreground",
        )}
      >
        {typeDef?.label ?? "Objective"}
      </p>

      <div className="mt-1 flex items-center gap-2">
        <Icon className={cn("h-4 w-4 shrink-0", isBanner ? "text-muted-foreground dark:text-white/50" : "text-primary")} />
        <span
          className={cn(
            "text-xl font-semibold tabular-nums leading-none tracking-tight",
            isBanner ? "text-foreground dark:text-white" : "text-foreground",
          )}
        >
          {currentValue != null
            ? formatValue(currentValue, typeDef?.unit ?? "")
            : "—"}
        </span>
        {objectiveTarget != null && progress != null && (
          <span
            className={cn(
              "text-xs font-semibold tabular-nums",
              progress >= 100
                ? "text-emerald-600 dark:text-emerald-400"
                : progress >= 75
                  ? "text-amber-600 dark:text-amber-300"
                  : "text-muted-foreground dark:text-white/50",
            )}
          >
            {Math.round(progress)}%
          </span>
        )}
      </div>

      {/* Inline progress bar when target is set */}
      {objectiveTarget != null && (
        <div className={cn("mt-auto w-full min-w-0 pt-3", isBanner && "shrink-0")}>
          <div
            className={cn(
              "h-0.5 w-full overflow-hidden rounded-full",
              isBanner ? "bg-muted dark:bg-white/10" : "bg-muted",
            )}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progress != null && progress >= 100
                  ? "bg-emerald-500 dark:bg-emerald-400"
                  : "bg-amber-500 dark:bg-amber-400",
              )}
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
        </div>
      )}
      {objectiveTarget == null && (
        <button
          type="button"
          onClick={() => setEditTarget(true)}
          className={cn(
            "mt-auto pt-3 text-sm font-medium transition-colors",
            isBanner
              ? "text-muted-foreground hover:text-foreground dark:text-white/40 dark:hover:text-white/70"
              : "text-muted-foreground/80 hover:text-muted-foreground",
          )}
        >
          + Set target
        </button>
      )}
    </div>
  );
}
