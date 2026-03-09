import ReactMarkdown from "react-markdown";
import type { RollyMessage as RollyMessageType } from "@/hooks/useRollyChat";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface Props {
  message: RollyMessageType;
  isStreaming?: boolean;
}

/**
 * During streaming we render plain text with a blinking cursor.
 * Once streaming ends we switch to full markdown rendering.
 * This avoids the "jumpy re-parse" feel of ReactMarkdown on every token.
 */
export function RollyMessage({ message, isStreaming }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3 animate-fade-in", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
          R
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : isStreaming ? (
          <StreamingText content={message.content} />
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-li:my-0.5 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

/** Renders streaming text with a visible cursor, word by word with a slight stagger */
function StreamingText({ content }: { content: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the parent when content grows
  useEffect(() => {
    const el = containerRef.current?.closest("[class*='overflow-y']");
    if (el) el.scrollTop = el.scrollHeight;
  }, [content]);

  return (
    <div ref={containerRef} className="whitespace-pre-wrap break-words">
      {content}
      <span className="inline-block h-4 w-[2px] bg-foreground/70 rounded-full ml-0.5 align-baseline animate-pulse" />
    </div>
  );
}
