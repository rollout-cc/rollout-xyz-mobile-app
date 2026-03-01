import { ReactNode } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { GripVertical, EyeOff, Star } from "lucide-react";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";

interface DraggableSectionProps {
  id: string;
  index: number;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  onHide: () => void;
  onSetHero?: () => void;
  children: ReactNode;
}

export function DraggableSection({
  id,
  index,
  title,
  isOpen,
  onToggle,
  onHide,
  onSetHero,
  children,
}: DraggableSectionProps) {
  return (
    <Draggable draggableId={id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`mb-4 break-inside-avoid ${snapshot.isDragging ? "z-50 opacity-90" : ""}`}
        >
          <CollapsibleSection
            title={title}
            open={isOpen}
            onToggle={onToggle}
            actions={
              <>
                {onSetHero && (
                  <button
                    onClick={onSetHero}
                    className="p-1 text-muted-foreground hover:text-amber-500 transition-colors"
                    aria-label="Set as hero widget"
                    title="Set as hero"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <div
                  {...provided.dragHandleProps}
                  className="touch-none p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing transition-colors"
                  aria-label="Drag to reorder"
                >
                  <GripVertical className="h-4 w-4" />
                </div>
                <button
                  onClick={onHide}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Hide section"
                >
                  <EyeOff className="h-4 w-4" />
                </button>
              </>
            }
          >
            {children}
          </CollapsibleSection>
        </div>
      )}
    </Draggable>
  );
}
