import { cn } from "@/lib/utils";

interface RadialProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label: string;
  detail: string;
  className?: string;
}

export function RadialProgress({ value, size = 56, strokeWidth = 4, label, detail, className }: RadialProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(value, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;

  const color =
    clamped > 90 ? "stroke-destructive" : clamped > 70 ? "stroke-amber-500" : "stroke-emerald-500";

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn("transition-all duration-500", color)}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
          {clamped.toFixed(0)}%
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground truncate max-w-[72px] text-center leading-tight">{label}</span>
      <span className="text-[9px] text-muted-foreground/60 whitespace-nowrap">{detail}</span>
    </div>
  );
}
