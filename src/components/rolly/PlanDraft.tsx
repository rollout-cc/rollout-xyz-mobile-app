import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, DollarSign, FolderOpen, ListTodo, Milestone, Pencil, Sparkles, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type DraftItem = {
  id: string;
  type: "task" | "milestone" | "budget" | "campaign";
  title: string;
  description?: string;
  date?: string;
  end_date?: string;
  amount?: number;
  artist_name?: string;
  campaign_name?: string;
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

  const campaigns = items.filter((i) => i.type === "campaign");
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

  const typeIcon = (type: DraftItem["type"]) => {
    switch (type) {
      case "campaign": return <FolderOpen className="h-4 w-4 text-white/40 shrink-0" />;
      case "task": return <ListTodo className="h-4 w-4 text-white/40 shrink-0" />;
      case "milestone": return <Milestone className="h-4 w-4 text-white/40 shrink-0" />;
      case "budget": return <DollarSign className="h-4 w-4 text-white/40 shrink-0" />;
    }
  };

  const renderItemRow = (item: DraftItem) => {
    const isEditing = editingId === item.id;
    return (
      <div key={item.id} className="flex items-center gap-3 px-4 py-3 group">
        {typeIcon(item.type)}

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="h-7 text-sm bg-white/10 border-white/15 text-white rounded-lg"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                  if (e.key === "Escape") setEditingId(null);
                }}
              />
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-white/60 hover:text-white" onClick={handleSaveEdit}>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <p className="text-sm font-medium truncate text-white">{item.title}</p>
          )}
          {!isEditing && item.date && (
            <p className="text-xs text-white/40">{item.date}{item.end_date ? ` → ${item.end_date}` : ""}</p>
          )}
        </div>

        {item.amount != null && !isEditing && (
          <span className="text-sm font-medium tabular-nums text-white/50">
            ${item.amount.toLocaleString()}
          </span>
        )}

        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-white/10 text-white/40"
              onClick={() => handleEdit(item)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-red-500/20 text-red-400"
              onClick={() => handleDelete(item.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderSection = (title: string, icon: React.ReactNode, sectionItems: DraftItem[]) => {
    if (sectionItems.length === 0) return null;
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10">
          {icon}
          <span className="text-xs font-bold uppercase tracking-wide text-white/60">{title}</span>
          <Badge variant="secondary" className="ml-auto bg-white/10 text-white/60 text-[10px]">{sectionItems.length}</Badge>
        </div>
        <div className="divide-y divide-white/5">
          {sectionItems.map(renderItemRow)}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[hsl(0,0%,5%)] text-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-white" />
            <h2 className="text-base font-bold text-white">Your Plan</h2>
          </div>
          <p className="text-xs text-white/50">
            Review and edit before Rolly creates everything for <span className="font-semibold text-white/80">{artistName}</span>.
          </p>
        </div>

        {renderSection("Campaigns", <FolderOpen className="h-3.5 w-3.5 text-white/40" />, campaigns)}
        {renderSection("Tasks", <ListTodo className="h-3.5 w-3.5 text-white/40" />, tasks)}
        {renderSection("Milestones", <Milestone className="h-3.5 w-3.5 text-white/40" />, milestones)}
        {renderSection("Budgets", <DollarSign className="h-3.5 w-3.5 text-white/40" />, budgets)}

        {items.length === 0 && (
          <p className="text-sm text-white/40 text-center py-8">
            All items removed. Cancel to go back.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 shrink-0">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isExecuting} className="text-white/50 hover:text-white hover:bg-white/10">
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => onConfirm(items)}
          disabled={items.length === 0 || isExecuting}
          className="bg-white text-black hover:bg-white/90 font-bold rounded-xl"
        >
          {isExecuting ? (
            <>
              <span className="relative flex h-3 w-3 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black/30 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-black/30" />
              </span>
              Building...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Build {items.length} item{items.length !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
