import { useState, useEffect, useRef } from "react";
import { DraftItem } from "./PlanDraft";
import { CalendarRange, CheckCircle2, DollarSign, FolderOpen, ListTodo, Milestone } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface PlanExecutionFeedProps {
  items: DraftItem[];
  isComplete: boolean;
}

const typeLabels: Record<DraftItem["type"], string> = {
  campaign: "Campaign",
  task: "Task",
  milestone: "Milestone",
  budget: "Budget",
};

const typeIcons: Record<DraftItem["type"], React.ReactNode> = {
  campaign: <FolderOpen className="h-4 w-4" />,
  task: <ListTodo className="h-4 w-4" />,
  milestone: <Milestone className="h-4 w-4" />,
  budget: <DollarSign className="h-4 w-4" />,
};

const sectionOrder: DraftItem["type"][] = ["campaign", "task", "milestone", "budget"];

export function PlanExecutionFeed({ items, isComplete }: PlanExecutionFeedProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [activeSection, setActiveSection] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sort items by section order
  const sortedItems = [...items].sort(
    (a, b) => sectionOrder.indexOf(a.type) - sectionOrder.indexOf(b.type)
  );

  // Reveal items one by one
  useEffect(() => {
    if (visibleCount >= sortedItems.length) return;
    const delay = visibleCount === 0 ? 300 : 120 + Math.random() * 180;
    const timer = setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [visibleCount, sortedItems.length]);

  // Track which section we're currently building
  useEffect(() => {
    if (visibleCount === 0) return;
    const currentItem = sortedItems[visibleCount - 1];
    if (currentItem) {
      const idx = sectionOrder.indexOf(currentItem.type);
      if (idx !== activeSection) setActiveSection(idx);
    }
  }, [visibleCount, sortedItems, activeSection]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleCount]);

  const visibleItems = sortedItems.slice(0, visibleCount);
  const allRevealed = visibleCount >= sortedItems.length;

  // Group visible items by type for section headers
  const sections: { type: DraftItem["type"]; items: DraftItem[] }[] = [];
  let lastType: DraftItem["type"] | null = null;
  for (const item of visibleItems) {
    if (item.type !== lastType) {
      sections.push({ type: item.type, items: [item] });
      lastType = item.type;
    } else {
      sections[sections.length - 1].items.push(item);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center",
              isComplete ? "bg-green-500/20" : "bg-primary/20"
            )}>
              {isComplete ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isComplete ? "Plan Built!" : "Building your plan…"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isComplete
                ? `${items.length} items created successfully`
                : `Creating ${items.length} items — ${visibleCount} done`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", isComplete ? "bg-green-500" : "bg-primary")}
            initial={{ width: 0 }}
            animate={{ width: `${(visibleCount / Math.max(items.length, 1)) * 100}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>

        {/* Section tabs */}
        <div className="flex gap-3 mt-3">
          {sectionOrder.map((type, idx) => {
            const count = items.filter((i) => i.type === type).length;
            if (count === 0) return null;
            const revealed = visibleItems.filter((i) => i.type === type).length;
            const isActive = idx === activeSection && !allRevealed;
            const isDone = revealed === count;

            return (
              <div
                key={type}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-all",
                  isActive && "bg-primary/10 text-primary",
                  isDone && "text-green-600",
                  !isActive && !isDone && "text-muted-foreground"
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : isActive ? (
                  <div className="h-3 w-3 border-[1.5px] border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />
                )}
                {typeLabels[type]}
                <span className="opacity-60">{revealed}/{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrolling feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        <AnimatePresence>
          {sections.map((section) => (
            <motion.div
              key={section.type}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-muted-foreground">{typeIcons[section.type]}</span>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {typeLabels[section.type]}s
                </span>
              </div>

              <div className="space-y-1">
                {section.items.map((item, i) => (
                  <ExecutionRow key={item.id} item={item} index={i} />
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {!allRevealed && (
          <motion.div
            key="cursor"
            className="flex items-center gap-2 text-muted-foreground"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            <div className="h-4 w-[2px] bg-primary rounded-full" />
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ExecutionRow({ item, index }: { item: DraftItem; index: number }) {
  const [typed, setTyped] = useState("");
  const [showMeta, setShowMeta] = useState(false);
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    const title = item.title;
    let charIdx = 0;
    const speed = Math.max(12, 30 - title.length * 0.3);
    
    const interval = setInterval(() => {
      charIdx++;
      setTyped(title.slice(0, charIdx));
      if (charIdx >= title.length) {
        clearInterval(interval);
        setTimeout(() => setShowMeta(true), 60);
        setTimeout(() => setShowCheck(true), 200);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [item.title]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className="flex items-center gap-3 py-1.5 px-3 rounded-lg"
    >
      <div className="shrink-0">
        {showCheck ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </motion.div>
        ) : (
          <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium truncate", showCheck ? "text-foreground" : "text-foreground/80")}>
          {typed}
          {typed.length < item.title.length && (
            <span className="inline-block w-[2px] h-4 bg-primary ml-0.5 animate-pulse align-text-bottom" />
          )}
        </p>
        {showMeta && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 mt-0.5"
          >
            {item.date && (
              <span className="text-xs text-muted-foreground">{item.date}</span>
            )}
            {item.artist_name && (
              <span className="text-xs text-muted-foreground">· {item.artist_name}</span>
            )}
          </motion.div>
        )}
      </div>

      {item.amount != null && showMeta && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm font-semibold tabular-nums text-foreground shrink-0"
        >
          ${item.amount.toLocaleString()}
        </motion.span>
      )}
    </motion.div>
  );
}
