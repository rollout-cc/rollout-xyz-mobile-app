import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTour } from "@/contexts/TourContext";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Prefer a target that is actually visible (non-zero layout box). */
function queryVisibleSelector(selector: string): Element | null {
  const nodes = document.querySelectorAll(selector);
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return el;
  }
  return null;
}

function getPlacement(
  targetRect: Rect,
  preferred: string | undefined
): "top" | "bottom" | "left" | "right" {
  if (preferred && preferred !== "auto") return preferred as any;
  const spaceBelow = window.innerHeight - targetRect.top - targetRect.height;
  const spaceAbove = targetRect.top;
  if (spaceBelow > 220) return "bottom";
  if (spaceAbove > 220) return "top";
  return targetRect.left > window.innerWidth / 2 ? "left" : "right";
}

export function TourOverlay() {
  const { currentStep, currentStepIndex, totalSteps, nextStep, prevStep, skipTour, activeTourId } = useTour();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  const measureTarget = useCallback(() => {
    if (!currentStep) {
      setTargetRect(null);
      return;
    }
    const el =
      queryVisibleSelector(currentStep.targetSelector) ??
      document.querySelector(currentStep.targetSelector);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
  }, [currentStep]);

  useEffect(() => {
    measureTarget();
    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);
    return () => {
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [measureTarget]);

  // Re-measure periodically in case of layout shifts
  useEffect(() => {
    if (!currentStep) return;
    const interval = setInterval(measureTarget, 300);
    return () => clearInterval(interval);
  }, [currentStep, measureTarget]);

  if (!activeTourId || !currentStep) return null;

  const padding = 8;

  const placement = targetRect ? getPlacement(targetRect, currentStep.placement) : "bottom";

  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    const maxWidth = 320;
    switch (placement) {
      case "bottom":
        return {
          top: targetRect.top + targetRect.height + padding + 12,
          left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - maxWidth / 2, window.innerWidth - maxWidth - 16)),
          maxWidth,
        };
      case "top":
        return {
          bottom: window.innerHeight - targetRect.top + padding + 12,
          left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - maxWidth / 2, window.innerWidth - maxWidth - 16)),
          maxWidth,
        };
      case "right":
        return {
          top: Math.max(16, targetRect.top + targetRect.height / 2 - 60),
          left: targetRect.left + targetRect.width + padding + 12,
          maxWidth,
        };
      case "left":
        return {
          top: Math.max(16, targetRect.top + targetRect.height / 2 - 60),
          right: window.innerWidth - targetRect.left + padding + 12,
          maxWidth,
        };
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        key={`tour-overlay-${activeTourId}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999]"
        style={{ pointerEvents: "auto" }}
      >
        {/* Backdrop with cutout */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
          <defs>
            <mask id="tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - padding}
                  y={targetRect.top - padding}
                  width={targetRect.width + padding * 2}
                  height={targetRect.height + padding * 2}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.5)"
            mask="url(#tour-mask)"
            style={{ pointerEvents: "auto" }}
            onClick={skipTour}
          />
        </svg>

        {/* Highlight ring */}
        {targetRect && (
          <div
            className="absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-transparent"
            style={{
              top: targetRect.top - padding,
              left: targetRect.left - padding,
              width: targetRect.width + padding * 2,
              height: targetRect.height + padding * 2,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          key={`step-${currentStepIndex}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="absolute bg-foreground text-background rounded-xl shadow-2xl p-4"
          style={{ ...getTooltipStyle(), zIndex: 10000 }}
        >
          <button
            onClick={skipTour}
            className="absolute top-2 right-2 p-1 rounded-md hover:bg-background/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <h3 className="font-semibold text-sm mb-1 pr-6">{currentStep.title}</h3>
          <p className="text-xs opacity-80 leading-relaxed mb-4">{currentStep.description}</p>

          <div className="flex items-center justify-between">
            <span className="text-[11px] opacity-50">
              {currentStepIndex + 1} of {totalSteps}
            </span>
            <div className="flex items-center gap-1.5">
              {currentStepIndex > 0 && (
                <button
                  onClick={prevStep}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md hover:bg-background/10 transition-colors"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Back
                </button>
              )}
              <button
                onClick={nextStep}
                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {currentStepIndex === totalSteps - 1 ? "Done" : "Next"}
                {currentStepIndex < totalSteps - 1 && <ChevronRight className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
