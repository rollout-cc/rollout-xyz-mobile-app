import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, DollarSign, ListTodo, Milestone, Pencil, Sparkles, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type DraftItem = {
  id: string;
  type: "task" | "milestone" | "budget";
  title: string;
  description?: string;
  date?: string;
  amount?: number;
  artist_name?: string;
};

interface PlanDraftProps {
  items: DraftItem[];
  artistName: string;
  onConfirm: (items: DraftItem[]) => void;
  onCancel: () => void;
  isExecuting: boolean;
}

export function PlanDraft({ items: initialItems, artistName, onConfirm, onCancel, isExecuting }: PlanDraftProps) {
  const [items, setItems] = useState<DraftItem[]>(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const tasks = items.filter((i) => i.type === "task");
  const milestones = items.filter((i) => i.type === "milestone");
  const budgets = items.filter((i) => i.type === "budget");

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleEdit = (item: DraftItem) => {
    setEditingId(item.id);
    setEditValue(item.title);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editValue.trim()) return;
    setItems((prev) =>
      prev.map((i) => (i.id === editingId ? { ...i, title: editValue.trim() } : i))
    );
    setEditingId(null);
    setEditValue("");
  };

  const renderItemRow = (item: DraftItem) => {
    const isEditing = editingId === item.id;
    return (
      <div key={item.id} className="flex items-center gap-3 px-4 py-3 group">
        {item.type === "task" && <ListTodo className="h-4 w-4 text-muted-foreground shrink-0" />}
        {item.type === "milestone" && <Milestone className="h-4 w-4 text-muted-foreground shrink-0" />}
        {item.type === "budget" && <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />}

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="h-7 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                  if (e.key === "Escape") setEditingId(null);
                }}
              />
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleSaveEdit}>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <p className="text-sm font-medium truncate">{item.title}</p>
          )}
          {!isEditing && item.date && (
            <p className="text-xs text-muted-foreground">{item.date}</p>
          )}
        </div>

        {item.amount != null && !isEditing && (
          <span className="text-sm font-medium tabular-nums text-muted-foreground">
            ${item.amount.toLocaleString()}
          </span>
        )}

        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground"
              onClick={() => handleEdit(item)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-destructive/10 text-destructive"
              onClick={() => handleDelete(item.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Draft Plan</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Review and edit before Rolly creates everything for <span className="font-medium text-foreground">{artistName}</span>.
          </p>
        </div>

        {tasks.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                Tasks
                <Badge variant="secondary" className="ml-auto">{tasks.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {tasks.map(renderItemRow)}
              </div>
            </CardContent>
          </Card>
        )}

        {milestones.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Milestone className="h-4 w-4" />
                Milestones
                <Badge variant="secondary" className="ml-auto">{milestones.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {milestones.map(renderItemRow)}
              </div>
            </CardContent>
          </Card>
        )}

        {budgets.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Budgets
                <Badge variant="secondary" className="ml-auto">{budgets.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {budgets.map(renderItemRow)}
              </div>
            </CardContent>
          </Card>
        )}

        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            All items removed. Cancel to go back.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-background">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isExecuting}>
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => onConfirm(items)}
          disabled={items.length === 0 || isExecuting}
        >
          {isExecuting ? (
            <>
              <span className="relative flex h-3 w-3 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-foreground" />
              </span>
              Creating...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Create {items.length} item{items.length !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
