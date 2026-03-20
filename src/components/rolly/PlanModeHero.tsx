import { useState, useEffect, useRef } from "react";

const ROTATING_WORDS = ["TASKS", "BUDGETS", "TIMELINES", "MILESTONES", "SPLITS"];
const TYPEWRITER_TEXT = "PLAN\nMODE.";
const SUBTITLE = "Describe your project below. Rolly will ask a few questions, then build everything — so you can keep working.";

export function PlanModeHero() {
  const [charIndex, setCharIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Typewriter for heading
  useEffect(() => {
    if (charIndex >= TYPEWRITER_TEXT.length) return;
    const timeout = setTimeout(() => setCharIndex((c) => c + 1), 60);
    return () => clearTimeout(timeout);
  }, [charIndex]);

  // Rotating words
  useEffect(() => {
    const durations = { in: 400, hold: 1400, out: 400 };
    const timeout = setTimeout(() => {
      if (phase === "in") setPhase("hold");
      else if (phase === "hold") setPhase("out");
      else {
        setWordIndex((i) => (i + 1) % ROTATING_WORDS.length);
        setPhase("in");
      }
    }, durations[phase]);
    return () => clearTimeout(timeout);
  }, [phase, wordIndex]);

  const displayedHeading = TYPEWRITER_TEXT.slice(0, charIndex);
  const showCursor = charIndex < TYPEWRITER_TEXT.length;

  return (
    <div className="flex flex-col items-start justify-end h-full w-full pb-6 animate-fade-in">
      <div className="space-y-5 w-full">
        {/* Typewriter heading */}
        <h2
          className="text-[clamp(2.8rem,9vw,5rem)] font-black uppercase leading-[0.82] tracking-tighter text-white whitespace-pre-line"
          style={{ fontStretch: "condensed" }}
        >
          {displayedHeading}
          {showCursor && (
            <span className="inline-block w-[3px] h-[0.8em] bg-white ml-0.5 animate-pulse align-baseline" />
          )}
        </h2>

        {/* Subtitle */}
        <p className="text-sm text-white/60 max-w-[min(20rem,88vw)] leading-relaxed">
          {SUBTITLE}
        </p>

        {/* Rotating word */}
        <div className="h-8 overflow-hidden relative">
          <span
            key={wordIndex}
            className="absolute left-0 text-sm font-black uppercase tracking-[0.2em] text-white/80 transition-all duration-300 ease-out"
            style={{
              transform:
                phase === "in"
                  ? "translateY(0)"
                  : phase === "out"
                  ? "translateY(-100%)"
                  : "translateY(0)",
              opacity: phase === "out" ? 0 : 1,
            }}
          >
            {ROTATING_WORDS[wordIndex]}
          </span>
        </div>
      </div>
    </div>
  );
}
