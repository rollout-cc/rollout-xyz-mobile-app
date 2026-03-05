import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Headphones, FolderOpen, CheckCircle2, DollarSign, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { REVENUE_CATEGORY_LABELS } from "@/lib/revenueCategories";

interface ArtistCardProps {
  artist: any;
  onClick: () => void;
  onDelete?: () => void;
  dragHandleProps?: Record<string, any>;
  innerRef?: (el: HTMLElement | null) => void;
  draggableProps?: Record<string, any>;
  insideFolder?: boolean;
  onRemoveFromFolder?: () => void;
}

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

type BarView = "revenue" | "spending";

export const ArtistCard = React.memo(function ArtistCard({ artist, onClick, onDelete, dragHandleProps, innerRef, draggableProps, insideFolder, onRemoveFromFolder }: ArtistCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [barView, setBarView] = useState<BarView>("revenue");
  const initiativeCount = artist.initiatives?.[0]?.count ?? 0;
  const taskCount = artist.tasks?.[0]?.count ?? 0;
  const listeners = artist.monthly_listeners ?? 0;

  const budgets: { label: string; amount: number; id: string }[] = (artist.budgets || []).slice(0, 3);
  const transactions: any[] = artist.transactions || [];

  const totalSpending = transactions
    .filter((t: any) => t.type === "expense")
    .reduce((s: number, t: any) => s + Math.abs(Number(t.amount || 0)), 0);
  const totalRevenue = transactions
    .filter((t: any) => t.type === "revenue")
    .reduce((s: number, t: any) => s + Math.abs(Number(t.amount || 0)), 0);

  // Spending by budget for burn rate bars
  const spendingByBudget = (budgetId: string) =>
    transactions
      .filter((t: any) => t.type === "expense" && t.budget_id === budgetId)
      .reduce((s: number, t: any) => s + Math.abs(Number(t.amount || 0)), 0);

  // Revenue grouped by category for proportional bars
  const revenueByCategory = (() => {
    const cats: Record<string, number> = {};
    transactions
      .filter((t: any) => t.type === "revenue")
      .forEach((t: any) => {
        const cat = t.revenue_category || "uncategorized";
        cats[cat] = (cats[cat] || 0) + Math.abs(Number(t.amount || 0));
      });
    return Object.entries(cats)
      .map(([key, amount]) => ({ key, label: REVENUE_CATEGORY_LABELS[key] || "Uncategorized", amount }))
      .sort((a, b) => b.amount - a.amount);
  })();

  const hasBars = barView === "spending" ? budgets.length > 0 : revenueByCategory.length > 0;

  return (
    <>
      <div
        ref={innerRef}
        {...(draggableProps || {})}
        {...(dragHandleProps || {})}
        onClick={onClick}
        className="relative flex flex-col rounded-xl overflow-hidden cursor-pointer group border border-border bg-card hover:shadow-md transition-shadow"
      >
        {/* Top section: avatar + stats */}
        <div className="flex items-start gap-3 p-4 pb-3">
          <Avatar className="h-24 w-24 shrink-0 border-2 border-border">
            <AvatarImage src={artist.avatar_url ?? undefined} className="object-cover" />
            <AvatarFallback className="text-2xl font-bold">{artist.name?.[0]}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-start justify-between gap-1">
              <h3 className="text-sm font-semibold truncate">{artist.name}</h3>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {onDelete && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                {insideFolder && onRemoveFromFolder && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={(e) => { e.stopPropagation(); onRemoveFromFolder(); }}>
                    Remove
                  </Button>
                )}
              </div>
            </div>

            {/* Badge pills for revenue & spent */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[11px] px-2 py-0.5 font-semibold gap-1">
                <DollarSign className="h-3 w-3" />
                {formatNum(totalRevenue)}
              </Badge>
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[11px] px-2 py-0.5 font-semibold gap-1">
                <DollarSign className="h-3 w-3" />
                {formatNum(totalSpending)}
              </Badge>
              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground" title="Monthly Listeners">
                <Headphones className="h-3 w-3" />
                {listeners > 0 ? formatNum(listeners) : "—"}
              </span>
              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <FolderOpen className="h-3 w-3" />
                {initiativeCount}
              </span>
              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <CheckCircle2 className="h-3 w-3" />
                {taskCount}
              </span>
            </div>
          </div>
        </div>

        {/* Pill switcher + progress bars */}
        {(budgets.length > 0 || revenueByCategory.length > 0) && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-1 mb-2.5">
              <button
                onClick={(e) => { e.stopPropagation(); setBarView("revenue"); }}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                  barView === "revenue"
                    ? "bg-emerald-500/15 text-emerald-600"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                Revenue
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setBarView("spending"); }}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                  barView === "spending"
                    ? "bg-destructive/15 text-destructive"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                Spending
              </button>
            </div>
            <div className="space-y-2">
              {barView === "spending" && budgets.map((b: any, i: number) => {
                const budgetAmt = Number(b.amount || 0);
                const spent = spendingByBudget(b.id);
                const pct = budgetAmt > 0 ? (spent / budgetAmt) * 100 : 0;
                const barColor = pct > 90 ? "bg-destructive" : pct > 70 ? "bg-amber-500" : "bg-emerald-500";
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium">{b.label}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        ${formatNum(spent)} / ${formatNum(budgetAmt)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {barView === "revenue" && (revenueByCategory.length > 0 ? (
                revenueByCategory.slice(0, 3).map((cat) => {
                  const pct = totalRevenue > 0 ? (cat.amount / totalRevenue) * 100 : 0;
                  return (
                    <div key={cat.key}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium">{cat.label}</span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          ${formatNum(cat.amount)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all bg-emerald-500"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-[10px] text-muted-foreground">No revenue recorded</p>
              ))}
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{artist.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this artist and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onDelete?.(); setShowDeleteConfirm(false); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
