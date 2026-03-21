import ReactMarkdown from "react-markdown";
import type { RollyMessage as RollyMessageType } from "@/hooks/useRollyChat";
import { getMessageText } from "@/hooks/useRollyChat";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  message: RollyMessageType;
  isStreaming?: boolean;
}

export function RollyMessage({ message, isStreaming }: Props) {
  const isUser = message.role === "user";
  const text = getMessageText(message.content);

  return (
    <div className={cn("flex gap-3 animate-fade-in", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
          R
        </div>
      )}
      <div
        className={cn(
          "rolly-conversation-text max-w-[80%] rounded-2xl px-4 py-2.5",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md font-medium"
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        {/* Image preview for user messages */}
        {isUser && message.imagePreview && (
          <img
            src={message.imagePreview}
            alt="Attached image"
            className="mb-2 max-h-48 w-auto rounded-lg object-cover"
          />
        )}
        {isUser ? (
          <p className="whitespace-pre-wrap">{text}</p>
        ) : (
          <TypewriterText content={text} isStreaming={!!isStreaming} />
        )}
      </div>
    </div>
  );
}

/**
 * Typewriter effect: characters are revealed one-by-one on a timer,
 * buffering ahead when tokens arrive faster than the reveal speed.
 * Once streaming ends & buffer is caught up, switches to markdown.
 */
function TypewriterText({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  const [revealed, setRevealed] = useState(0);
  const revealedRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const doneRef = useRef(false);

  // Speed: ms per character (lower = faster)
  const CHAR_DELAY = 4;

  const tick = useCallback((time: number) => {
    if (doneRef.current) return;

    const elapsed = time - lastTimeRef.current;
    if (elapsed >= CHAR_DELAY) {
      // Reveal multiple chars if we're behind
      const charsToReveal = Math.min(
        Math.floor(elapsed / CHAR_DELAY),
        3 // max 3 chars per frame to keep it smooth
      );
      revealedRef.current = Math.min(revealedRef.current + charsToReveal, content.length);
      setRevealed(revealedRef.current);
      lastTimeRef.current = time;
    }

    if (revealedRef.current < content.length) {
      rafRef.current = requestAnimationFrame(tick);
    } else if (!isStreaming) {
      // Fully caught up and streaming done
      doneRef.current = true;
    } else {
      // Caught up but still streaming — wait for more content
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [content.length, isStreaming]);

  useEffect(() => {
    if (!doneRef.current) {
      if (!rafRef.current) {
        lastTimeRef.current = performance.now();
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [tick, content]);

  // Once streaming is done and we've revealed everything, render markdown
  const fullyRevealed = revealed >= content.length && !isStreaming;

  if (fullyRevealed) {
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-li:my-0.5 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-p:leading-relaxed">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="whitespace-pre-wrap break-words">
      {content.slice(0, revealed)}
      <span className="inline-block h-[1em] min-h-[1rem] w-[2px] bg-foreground/70 rounded-full ml-0.5 align-baseline animate-pulse" />
    </div>
  );
}
