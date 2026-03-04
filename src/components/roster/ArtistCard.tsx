import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Headphones, FolderOpen, CheckCircle2, DollarSign, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ArtistCardProps {
  artist: any;
  onClick: () => void;
  onEdit?: () => void;
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

export const ArtistCard = React.memo(function ArtistCard({ artist, onClick, onEdit, onDelete, dragHandleProps, innerRef, draggableProps, insideFolder, onRemoveFromFolder }: ArtistCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const initiativeCount = artist.initiatives?.[0]?.count ?? 0;
  const taskCount = artist.tasks?.[0]?.count ?? 0;
  const listeners = artist.monthly_listeners ?? 0;

  const budgets: { label: string; amount: number }[] = (artist.budgets || []).slice(0, 3);
  const totalBudget = budgets.reduce((s: number, b: any) => s + Number(b.amount || 0), 0);
  const totalSpending = (artist.transactions || [])
    .filter((t: any) => t.type === "expense")
    .reduce((s: number, t: any) => s + Math.abs(Number(t.amount || 0)), 0);

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
                {onEdit && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
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

            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {formatNum(totalSpending)}
              </span>
              <span className="flex items-center gap-1" title="Monthly Listeners">
                <Headphones className="h-3 w-3" />
                {listeners > 0 ? formatNum(listeners) : "—"}
              </span>
              <span className="flex items-center gap-1">
                <FolderOpen className="h-3 w-3" />
                {initiativeCount}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {taskCount}
              </span>
            </div>
          </div>
        </div>

        {budgets.length > 0 && (
          <div className="px-4 pb-4 space-y-2">
            {budgets.map((b: any, i: number) => {
              const pct = totalBudget > 0 ? (Number(b.amount) / totalBudget) * 100 : 0;
              return (
                <div key={i}>
                  <div className="text-xs font-medium mb-0.5">{b.label}</div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
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
