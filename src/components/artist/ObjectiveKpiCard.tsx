import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Target, TrendingUp, Headphones, DollarSign, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Objective types that map to real tracked data */
export const OBJECTIVE_TYPES = [
  { value: "monthly_listeners", label: "Monthly Listeners", icon: Headphones, unit: "" },
  { value: "monthly_streams", label: "Monthly Streams", icon: TrendingUp, unit: "" },
  { value: "daily_streams", label: "Daily Streams", icon: TrendingUp, unit: "" },
  { value: "est_monthly_revenue", label: "Monthly Revenue", icon: DollarSign, unit: "$" },
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
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

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

  const handleSetTarget = () => {
    const num = parseFloat(targetInput.replace(/,/g, ""));
    if (isNaN(num) || num <= 0) return;
    save.mutate({ [targetKey]: num });
  };

  const handleClear = () => {
    save.mutate({ [typeKey]: null, [targetKey]: null });
  };

  const isBanner = variant === "banner";
  const cardBase = isBanner
    ? "rounded-xl border border-white/[0.14] bg-black/30 backdrop-blur-xl shadow-lg"
    : "rounded-xl border border-border bg-card shadow-sm";

  // Empty state — show picker
  if (!objectiveType) {
    return (
      <div ref={pickerRef} className={cn(cardBase, "relative")}>
        {showPicker ? (
          <div className={cn("p-2 min-w-[160px]", isBanner ? "text-white" : "text-foreground")}>
            <p className="text-[9px] font-bold uppercase tracking-wider opacity-50 mb-1.5 px-1">
              Select Objective
            </p>
            {OBJECTIVE_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => handleSelectType(t.value)}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs font-medium transition-colors text-left",
                  isBanner
                    ? "hover:bg-white/10"
                    : "hover:bg-accent"
                )}
              >
                <t.icon className="h-3 w-3 opacity-60" />
                {t.label}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => setShowPicker(true)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5",
              isBanner ? "text-white/40 hover:text-white/70" : "text-muted-foreground hover:text-foreground",
              "transition-colors text-xs"
            )}
          >
            <Target className="h-3 w-3" />
            <span>Set Goal</span>
          </button>
        )}
      </div>
    );
  }

  // Has type but no target yet AND editTarget is active — show target-first view
  if (editTarget && objectiveTarget == null) {
    return (
      <div className={cn(cardBase, "relative", isBanner ? "px-3 py-2.5" : "px-3.5 py-3")}>
        <p
          className={cn(
            "text-[9px] font-bold uppercase tracking-[0.12em] mb-1.5 leading-none",
            isBanner ? "text-white/45" : "text-muted-foreground"
          )}
        >
          {typeDef?.label ?? "Objective"}
        </p>
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-3 w-3 shrink-0", isBanner ? "text-emerald-400" : "text-primary")} />
          <input
            type="text"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSetTarget(); if (e.key === "Escape") { setEditTarget(false); } }}
            placeholder="Enter target…"
            autoFocus
            className={cn(
              "w-20 text-sm font-bold bg-transparent outline-none border-b",
              isBanner ? "text-white border-white/20 placeholder:text-white/30" : "text-foreground border-border placeholder:text-muted-foreground/40"
            )}
          />
          <button
            onClick={handleSetTarget}
            className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded",
              isBanner ? "text-white/60 hover:text-white hover:bg-white/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            Set
          </button>
        </div>
      </div>
    );
  }

  // Has type, compute progress
  const progress = objectiveTarget && currentValue != null
    ? Math.min((currentValue / objectiveTarget) * 100, 100)
    : null;

  return (
    <div className={cn(cardBase, "relative group/obj", isBanner ? "px-3 py-2.5" : "px-3.5 py-3")}>
      {/* Clear button */}
      <button
        onClick={handleClear}
        className={cn(
          "absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center opacity-0 group-hover/obj:opacity-100 transition-opacity",
          isBanner
            ? "bg-white/20 text-white hover:bg-white/30"
            : "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        )}
      >
        <X className="h-2.5 w-2.5" />
      </button>

      <p
        className={cn(
          "text-[9px] font-bold uppercase tracking-[0.12em] mb-1 leading-none",
          isBanner ? "text-white/45" : "text-muted-foreground"
        )}
      >
        {typeDef?.label ?? "Objective"}
      </p>

      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3 w-3 shrink-0", isBanner ? "text-emerald-400" : "text-primary")} />
        <span
          className={cn(
            "text-sm font-bold tracking-tight tabular-nums leading-none",
            isBanner ? "text-white" : "text-foreground"
          )}
        >
          {currentValue != null
            ? formatValue(currentValue, typeDef?.unit ?? "")
            : "—"}
        </span>
      </div>

      {/* Target & progress */}
      {objectiveTarget != null ? (
        <div className="mt-1.5">
          <div className="flex items-center justify-between mb-0.5">
            <span
              className={cn(
                "text-[9px] font-medium tabular-nums",
                isBanner ? "text-white/40" : "text-muted-foreground"
              )}
            >
              Goal: {formatValue(objectiveTarget, typeDef?.unit ?? "")}
            </span>
            {progress != null && (
              <span
                className={cn(
                  "text-[9px] font-bold tabular-nums",
                  progress >= 100
                    ? "text-emerald-400"
                    : progress >= 75
                    ? isBanner ? "text-amber-300" : "text-amber-500"
                    : isBanner ? "text-white/50" : "text-muted-foreground"
                )}
              >
                {Math.round(progress)}%
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div
            className={cn(
              "h-1 rounded-full overflow-hidden",
              isBanner ? "bg-white/10" : "bg-muted"
            )}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progress != null && progress >= 100
                  ? "bg-emerald-400"
                  : "bg-primary"
              )}
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditTarget(true)}
          className={cn(
            "mt-1 text-[9px] font-medium transition-colors",
            isBanner ? "text-white/30 hover:text-white/60" : "text-muted-foreground/40 hover:text-muted-foreground"
          )}
        >
          + Set target
        </button>
      )}
    </div>
  );
}
