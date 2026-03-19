import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

const WORDS = ["Thinking", "Mapping", "Building", "Tuning", "Aligning", "Connecting", "Shaping"];

interface ThinkingAnimationProps {
  variant: "question" | "generating";
}

export function ThinkingAnimation({ variant }: ThinkingAnimationProps) {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((i) => (i + 1) % WORDS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      {/* Pulsing sparkle icon */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <Sparkles className="h-8 w-8 text-white/70" />
      </motion.div>

      {/* Rotating word */}
      <div className="h-8 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={wordIndex}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 text-center text-sm font-bold uppercase tracking-[0.2em] text-white/60"
          >
            {WORDS[wordIndex]}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Subtitle */}
      <p className="text-xs text-white/30">
        {variant === "generating"
          ? "Creating tasks, milestones & budgets"
          : "Preparing next question"}
      </p>
    </div>
  );
}
