import { ReactNode } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, EyeOff, Star } from "lucide-react";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";

interface DraggableSectionProps {
  id: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  onHide: () => void;
  onSetHero?: () => void;
  children: ReactNode;
}

export function DraggableSection({
  id,
  title,
  isOpen,
  onToggle,
  onHide,
  onSetHero,
  children,
}: DraggableSectionProps) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      className="list-none"
      layout="position"
      style={{ transform: "none" }}
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
            <button
              onPointerDown={(e) => controls.start(e)}
              className="touch-none p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing transition-colors"
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </button>
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
    </Reorder.Item>
  );
}
